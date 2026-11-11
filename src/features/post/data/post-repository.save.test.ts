import { describe, expect, it, vi } from "vitest"
import { savePostRow } from "./post-repository"

describe("post + poll atomic database boundary", () => {
  it("preserves the SQLSTATE for a rejected transaction", async () => {
    const error = { code: "42501", message: "row-level security rejected" }
    const supabase = { rpc: vi.fn().mockResolvedValue({ data: null, error }) } as unknown as Parameters<typeof savePostRow>[0]
    await expect(savePostRow(supabase, {
      existingId: null, itemPayload: { item_type: "post" }, poll: null, pollAction: "keep",
    })).rejects.toMatchObject({ cause: error })
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
  })

  it("passes the ordered photos and poll in one RPC on edit", async () => {
    const existingId = "posted-before-edit"
    const imageUrls = ["https://cdn.example/one.jpg", "https://cdn.example/two.jpg"]
    const payload = { item_type: "post", image_urls: imageUrls, thumbnail_index: 1 }
    const poll = { question: "오늘 어떤 맛이 가장 좋으신가요?", options: ["바삭한 맛", "촉촉한 맛"] }
    const rpc = vi.fn().mockResolvedValue({ data: existingId, error: null })
    const supabase = { rpc } as unknown as Parameters<typeof savePostRow>[0]

    await expect(savePostRow(supabase, { existingId, itemPayload: payload, poll, pollAction: "set" }))
      .resolves.toEqual({ itemId: existingId })
    expect(rpc).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith("save_item_with_poll_atomic", {
      p_existing_id: existingId,
      p_item: payload,
      p_ingredients: null,
      p_instructions: null,
      p_poll: poll,
      p_poll_action: "set",
    })
  })
})
