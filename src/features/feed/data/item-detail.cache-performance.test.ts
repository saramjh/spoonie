import { describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchItemDetail } from "./item-detail"

const itemId = "7a267c1d-b768-4694-bf9d-2b54d0a3e0a4"

function fakeDetailDb(viewerId: string | null) {
  const calls: Array<{ table: string; column: string; options?: unknown; filters: Array<[string, unknown]> }> = []
  const db = {
    auth: { getUser: async () => ({ data: { user: viewerId ? { id: viewerId } : null } }) },
    from(table: string) {
      const entry = { table, column: "", options: undefined as unknown, filters: [] as Array<[string, unknown]> }
      calls.push(entry)
      const result = () => {
        if (table === "items") return { data: { id: itemId, item_type: "post", user_id: "author", author: null }, error: null }
        if (table === "likes") {
          if (entry.filters.some(([column]) => column === "user_id")) return { data: { user_id: viewerId }, error: null }
          return { data: null, count: 42, error: null }
        }
        if (table === "comments") return { data: null, count: 3, error: null }
        if (table === "bookmarks") return { data: { item_id: itemId }, error: null }
        return { data: [], error: null }
      }
      const chain = {
        select(column: string, options?: unknown) { entry.column = column; entry.options = options; return chain },
        eq(column: string, value: unknown) { entry.filters.push([column, value]); return chain },
        order() { return chain },
        single: async () => result(),
        maybeSingle: async () => result(),
        then(resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) {
          return Promise.resolve(result()).then(resolve, reject)
        },
      }
      return chain
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

describe("detail fetch uses count-only RLS reads instead of duplicate list payloads", () => {
  it("returns exact counters for guests without returning the comment list or user IDs", async () => {
    const { db, calls } = fakeDetailDb(null)
    const item = await fetchItemDetail(db, itemId, { withViewer: false })
    expect(item.likes_count).toBe(42)
    expect(item.comments_count).toBe(3)
    expect(item.comments_data).toBeUndefined()
    expect(item.comments).toBeUndefined()
    expect(item.is_liked).toBe(false)
    expect(item.is_bookmarked).toBe(false)
    expect(calls.filter(call => call.table === "likes")).toHaveLength(1)
    expect(calls.find(call => call.table === "likes")?.options).toEqual({ count: "exact", head: true })
    expect(calls.find(call => call.table === "comments")).toMatchObject({
      column: "id", options: { count: "exact", head: true }, filters: [["item_id", itemId], ["is_deleted", false]],
    })
    expect(calls.some(call => call.table === "bookmarks")).toBe(false)
  })

  it("reads only current viewer like and bookmark records in parallel", async () => {
    const { db, calls } = fakeDetailDb("viewer-a")
    const item = await fetchItemDetail(db, itemId)
    expect(item.likes_count).toBe(42)
    expect(item.comments_count).toBe(3)
    expect(item.is_liked).toBe(true)
    expect(item.is_bookmarked).toBe(true)
    const likeQueries = calls.filter(call => call.table === "likes")
    expect(likeQueries).toHaveLength(2)
    expect(likeQueries[1].filters).toEqual([["item_id", itemId], ["user_id", "viewer-a"]])
    expect(calls.find(call => call.table === "bookmarks")?.filters).toEqual([["item_id", itemId], ["user_id", "viewer-a"]])
  })
})
