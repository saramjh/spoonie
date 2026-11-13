import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { ItemDetail } from "@/types/item"
import PostSchema from "./PostSchema"

const item = {
  id: "577808ef-555f-40cb-a71c-dcad1a1b6058",
  created_at: "2026-11-13T00:00:00Z",
  content: "실제 공개 요리 이야기",
  comments_count: 2,
  likes_count: 3,
  username: "post-author",
} as unknown as ItemDetail

function jsonLd(comments: Array<{ content: string; created_at: string; user: { display_name: string; username: string; public_id: string } | null }>, count: number) {
  const html = renderToStaticMarkup(createElement(PostSchema, {
    item: { ...item, comments_count: count }, baseUrl: "https://spoonie.kr", comments,
  } as Parameters<typeof PostSchema>[0]))
  const match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
  expect(match).not.toBeNull()
  return JSON.parse(match![1]) as {
    "@type": string
    commentCount: number
    comment?: Array<{ "@type": string; text: string; datePublished: string; author: { name: string; url?: string } }>
  }
}

describe("real public post JSON-LD comments", () => {
  const visible = [
    { content: "첫 댓글 전체 본문", created_at: "2026-11-13T00:01:00Z", user: { display_name: "첫 작성자", username: "first", public_id: "first" } },
    { content: "두 번째 댓글", created_at: "2026-11-13T00:02:00Z", user: { display_name: "두 작성자", username: "second", public_id: "second" } },
  ]

  it("emits real visible comments in order and matches the database comment count", () => {
    const ld = jsonLd(visible, 2)
    expect(ld["@type"]).toBe("SocialMediaPosting")
    expect(ld.commentCount).toBe(2)
    expect(ld.comment).toHaveLength(2)
    expect(ld.comment?.[0]).toMatchObject({ "@type": "Comment", text: "첫 댓글 전체 본문", datePublished: "2026-11-13T00:01:00Z", author: { name: "첫 작성자", url: "https://spoonie.kr/profile/first" } })
    expect(ld.comment?.[1]?.text).toBe("두 번째 댓글")
  })

  it("does not invent a comment when the post actually has none", () => {
    const ld = jsonLd([], 0)
    expect(ld.commentCount).toBe(0)
    expect(ld).not.toHaveProperty("comment")
  })

  it("preserves the true total even when only a bounded list is rendered", () => {
    const ld = jsonLd(visible, 51)
    expect(ld.commentCount).toBe(51)
    expect(ld.comment).toHaveLength(2)
  })
})
