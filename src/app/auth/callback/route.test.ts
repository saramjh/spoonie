import { expect, it, vi } from "vitest"
import { GET } from "./route"

const { exchangeCodeForSession } = vi.hoisted(() => ({
	exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock("@/shared/infra/supabase-server", () => ({
	createSupabaseRouteHandlerClient: async () => ({
		auth: {
			exchangeCodeForSession,
			getUser: async () => ({ data: { user: { id: "existing-user" } }, error: null }),
		},
		from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: "existing-user" }, error: null }) }) }) }),
	}),
}))

const callback = "https://preview.example.com/auth/callback"

it("keeps the browser on the OAuth callback origin and preserves the requested page", async () => {
	const response = await GET(new Request(`${callback}?code=example&next=%2Frecipes%2Fnew&entry=partner_creator`))
	expect(exchangeCodeForSession).toHaveBeenCalledWith("example")
	expect(response.status).toBe(307)
	expect(response.headers.get("location")).toBe("/recipes/new?entry=partner_creator")
})

it("keeps callback failures on the same origin", async () => {
	const response = await GET(new Request(callback))
	expect(response.headers.get("location")).toBe("/auth/auth-code-error")
})

it("rejects a destination that normalizes to an external redirect", async () => {
	const response = await GET(new Request(`${callback}?code=example&next=%2Fone%2F..%2F%2Fevil.example`))
	expect(response.headers.get("location")).toBe("/")
})
