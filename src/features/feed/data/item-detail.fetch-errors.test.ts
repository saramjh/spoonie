import { describe, expect, it, vi, afterEach } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchItemDetail } from "./item-detail"

const itemId = "7a267c1d-b768-4694-bf9d-2b54d0a3e0a4"

function mockDetailDb(failTable?: "ingredients" | "instructions" | "likes" | "comments", kind: "recipe" | "post" = "recipe"): SupabaseClient {
  const values: Record<string, { data: unknown; error: null | { message: string }; count?: number }> = {
    items: { data: {
      id: itemId, item_type: kind, user_id: "author", is_public: true,
      author: { username: "요리사", display_name: "요리사", public_id: "chef", avatar_url: null },
    }, error: null },
    ingredients: { data: [{ name: "재료", amount: 1, unit: "개", order_index: 1 }], error: null },
    instructions: { data: [{ description: "조리법", step_number: 1 }], error: null },
    likes: { data: [], count: 0, error: null },
    comments: { data: [], error: null },
  }
  if (failTable) values[failTable] = { data: null, error: { message: failTable + " database lookup failed" } }
  return {
    from(table: string) {
      const value = values[table]
      if (!value) throw Error("Unexpected query: " + table)
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        single: () => Promise.resolve(value),
        maybeSingle: () => Promise.resolve(value),
        then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
          Promise.resolve(value).then(onFulfilled, onRejected),
      }
      return chain
    },
  } as unknown as SupabaseClient
}

afterEach(() => vi.restoreAllMocks())

describe("Recipe essential data retrieval", () => {
  it("renders real ingredients and instructions when both reads succeed", async () => {
    const item = await fetchItemDetail(mockDetailDb(), itemId, { withViewer: false })
    expect(item.ingredients).toHaveLength(1)
    expect(item.instructions).toHaveLength(1)
  })

  it("does not require recipe-only data for Recipeed posts", async () => {
    const item = await fetchItemDetail(mockDetailDb("ingredients", "post"), itemId, { withViewer: false })
    expect(item.item_type).toBe("post")
    expect(item.ingredients).toEqual([])
  })

  for (const table of ["ingredients", "instructions"] as const) {
    it("does not misrepresent a failed "+table+" read as an empty recipe", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {})
      await expect(fetchItemDetail(mockDetailDb(table), itemId, { withViewer: false }))
        .rejects.toMatchObject({ message: table + " database lookup failed" })
    })
  }
})
