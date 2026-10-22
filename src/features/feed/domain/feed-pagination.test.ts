import { describe, expect, it } from "vitest"
import { shouldRequestNextFeedPage } from "./feed-pagination"

describe("home feed infinite-scroll pagination", () => {
  it("loads one page when the sentinel first intersects an idle feed", () => {
    expect(shouldRequestNextFeedPage(true, false, false, false)).toBe(true)
  })
  it.each([
    [false, false, false, false], // sentinel outside viewport
    [true, true, false, false], // no remaining posts
    [true, false, true, false], // SWR is loading the next page
    [true, false, false, true], // observer fires twice before SWR reacts
  ])("does not trigger duplicate or unnecessary requests (%s, %s, %s, %s)", (...args) => {
    expect(shouldRequestNextFeedPage(...args)).toBe(false)
  })
})
