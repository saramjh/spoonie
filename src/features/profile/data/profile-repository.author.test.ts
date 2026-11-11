import { describe, expect, it, vi } from "vitest"
import { fetchItemAuthorFields } from "./profile-repository"
import type { SupabaseClient } from "@supabase/supabase-js"

function client(profile: unknown, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data: profile, error })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { db: { from } as unknown as SupabaseClient, from, select, eq, single }
}

describe("public author metadata for optimistic feed", () => {
  it("uses the canonical public display name, not an email or JWT-derived handle", async () => {
    const { db, from, select, eq } = client({
      id: "user-123", username: "매콤토리", display_name: "토리의 식탁",
      public_id: "tori-kitchen", avatar_url: "/avatars/tori.png",
    })
    expect(await fetchItemAuthorFields(db, "user-123")).toEqual({
      display_name: "토리의 식탁",
      username: "매콤토리",
      avatar_url: "/avatars/tori.png",
      user_public_id: "tori-kitchen",
      author: {
        id: "user-123", public_id: "tori-kitchen", username: "매콤토리",
        display_name: "토리의 식탁", avatar_url: "/avatars/tori.png",
      },
    })
    expect(from).toHaveBeenCalledWith("profiles")
    expect(select).toHaveBeenCalledWith("id, username, display_name, avatar_url, public_id")
    expect(eq).toHaveBeenCalledWith("id", "user-123")
  })

  it("uses the username only when a profile has no custom display name", async () => {
    const { db } = client({
      id: "u", username: "단비", display_name: null, public_id: "danbi", avatar_url: null,
    })
    const fields = await fetchItemAuthorFields(db, "u")
    expect(fields.display_name).toBe("단비")
    expect(fields.author.display_name).toBe("단비")
  })

  it("uses an existing UUID profile route when older accounts have no public ID", async () => {
    const { db } = client({ id: "old-user", username: "오래된사용자", display_name: null,
      public_id: null, avatar_url: null })
    const fields = await fetchItemAuthorFields(db, "old-user")
    expect(fields.user_public_id).toBeNull()
    expect(fields.author.public_id).toBe("old-user")
  })

  it("propagates lookup failures rather than inventing an author", async () => {
    const { db } = client(null, { message: "profile lookup unavailable" })
    await expect(fetchItemAuthorFields(db, "u")).rejects.toThrow("profile lookup unavailable")
  })
})
