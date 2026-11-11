import { describe, expect, it, vi } from "vitest"
import { searchCitableRecipes, CITABLE_PAGE_SIZE } from "./recipe-repository"

const item = {
  id: "recipe-id", title: "감자전", created_at: "2026-10-10T00:00:00Z",
  item_type: "recipe", is_public: false, image_urls: ["image.jpg"],
  user_id: "author-id", username: "부엌", public_id: "chef", avatar_url: null,
}

function clientFor(rows: unknown = [item], error: Error | null = null) {
  const abortSignal = vi.fn().mockResolvedValue({ data: rows, error })
  const rpc = vi.fn(() => ({ abortSignal }))
  return {
    client: { rpc } as unknown as Parameters<typeof searchCitableRecipes>[0],
    rpc, abortSignal,
  }
}

describe("searchCitableRecipes", () => {
  it("retains the recipe identity, author and RLS-visible private status", async () => {
    const { client, rpc, abortSignal } = clientFor()
    const signal = new AbortController().signal
    const rows = await searchCitableRecipes(client, "감자전", signal, 20)
    expect(rows.map(row => [row.id, row.title, row.username, row.user_public_id, row.is_public])).toEqual([
      ["recipe-id", "감자전", "부엌", "chef", false],
    ])
    expect(rpc).toHaveBeenCalledWith("search_citable_recipes", {
      search_term: "감자전", max_results: CITABLE_PAGE_SIZE + 1, result_offset: 20,
    })
    expect(abortSignal).toHaveBeenCalledWith(signal)
  })

  it("preserves duplicate titles with different recipe IDs", async () => {
    const { client } = clientFor([{ ...item, id: "a" }, { ...item, id: "b" }])
    const rows = await searchCitableRecipes(client, "감자전", new AbortController().signal)
    expect(rows.map(row => row.id)).toEqual(["a", "b"])
  })

  it("returns an empty list and surfaces lookup errors", async () => {
    const signal = new AbortController().signal
    expect(await searchCitableRecipes(clientFor([]).client, "감자", signal)).toEqual([])
    await expect(searchCitableRecipes(clientFor(null, new Error("offline")).client, "감자", signal)).rejects.toThrow("offline")
  })
})
