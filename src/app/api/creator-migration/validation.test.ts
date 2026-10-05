import { describe, expect, it } from "vitest"
import { validateCreatorMigrationRequest } from "./validation"

const valid = {
  name: "요리하는 민지",
  email: "Cook@Example.com",
  instagramUrls: [
    "https://www.instagram.com/p/ABC123/?utm_source=ig_web_copy_link",
    "https://instagram.com/reel/XYZ789/#fragment",
  ],
  note: "대표 레시피 두 개부터 옮기고 싶습니다.",
  rightsConfirmed: true,
  sourcePath: "/partners/creators",
} as const

describe("validateCreatorMigrationRequest", () => {
  it("normalizes canonical Instagram content URLs and request fields", () => {
    expect(validateCreatorMigrationRequest(valid)).toEqual({
      display_name: "요리하는 민지",
      email: "cook@example.com",
      instagram_urls: [
        "https://www.instagram.com/p/ABC123/",
        "https://www.instagram.com/reel/XYZ789/",
      ],
      note: "대표 레시피 두 개부터 옮기고 싶습니다.",
      rights_confirmed: true,
      source_path: "/partners/creators",
    })
  })

  it("deduplicates the same post and accepts post, reel, and legacy tv URLs", () => {
    const result = validateCreatorMigrationRequest({
      ...valid,
      instagramUrls: [
        "https://instagram.com/p/ONE/",
        "https://www.instagram.com/p/ONE/?igsh=duplicate",
        "https://www.instagram.com/reel/TWO/",
        "https://www.instagram.com/tv/THREE/",
      ],
    })

    expect(result?.instagram_urls).toEqual([
      "https://www.instagram.com/p/ONE/",
      "https://www.instagram.com/reel/TWO/",
      "https://www.instagram.com/tv/THREE/",
    ])
  })

  it("rejects non-content, non-Instagram, insecure, or malformed URLs", () => {
    expect(validateCreatorMigrationRequest({ ...valid, instagramUrls: ["https://www.instagram.com/cookname/"] })).toBeNull()
    expect(validateCreatorMigrationRequest({ ...valid, instagramUrls: ["https://example.com/p/ABC/"] })).toBeNull()
    expect(validateCreatorMigrationRequest({ ...valid, instagramUrls: ["http://instagram.com/p/ABC/"] })).toBeNull()
    expect(validateCreatorMigrationRequest({ ...valid, instagramUrls: ["not-a-url"] })).toBeNull()
  })

  it("requires explicit rights confirmation and between one and five unique posts", () => {
    expect(validateCreatorMigrationRequest({ ...valid, rightsConfirmed: false })).toBeNull()
    expect(validateCreatorMigrationRequest({ ...valid, instagramUrls: [] })).toBeNull()
    expect(validateCreatorMigrationRequest({
      ...valid,
      instagramUrls: [
        "https://instagram.com/p/1/",
        "https://instagram.com/p/2/",
        "https://instagram.com/p/3/",
        "https://instagram.com/p/4/",
        "https://instagram.com/p/5/",
        "https://instagram.com/p/6/",
      ],
    })).toBeNull()
  })

  it("rejects invalid contact fields, oversized notes, and non-creator source paths", () => {
    expect(validateCreatorMigrationRequest({ ...valid, email: "bad" })).toBeNull()
    expect(validateCreatorMigrationRequest({ ...valid, name: "A" })).toBeNull()
    expect(validateCreatorMigrationRequest({ ...valid, note: "x".repeat(1001) })).toBeNull()
    expect(validateCreatorMigrationRequest({ ...valid, sourcePath: "/partners/brands" })).toBeNull()
  })
})
