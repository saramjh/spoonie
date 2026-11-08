import { beforeEach, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }))
vi.mock("@/shared/infra/supabase-client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { getUser: mock.getUser }, rpc: mock.rpc }),
}))

import { optimizedSearch } from "./search-optimization"

beforeEach(() => {
  optimizedSearch.clearCache()
  mock.getUser.mockReset().mockResolvedValue({ data: { user: null }, error: null })
  mock.rpc.mockReset()
})

it("shows a retryable error rather than claiming failed searches returned zero results", async () => {
  mock.rpc.mockResolvedValue({ data: null, error: { message: "search RPC unavailable" } })
  await expect(optimizedSearch.search("토마토 network-test")).rejects.toMatchObject({
    message: "search RPC unavailable",
  })
})

it("preserves real empty results without an error", async () => {
  mock.rpc.mockResolvedValue({ data: [], error: null })
  await expect(optimizedSearch.search("토마토 empty-test")).resolves.toEqual([])
})
