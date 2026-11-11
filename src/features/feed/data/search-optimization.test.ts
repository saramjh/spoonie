import { beforeEach, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }))
vi.mock("@/shared/infra/supabase-client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { getUser: mock.getUser }, rpc: mock.rpc }),
}))

import { fetchPopularKeywords, searchItems } from "./search-optimization"

beforeEach(() => {
  mock.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null })
  mock.rpc.mockReset()
})

it("reports failed searches instead of silently returning empty results", async () => {
  mock.rpc.mockResolvedValue({ data: null, error: { message: "search RPC unavailable" } })
  await expect(searchItems("토마토 network-test")).rejects.toMatchObject({
    message: "search RPC unavailable",
  })
})

it("preserves real empty results without an error", async () => {
  mock.rpc.mockResolvedValue({ data: [], error: null })
  await expect(searchItems("토마토 empty-test")).resolves.toEqual([])
})

it("reads search results for the current user without retaining a second global cache", async () => {
  mock.rpc.mockResolvedValue({ data: [{ id: "sample" }], error: null })
  mock.getUser.mockResolvedValueOnce({ data: { user: { id: "first-user" } } })
    .mockResolvedValueOnce({ data: { user: { id: "second-user" } } })

  await searchItems("토마토")
  await searchItems("토마토")

  expect(mock.rpc).toHaveBeenCalledTimes(2)
  expect(mock.rpc).toHaveBeenNthCalledWith(1, "search_items_optimized", {
    search_term: "토마토", max_results: 20, current_user_id: "first-user",
  })
  expect(mock.rpc).toHaveBeenNthCalledWith(2, "search_items_optimized", {
    search_term: "토마토", max_results: 20, current_user_id: "second-user",
  })
})

it("lets SWR retain the last popular keywords instead of hiding fetch errors in another cache", async () => {
  mock.rpc.mockResolvedValueOnce({ data: [{ keyword: "김치", count: 3 }], error: null })
  expect(await fetchPopularKeywords()).toEqual([{ keyword: "김치", count: 3 }])
  mock.rpc.mockResolvedValueOnce({ data: null, error: { message: "offline" } })
  await expect(fetchPopularKeywords()).rejects.toMatchObject({ message: "offline" })
})
