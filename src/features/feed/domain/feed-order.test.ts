import { describe, expect, it } from "vitest"
import { diversifyRecentFeed } from "./feed-order"

const item = (id: string, user_id: string, created_at = "2026-10-04T12:00:00+09:00") => ({ id, user_id, created_at })

describe("diversifyRecentFeed", () => {
  it("최신 첫 항목은 유지하고 같은 날짜의 대체 후보가 있으면 같은 작성자 3연속을 끊는다", () => {
    const input = [item("1", "a"), item("2", "a"), item("3", "a"), item("4", "b"), item("5", "c")]
    expect(diversifyRecentFeed(input).map((row) => row.id)).toEqual(["1", "2", "4", "3", "5"])
  })

  it("다른 작성자가 없으면 억지로 순서를 바꾸지 않는다", () => {
    const input = [item("1", "a"), item("2", "a"), item("3", "a")]
    expect(diversifyRecentFeed(input)).toEqual(input)
  })

  it("이미 다양한 최신순은 그대로 둔다", () => {
    const input = [item("1", "a"), item("2", "b"), item("3", "a"), item("4", "c")]
    expect(diversifyRecentFeed(input)).toEqual(input)
  })

  it("날짜 경계를 넘겨 오래된 글을 앞으로 끌어오지 않는다", () => {
    const input = [
      item("1", "a", "2026-10-04T12:00:00+09:00"),
      item("2", "a", "2026-10-04T11:00:00+09:00"),
      item("3", "a", "2026-10-04T10:00:00+09:00"),
      item("4", "b", "2026-10-03T23:50:00+09:00"),
    ]
    expect(diversifyRecentFeed(input).map((row) => row.id)).toEqual(["1", "2", "3", "4"])
  })
})
