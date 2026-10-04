import { describe, expect, it } from "vitest"
import { validatePartnerInquiry } from "./validation"

const valid = {
  segment: "creator",
  name: "Creator Name",
  email: "Creator@Example.com",
  organization: "Cooking Channel",
  profileUrl: "https://example.com/creator",
  message: "Recipe 파일럿을 같이 검증해보고 싶습니다.",
  sourcePath: "/partners/creators",
} as const

describe("validatePartnerInquiry", () => {
  it("normalizes a valid inquiry", () => {
    expect(validatePartnerInquiry(valid)).toEqual({
      segment: "creator",
      name: "Creator Name",
      email: "creator@example.com",
      organization: "Cooking Channel",
      profile_url: "https://example.com/creator",
      message: "Recipe 파일럿을 같이 검증해보고 싶습니다.",
      source_path: "/partners/creators",
    })
  })

  it("accepts the brand segment and optional blank fields", () => {
    expect(validatePartnerInquiry({
      ...valid,
      segment: "brand",
      organization: " ",
      profileUrl: "",
      sourcePath: "/partners/brands",
    })?.segment).toBe("brand")
  })

  it("rejects invalid email, URL, segment, short messages and non-partner source paths", () => {
    expect(validatePartnerInquiry({ ...valid, email: "bad" })).toBeNull()
    expect(validatePartnerInquiry({ ...valid, profileUrl: "javascript:alert(1)" })).toBeNull()
    expect(validatePartnerInquiry({ ...valid, segment: "media" })).toBeNull()
    expect(validatePartnerInquiry({ ...valid, message: "short" })).toBeNull()
    expect(validatePartnerInquiry({ ...valid, sourcePath: "/login" })).toBeNull()
  })
})
