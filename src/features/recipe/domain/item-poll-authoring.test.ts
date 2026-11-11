import { describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import PollComposer from "../components/PollComposer"
import { pollDraftSchema, readItemPollSnapshot } from "./item-poll"

const draft = { question: "어느 식감이 더 좋으신가요?", options: ["바삭한 식감", "촉촉한 식감"] }
const itemId = "6eaa37a1-6c0f-4841-aadd-7a2d980fbdbf"

describe("optional poll authoring contract", () => {
  it("does not force a poll on new Recipe or Recipeed posts", () => {
    const html = renderToStaticMarkup(createElement(PollComposer, {
      value:null, onChange:vi.fn(), saved:null, voteCount:0,
    }))
    expect(html).toContain("투표 추가")
    expect(html).not.toContain('id="poll-question"')
  })
  it("uses the same compact poll input for both writers and enforces 2–4 choices", () => {
    const html = renderToStaticMarkup(createElement(PollComposer, {
      value:draft,onChange:vi.fn(),saved:null,voteCount:0,
    }))
    expect(html).toContain('id="poll-question"')
    expect(html).toContain("선택지 1")
    expect(html).toContain("선택지 2")
    expect(html).toContain("선택지 추가")
    expect(pollDraftSchema.safeParse(draft).success).toBe(true)
    expect(pollDraftSchema.safeParse({ ...draft, options: ["같은 답", "같은 답"] }).success).toBe(false)
    expect(pollDraftSchema.safeParse({ ...draft, options: ["가", "나"] }).success).toBe(false)
    expect(pollDraftSchema.safeParse({ ...draft, options: [...draft.options, "선택 C", "선택 D", "선택 E"] }).success).toBe(false)
  })
  it("locks choice wording when there are votes and permits hiding the poll", () => {
    const html = renderToStaticMarkup(createElement(PollComposer, {
      value:draft,onChange:vi.fn(),saved:draft,voteCount:3,
    }))
    expect(html).toContain('disabled=""')
    expect(html).toContain("이미 3명이 참여해")
    expect(html).toContain("투표 빼기")
  })
  it("does not accept mismatched or invented server vote totals", () => {
    const good = {
      item_id: itemId, question: draft.question, options: draft.options,
      counts: [2, 1], total: 3, selected_index: null, active: true,
    }
    expect(readItemPollSnapshot(good)?.total).toBe(3)
    expect(readItemPollSnapshot({ ...good, total: 999 })).toBeNull()
    expect(readItemPollSnapshot({ ...good, counts: [3, -1] })).toBeNull()
  })
})
