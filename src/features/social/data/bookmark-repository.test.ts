import { beforeEach, describe, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({
  rows: [] as Array<{ items: Record<string, unknown> }>,
  stats: [] as Array<{ id: string; likes_count: number; comments_count: number; is_liked: boolean }>,
  errors: {} as Record<string, Error>,
  tables: [] as string[],
}))
vi.mock("@/shared/infra/supabase-client", () => ({
  createSupabaseBrowserClient: () => ({
    from(name: string) {
      mock.tables.push(name)
      return {
        select() {
          return {
            eq() {
              return {
                order: async () => ({ data: mock.rows, error: mock.errors.bookmarks ?? null }),
                in: async () => ({ data: [], error: mock.errors.likes ?? null }),
              }
            },
            in: async () => ({ data: mock.stats, error: mock.errors.optimized_feed_view ?? null }),
          }
        },
      }
    },
  }),
}))
import { fetchBookmarks } from "./bookmark-repository"

const record = (id: string, isPublic: boolean) => ({
  items: {
    id, user_id: "chef", item_type: "recipe", is_public: isPublic,
    title: "Recipe " + id, created_at: "2026-10-10T00:00:00Z",
    image_urls: ["https://example.test/meal.jpg"],
    profiles: { id: "chef", username: "chef", public_id: "chef" },
  },
})

beforeEach(() => {
  mock.tables.length = 0
  mock.rows = []
  mock.stats = []
  mock.errors = {}
})

describe("fetchBookmarks", () => {
  it("returns real public likes/comments and preserves the bookmarked identity", async () => {
    mock.rows = [record("a", true), record("b", true)]
    mock.stats = [
      { id: "a", likes_count: 2, comments_count: 10, is_liked: true },
      { id: "b", likes_count: 1, comments_count: 0, is_liked: false },
    ]
    const rows = await fetchBookmarks("u")
    expect(rows.map(r => [r.id, r.likes_count, r.comments_count, r.is_liked, r.is_bookmarked])).toEqual([
      ["a", 2, 10, true, true],
      ["b", 1, 0, false, true],
    ])
    expect(mock.tables).toContain("optimized_feed_view")
    expect(mock.tables).not.toContain("likes")
  })

  it("retains access to private bookmarks without trying to obtain them from the public view", async () => {
    mock.rows = [record("private", false)]
    const rows = await fetchBookmarks("u")
    expect(rows[0]?.id).toBe("private")
    expect(rows[0]?.is_public).toBe(false)
    expect(mock.tables).not.toContain("optimized_feed_view")
    expect(mock.tables).toContain("likes")
  })

  it("does not turn an unavailable public count into a fabricated zero", async () => {
    mock.rows = [record("a", true)]
    await expect(fetchBookmarks("u")).rejects.toThrow("반응 집계")
  })

  it("surfaces public view errors to the existing SWR retry UI", async () => {
    mock.rows = [record("a", true)]
    mock.errors.optimized_feed_view = new Error("policy error")
    await expect(fetchBookmarks("u")).rejects.toThrow("policy error")
  })
})
