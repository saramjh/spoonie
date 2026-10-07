import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import redirect from "../../../../netlify/edge-functions/profile-redirect.js"

const uuid = "8f5c5a40-17e5-424a-9da6-656a852e762d"
const fetchMock = vi.fn()
const next = vi.fn(async () => new Response("compatibility page", {
	status: 200, headers: { "Cache-Control": "public, s-maxage=600" },
}))
const request = (path = `/profile/${uuid}`, method = "GET") => new Request(`https://spoonie.kr${path}`, { method })

beforeEach(() => {
	vi.stubGlobal("Netlify", { env: { get: (key: string) => key.endsWith("URL") ? "https://example.supabase.co" : "public-anon-key" } })
	vi.stubGlobal("fetch", fetchMock)
	fetchMock.mockResolvedValue(new Response(JSON.stringify([{ public_id: "6a7e51f9" }])))
	next.mockClear()
})
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks() })

describe("UUID profile CDN redirect", () => {
	it("matches only exact UUID profile paths in the deployed configuration", () => {
		const toml = readFileSync("netlify.toml", "utf8")
		const declaration = toml.split("[[edge_functions]]")[1].split("[[headers]]")[0]
		const pattern = new RegExp(JSON.parse(declaration.match(/pattern = (".*")/)![1]))
		expect(declaration).toContain('cache = "manual"')
		expect(declaration).toContain('function = "profile-redirect"')
		for (const path of [`/profile/${uuid}`, `/profile/${uuid.toUpperCase()}/`]) expect(pattern.test(path)).toBe(true)
		for (const path of ["/profile/6a7e51f9", `/profile/${uuid}/edit`, `/recipe/${uuid}`, `/post/${uuid}`, "/", "/profile/not-a-uuid"]) expect(pattern.test(path)).toBe(false)
	})
	it("returns one bodyless 308 using just the anonymous identity lookup", async () => {
		const response = await redirect(request(), { next })
		expect(response?.status).toBe(308)
		expect(response?.headers.get("Location")).toBe("/profile/6a7e51f9")
		expect(await response?.text()).toBe("")
		expect(response?.headers.get("Netlify-CDN-Cache-Control")).toBe("public, s-maxage=600")
		expect(response?.headers.get("Netlify-Vary")).toBe("query")
		expect(response?.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate")
		expect(response?.headers.has("Set-Cookie")).toBe(false)
		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [lookup, options] = fetchMock.mock.calls[0]
		expect(lookup.pathname).toBe("/rest/v1/profiles")
		expect(Object.fromEntries(lookup.searchParams)).toEqual({ select: "public_id", id: `eq.${uuid}` })
		expect(options.headers).toEqual({ apikey: "public-anon-key", Authorization: "Bearer public-anon-key" })
		expect(options.signal).toBeInstanceOf(AbortSignal)
		expect(next).not.toHaveBeenCalled()
	})
	it("normalizes uppercase UUID and preserves query parameters", async () => {
		const response = await redirect(request(`/profile/${uuid.toUpperCase()}/?from=feed&_rsc=abc`), { next })
		expect(response?.headers.get("Location")).toBe("/profile/6a7e51f9?from=feed&_rsc=abc")
		expect(fetchMock.mock.calls[0][0].searchParams.get("id")).toBe(`eq.${uuid}`)
	})

	it("declares query variation regardless of which URL fills the cache first", async () => {
		fetchMock.mockImplementation(async () => new Response(JSON.stringify([{ public_id: "6a7e51f9" }])))
		for (const query of ["?audit=first", "", "?audit=second", ""]) {
			const response = await redirect(request(`/profile/${uuid}${query}`), { next })
			expect(response?.headers.get("Location")).toBe(`/profile/6a7e51f9${query}`)
			expect(response?.headers.get("Netlify-Vary")).toBe("query")
		}
	})
	it("handles HEAD without rendering the profile", async () => {
		expect((await redirect(request(undefined, "HEAD"), { next }))?.status).toBe(308)
		expect(next).not.toHaveBeenCalled()
	})
	it.each(["/profile/6a7e51f9", `/profile/${uuid}/edit`, `/recipe/${uuid}`, `/post/${uuid}`])("never looks up an unrelated path: %s", async path => {
		expect(await redirect(request(path), { next })).toBeUndefined()
		expect(fetchMock).not.toHaveBeenCalled()
		expect(next).not.toHaveBeenCalled()
	})
	it("lets mutations pass through", async () => {
		expect(await redirect(request(undefined, "POST"), { next })).toBeUndefined()
		expect(fetchMock).not.toHaveBeenCalled()
	})
	it.each([[], [{ public_id: null }], [{ public_id: "" }], [{ public_id: uuid }], [{ public_id: "//evil.example" }], [{ public_id: "one" }, { public_id: "two" }]].map(rows => ({ rows })))("keeps unresolved identity out of CDN cache: $rows", async ({ rows }) => {
		fetchMock.mockResolvedValue(new Response(JSON.stringify(rows)))
		const response = await redirect(request(), { next })
		expect(response?.status).toBe(200)
		expect(await response?.text()).toBe("compatibility page")
		expect(response?.headers.get("Netlify-CDN-Cache-Control")).toBe("no-store")
		expect(response?.headers.get("Cache-Control")).toBe("private, no-store")
		expect(response?.headers.get("Netlify-Vary")).toBe("query")
	})
	it.each([new Response(null, { status: 503 }), new Response("invalid json")])("falls back without caching DB errors", async result => {
		fetchMock.mockResolvedValue(result)
		const response = await redirect(request(), { next })
		expect(response?.headers.get("Netlify-CDN-Cache-Control")).toBe("no-store")
		expect(next).toHaveBeenCalledTimes(1)
	})
	it("falls back on network failure", async () => {
		fetchMock.mockRejectedValue(new Error("connection failed"))
		expect((await redirect(request(), { next }))?.status).toBe(200)
	})
	it("falls back without DB access when runtime env is missing", async () => {
		vi.stubGlobal("Netlify", { env: { get: () => undefined } })
		expect((await redirect(request(), { next }))?.headers.get("Netlify-CDN-Cache-Control")).toBe("no-store")
		expect(fetchMock).not.toHaveBeenCalled()
	})
})
