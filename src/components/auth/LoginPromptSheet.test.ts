import { expect, it } from "vitest"
import { ACTION_MESSAGES } from "./LoginPromptSheet"

it("explains a distinct real benefit before asking guests to sign in", () => {
  expect(ACTION_MESSAGES.follow.body).toContain("팔로우 중")
  expect(ACTION_MESSAGES.like.body).toContain("좋아요")
  expect(ACTION_MESSAGES.bookmark.body).toContain("저장한 글")
  expect(ACTION_MESSAGES.comment.body).toContain("댓글")
  expect(ACTION_MESSAGES.notification.body).toContain("알림")
  expect(new Set(Object.values(ACTION_MESSAGES).map((item) => item.title)).size).toBe(5)
  expect(Object.values(ACTION_MESSAGES).every((item) => item.body.length > 12)).toBe(true)
})
