import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { rememberPath, cameFrom } from "@/shared/lib/surface"
import { useNavigation } from "./useNavigation"

const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock("next/navigation", () => ({
	usePathname: () => "/search",
	useRouter: () => ({ push, replace }),
}))

function navigation() {
	let result!: ReturnType<typeof useNavigation>
	renderToString(createElement(function Probe() {
		result = useNavigation()
		return null
	}))
	return result
}

beforeEach(() => {
	const storage = new Map<string, string>()
	vi.stubGlobal("sessionStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) })
	vi.stubGlobal("window", { location: { pathname: "/recipes/1a580b04-0a00-41b7-a20a-a5c7faeda810/edit", search: "" }, dispatchEvent: vi.fn() })
	vi.clearAllMocks()
})
afterEach(() => vi.unstubAllGlobals())

describe("canonical public navigation", () => {
	it.each(["/recipes/1a580b04-0a00-41b7-a20a-a5c7faeda810", "/posts/3a740af5-9baa-48a8-8276-8e5859f49bf5", "/profile/publicid", "/profile/publicid/"])("server-renders a clean crawlable href: %s", path => {
		const html = renderToString(createElement(function Probe() {
			const { createLinkWithOrigin } = useNavigation()
			return createElement("a", { href: createLinkWithOrigin(path) }, "detail")
		}))
		expect(html).toBe(`<a href="${path}">detail</a>`)
	})
	it("preserves caller-supplied campaign parameters and fragments", () => {
		const path = "/recipes/1a580b04-0a00-41b7-a20a-a5c7faeda810?utm_source=creator#ingredients"
		expect(navigation().createLinkWithOrigin(path)).toBe(path)
	})
	it.each(["/recipes/1a580b04-0a00-41b7-a20a-a5c7faeda810/edit", "/posts/3a740af5-9baa-48a8-8276-8e5859f49bf5/edit", "/profile/publicid/edit"])("keeps edit return information: %s", path => {
		expect(navigation().createLinkWithOrigin(path, "/profile/publicid")).toBe(`${path}?from=%2Fprofile%2Fpublicid`)
	})
	it("keeps creation-page return information", () => {
		expect(navigation().createLinkWithOrigin("/recipes/new")).toBe("/recipes/new?from=%2Fsearch")
	})
	it("keeps existing edit query parameters", () => {
		expect(navigation().createLinkWithOrigin("/recipes/1a580b04-0a00-41b7-a20a-a5c7faeda810/edit?draft=1")).toBe("/recipes/1a580b04-0a00-41b7-a20a-a5c7faeda810/edit?draft=1&from=%2Fsearch")
	})
	it("returns to the legacy explicit origin after editing", () => {
		window.location.search = "?from=%2Fprofile%2Fpublicid"
		navigation().navigateBack()
		expect(push).toHaveBeenCalledWith("/profile/publicid", undefined)
	})
	it("uses the existing client trail when no from parameter exists", () => {
		rememberPath("/search")
		rememberPath("/recipes/1a580b04-0a00-41b7-a20a-a5c7faeda810/edit")
		navigation().navigateBack(undefined, { replace: true })
		expect(replace).toHaveBeenCalledWith("/search", undefined)
	})
	it("keeps detail analytics origin in the existing client trail", () => {
		rememberPath("/search")
		rememberPath("/recipes/1a580b04-0a00-41b7-a20a-a5c7faeda810")
		expect(cameFrom("/recipes/1a580b04-0a00-41b7-a20a-a5c7faeda810")).toEqual({ surface: "search", itemId: null })
	})
})
