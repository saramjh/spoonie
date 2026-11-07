import { expect, it } from "vitest"
import { getNextTabIndex } from "./UnderlineTabs"

it("moves shared search, recipebook and profile tabs with keyboard arrows and Home/End", () => {
  expect(getNextTabIndex(1, 3, "ArrowRight")).toBe(2)
  expect(getNextTabIndex(2, 3, "ArrowRight")).toBe(0)
  expect(getNextTabIndex(0, 3, "ArrowLeft")).toBe(2)
  expect(getNextTabIndex(2, 3, "Home")).toBe(0)
  expect(getNextTabIndex(0, 3, "End")).toBe(2)
  expect(getNextTabIndex(0, 3, "Tab")).toBeNull()
  expect(getNextTabIndex(0, 0, "ArrowRight")).toBeNull()
})
