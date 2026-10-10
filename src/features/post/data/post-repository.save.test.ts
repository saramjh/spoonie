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
