import { describe, it, expect } from "vitest"
import { normalizeCoverFocal, coverObjectPosition } from "./cover-focal"

describe("recipe cover focal position", () => {
  it("defaults older items and invalid values to center", () => {
    expect(normalizeCoverFocal(null)).toEqual({ x: 50, y: 50 })
    expect(coverObjectPosition({ x: "oops", y: 22 })).toBe("50% 50%")
  })
  it("clamps invalid out-of-range coordinates without changing the original image", () => {
    expect(normalizeCoverFocal({ x: -40, y: 120 })).toEqual({ x: 0, y: 100 })
    expect(coverObjectPosition({ x: 30, y: 77 })).toBe("30% 77%")
  })
})
