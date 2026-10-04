import { describe, expect, it } from "vitest"
import { legacyPartnerRoute } from "./legacy-hash-redirect"

describe("legacy partner outreach links", () => {
  it("routes creator outreach hashes to the creator landing", () => {
    expect(legacyPartnerRoute("#creators")).toBe("/partners/creators")
  })

  it("routes brand outreach hashes to the brand landing", () => {
    expect(legacyPartnerRoute("#brands")).toBe("/partners/brands")
  })

  it("leaves ordinary partner hub visits alone", () => {
    expect(legacyPartnerRoute("")).toBeNull()
    expect(legacyPartnerRoute("#unknown")).toBeNull()
  })
})
