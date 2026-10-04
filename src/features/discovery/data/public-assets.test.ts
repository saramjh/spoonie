import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchAllPublicDiscoveryItems } from "./public-assets"

function publicClient(rows: { id: string }[], responseLimit = 500, failAt?: number) {
	const ranges: number[] = []
	const orders: string[] = []
	const filters: unknown[][] = []
	const from = vi.fn(() => {
		let start = 0
		let end = 0
		const query = {
			select: vi.fn(() => query),
			eq: vi.fn((...args: unknown[]) => { filters.push(args); return query }),
			contains: vi.fn((...args: unknown[]) => { filters.push(args); return query }),
			order: vi.fn((column: string) => { orders.push(column); return query }),
			range: vi.fn((fromIndex: number, toIndex: number) => {
				start = fromIndex
				end = toIndex
				ranges.push(start)
				return query
			}),
			then: (resolve: (result: unknown) => unknown) => Promise.resolve(failAt === start
				? { data: null, error: new Error("DB unavailable") }
				: { data: rows.slice(start, Math.min(end + 1, start + responseLimit)), error: null }).then(resolve),
		}
		return query
	})
	return { client: { from } as unknown as SupabaseClient, ranges, orders, filters }
}

const rows = (count: number) => Array.from({ length: count }, (_, index) => ({ id: String(index) }))

describe("full public discovery inventory", () => {
	it("1000개를 넘어선 오래된 자산까지 누락 없이 읽는다", async () => {
		const expected = rows(1203)
		const mock = publicClient(expected)
		expect(await fetchAllPublicDiscoveryItems({}, mock.client)).toEqual(expected)
		expect(mock.ranges).toEqual([0, 500, 1000, 1203])
		expect(mock.orders.slice(0, 2)).toEqual(["created_at", "id"])
		expect(mock.filters).toContainEqual(["is_public", true])
	})
	it("DB 응답 상한이 요청보다 작아도 조기 종료하거나 행을 건너뛰지 않는다", async () => {
		const expected = rows(211)
		const mock = publicClient(expected, 100)
		expect(await fetchAllPublicDiscoveryItems({ itemType: "post", tag: "상추", userId: "author" }, mock.client)).toEqual(expected)
		expect(mock.ranges).toEqual([0, 100, 200, 211])
		expect(mock.filters).toContainEqual(["item_type", "post"])
		expect(mock.filters).toContainEqual(["tags", ["상추"]])
		expect(mock.filters).toContainEqual(["user_id", "author"])
	})
	it("중간 조회 실패를 완성된 부분 목록으로 반환하지 않는다", async () => {
		const mock = publicClient(rows(700), 500, 500)
		await expect(fetchAllPublicDiscoveryItems({}, mock.client)).rejects.toThrow("DB unavailable")
	})
})
