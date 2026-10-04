/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, expect, it } from "vitest"

const {
  compileInstagramContent,
  ctaVariantForReleaseOrder,
  selectPhotos,
} = require("../../../netlify/functions/instagram-content.js")

const item = {
  title: "아스파라거스 베이컨 파스타",
  description: "아스파라거스와 베이컨을 곁들인 파스타",
  tags: ["파스타", "아스파라거스", "베이컨", "수란"],
  servings: 2,
  cooking_time_minutes: 25,
  image_urls: ["cover-1", "cover-2", "cover-3"],
  thumbnail_index: 1,
}

const ingredients = [
  { name: "파스타면" },
  { name: "아스파라거스" },
  { name: "베이컨" },
]
const steps = [{ image_url: "step-1" }, { image_url: "step-2" }]

describe("Instagram content experiment assignment", () => {
  it("assigns CTA variants deterministically by release order", () => {
    expect(ctaVariantForReleaseOrder(6)).toBe("save")
    expect(ctaVariantForReleaseOrder(7)).toBe("site")
    expect(ctaVariantForReleaseOrder(6)).toBe("save")
  })

  it("keeps the hero first, then gallery images, then step images", () => {
    expect(selectPhotos(item, steps)).toEqual([
      "cover-2",
      "cover-1",
      "cover-3",
      "step-1",
      "step-2",
    ])
  })

  it("caps carousel slides at ten", () => {
    const manySteps = Array.from({ length: 12 }, (_, index) => ({ image_url: `step-${index}` }))
    expect(selectPhotos(item, manySteps)).toHaveLength(10)
  })

  it("changes only the controlled CTA while keeping hook and slide strategy fixed", () => {
    const save = compileInstagramContent(item, ingredients, steps, 6)
    const site = compileInstagramContent(item, ingredients, steps, 7)

    expect(save.experiment).toEqual({
      version: "cta_v1",
      ctaVariant: "save",
      hookVariant: "recipe_title_v1",
      slideStrategy: "hero_gallery_steps_v1",
      contentFormat: "carousel",
      slideCount: 5,
    })
    expect(site.experiment).toEqual({
      ...save.experiment,
      ctaVariant: "site",
    })
    expect(save.caption).toContain("나중에 만들어보고 싶다면 저장해두세요.")
    expect(site.caption).toContain("프로필 링크 → spoonie.kr")
    expect(save.caption).toContain("2인분 · 25분")
    expect(save.caption).toContain("#파스타")
  })
})
