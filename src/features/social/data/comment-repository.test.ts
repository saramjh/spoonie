import { beforeEach, describe, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({
  calls: [] as Array<[string, unknown, unknown?]>,
  rows: [] as unknown[],
  readError: null as Error | null,
  writeError: null as Error | null,
}))
vi.mock("@/shared/infra/supabase-client", () => ({
  createSupabaseBrowserClient: () => ({
    from(table: string) {
      mock.calls.push(["from", table])
      return {
        select(value: string) {
          mock.calls.push(["select", value])
          return {
            eq(field: string, id: string) {
              mock.calls.push(["eq", field, id])
              return {
                async order(field: string, options: { ascending: boolean }) {
                  mock.calls.push(["order", field, options])
                  return { data: mock.rows, error: mock.readError }
                },
              }
            },
          }
        },
        async insert(values: Record<string, unknown>) {
          mock.calls.push(["insert", values])
          return { error: mock.writeError }
        },
        update(values: Record<string, unknown>) {
          mock.calls.push(["update", values])
          return {
            eq(field: string, id: string) {
              mock.calls.push(["eq", field, id])
              return {
                async eq(field2: string, user: string) {
                  mock.calls.push(["eq", field2, user])
                  return { error: mock.writeError }
                },
              }
            },
          }
        },
      }
    },
  }),
}))
import { addComment, fetchComments, softDeleteComment } from "./comment-repository"

beforeEach(() => {
  mock.calls = []
  mock.rows = []
  mock.readError = null
  mock.writeError = null
})

describe("comment repository", () => {
  it("fetches comments in ascending chronological order and maps joined profile arrays", async () => {
    mock.rows = [{
      id: "comment1", content: "안녕하세요", created_at: "2026-10-10T00:00:00Z",
      user_id: "chef", parent_comment_id: null, is_deleted: false,
      user: [{ username: "집밥", display_name: "집밥 선생", public_id: "chef-public", avatar_url: null }],
    }]
    const rows = await fetchComments("recipe1")
    expect(rows.map(r => [r.id, r.user.id, r.user.public_id, r.user.username, r.is_deleted])).toEqual([
      ["comment1", "chef", "chef-public", "집밥", false],
    ])
    expect(mock.calls).toContainEqual(["eq", "item_id", "recipe1"])
    expect(mock.calls).toContainEqual(["order", "created_at", { ascending: true }])
    expect(mock.calls.find(c => c[0] === "select")?.[1]).toContain("parent_comment_id")
    expect(mock.calls.find(c => c[0] === "select")?.[1]).toContain("user:profiles!user_id")
  })

  it("preserves deleted comment rows and rejects read errors instead of falsifying an empty list", async () => {
    mock.rows = [{ id: "deleted", is_deleted: true, user_id: "u", parent_comment_id: null, user: null }]
    expect((await fetchComments("recipe1"))[0]?.is_deleted).toBe(true)
    mock.readError = new Error("RLS read failure")
    await expect(fetchComments("recipe1")).rejects.toThrow("RLS read failure")
  })

  it("keeps top-level and reply writes distinct without changing the database payload", async () => {
    await addComment("item", "chef", "첫 댓글", null)
    await addComment("item", "chef", "답글", "parent1")
    expect(mock.calls.filter(c => c[0] === "insert").map(c => c[1])).toEqual([
      { item_id: "item", user_id: "chef", content: "첫 댓글", parent_comment_id: null },
      { item_id: "item", user_id: "chef", content: "답글", parent_comment_id: "parent1" },
    ])
  })

  it("soft deletes only the specified user's comment and propagates write failures", async () => {
    await softDeleteComment("comment1", "chef")
    expect(mock.calls).toContainEqual(["update", { is_deleted: true }])
    expect(mock.calls).toContainEqual(["eq", "id", "comment1"])
    expect(mock.calls).toContainEqual(["eq", "user_id", "chef"])
    mock.writeError = new Error("RLS write failure")
    await expect(softDeleteComment("comment1", "chef")).rejects.toThrow("RLS write failure")
    await expect(addComment("item", "chef", "reply", null)).rejects.toThrow("RLS write failure")
  })
})
