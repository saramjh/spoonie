import { describe, expect, it } from "vitest"
import {
  extractOnboardingDraft,
  isoDurationMinutes,
  parseStructuredIngredient,
} from "./source-extraction"

describe("onboarding source extraction", () => {
  it("extracts only explicit schema.org Recipe fields", () => {
    const html = [
      "<html><head>",
      '<meta property="og:image" content="https://example.com/dish.jpg">',
      '<script type="application/ld+json">',
      '{"@context":"https://schema.org","@type":"Recipe","name":"항정살 구이","description":"주물팬에 굽는 한 상","recipeYield":"2인분","totalTime":"PT35M","recipeIngredient":["400 g 항정살","그린빈 10 개"],"recipeInstructions":[{"@type":"HowToStep","text":"팬을 달군다."},{"@type":"HowToStep","text":"항정살을 굽는다."}],"keywords":"돼지고기, 구이"}',
      "</script></head></html>",
    ].join("")
    const result = extractOnboardingDraft(html, {
      sourceType: "web",
      sourceUrl: "https://example.com/recipe",
    })
    expect(result.recipe.title).toBe("항정살 구이")
    expect(result.recipe.servings).toBe(2)
    expect(result.recipe.cooking_time_minutes).toBe(35)
    expect(result.recipe.ingredients).toEqual([
      { raw: "400 g 항정살", name: "항정살", amount: 400, unit: "g" },
      { raw: "그린빈 10 개", name: "그린빈", amount: 10, unit: "개" },
    ])
    expect(result.recipe.instructions.map((step) => step.description)).toEqual([
      "팬을 달군다.",
      "항정살을 굽는다.",
    ])
    expect(result.unresolvedFields).toEqual([])
    expect(result.evidence.extraction).toBe("json_ld_recipe")
  })

  it("does not invent recipe fields from Instagram metadata", () => {
    const html = [
      "<html><head>",
      '<meta property="og:title" content="Creator on Instagram">',
      '<meta property="og:description" content="오늘 만든 파스타. 맛있게 먹었어요.">',
      '<meta property="og:image" content="https://cdn.example.com/photo.jpg">',
      "</head></html>",
    ].join("")
    const result = extractOnboardingDraft(html, {
      sourceType: "instagram_post",
      sourceUrl: "https://www.instagram.com/p/ABC/",
    })
    expect(result.recipe.title).toBe("")
    expect(result.recipe.description).toBe("오늘 만든 파스타. 맛있게 먹었어요.")
    expect(result.recipe.source_image_url).toBe("https://cdn.example.com/photo.jpg")
    expect(result.unresolvedFields).toEqual([
      "title",
      "servings",
      "cooking_time",
      "ingredients",
      "instructions",
    ])
  })

  it("unwraps Instagram captions and only accepts an explicit serving-time pair", () => {
    const html = [
      "<html><head>",
      '<meta property="og:description" content="3 likes, 0 comments - creator on October 5, 2026: &quot;두부조림 한 상 2인분 · 25분 분량과 순서는 본문에 적었어요.&quot;.">',
      "</head></html>",
    ].join("")
    const result = extractOnboardingDraft(html, {
      sourceType: "instagram_post",
      sourceUrl: "https://www.instagram.com/p/PAIR/",
    })
    expect(result.recipe.description).toBe("두부조림 한 상 2인분 · 25분 분량과 순서는 본문에 적었어요.")
    expect(result.recipe.servings).toBe(2)
    expect(result.recipe.cooking_time_minutes).toBe(25)
    expect(result.unresolvedFields).toEqual(["title", "image", "ingredients", "instructions"])
  })

  it("keeps unparseable ingredient text without guessing amount or unit", () => {
    expect(parseStructuredIngredient("소금 약간")).toEqual({
      raw: "소금 약간",
      name: "소금 약간",
      amount: null,
      unit: null,
    })
    expect(parseStructuredIngredient("1 1/2 컵 밀가루")).toEqual({
      raw: "1 1/2 컵 밀가루",
      name: "밀가루",
      amount: 1.5,
      unit: "컵",
    })
  })

  it("parses ISO recipe durations without guessing", () => {
    expect(isoDurationMinutes("PT1H20M")).toBe(80)
    expect(isoDurationMinutes("PT45M")).toBe(45)
    expect(isoDurationMinutes("30분")).toBeNull()
  })
})
