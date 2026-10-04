import { expect, it, vi } from "vitest"
import sitemap from "./sitemap"

vi.mock("@/shared/infra/supabase-public", () => ({ createSupabasePublicClient: () => ({}) }))
vi.mock("@/features/discovery/data/public-assets", () => ({
	fetchAllPublicDiscoveryItems: () => Promise.reject(new Error("temporary DB failure")),
}))

it("공개 자산 조회 실패로 정상 sitemap을 홈 한 개 목록으로 덮지 않는다", async () => {
	const log = vi.spyOn(console, "error").mockImplementation(() => {})
	try {
		await expect(sitemap()).rejects.toThrow("temporary DB failure")
	} finally {
		log.mockRestore()
	}
})
