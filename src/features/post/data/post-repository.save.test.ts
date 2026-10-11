import { describe, expect, it } from "vitest"
import { savePostRow } from "./post-repository"

describe("post database rejection provenance", () => {
  it("preserves a SQLSTATE returned for a failed INSERT", async () => {
    const error = { code: "42501", message: "row-level security rejected" }
    const supabase = {
      from() {
        return {
          insert() {
            return { select() { return { async single() { return { data: null, error } } } } }
          },
        }
      },
    } as unknown as Parameters<typeof savePostRow>[0]
    await expect(savePostRow(supabase, { existingId: null, itemPayload: {} }))
      .rejects.toMatchObject({ cause: error })
  })
})

describe("post cover index is committed together with ordered image URLs", () => {
  it("updates an existing post through the database boundary", async () => {
    const updates: object[] = []
    const existingId = "posted-before-edit"
    const imageUrls = ["https://cdn.example/one.jpg", "https://cdn.example/two.jpg"]
    const payload = { image_urls: imageUrls, thumbnail_index: 1 }
    const response = { async single() { return { data: { id: existingId }, error: null } } }
    const query = { select() { return response } }
    const supabase = {
      from(table: string) {
        expect(table).toBe("items")
        return {
          update(next: object) {
            updates.push(next)
            return {
              eq(column: string, id: string) {
                expect(column).toBe("id")
                expect(id).toBe(existingId)
                return query
              },
            }
          },
        }
      },
    } as unknown as Parameters<typeof savePostRow>[0]
    await expect(savePostRow(supabase, { existingId, itemPayload: payload })).resolves.toEqual({ itemId: existingId })
    expect(updates).toEqual([payload])
  })
})
