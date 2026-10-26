import { afterEach, expect, it, vi } from "vitest"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { logEvent } from "./events"

vi.mock("@/shared/infra/supabase-client", () => ({
	createSupabaseBrowserClient: vi.fn(),
}))

afterEach(() => {
	vi.unstubAllGlobals()
	vi.clearAllMocks()
})

it("counts a compose creator-guide click via the existing GA4 client without touching Supabase", async () => {
	const event = vi.fn()
	vi.stubGlobal("window", { gtag: event })
	await logEvent("creator_guide_click", null, "compose_drawer")
	expect(event).toHaveBeenCalledTimes(1)
	expect(event).toHaveBeenCalledWith("event", "creator_guide_click", {
		item_id: undefined,
		origin: "compose_drawer",
	})
	expect(createSupabaseBrowserClient).not.toHaveBeenCalled()
})

it("does not block navigation when GA4 is absent", async () => {
	vi.stubGlobal("window", {})
	await expect(logEvent("creator_guide_click", null, "compose_drawer")).resolves.toBeUndefined()
	expect(createSupabaseBrowserClient).not.toHaveBeenCalled()
})
