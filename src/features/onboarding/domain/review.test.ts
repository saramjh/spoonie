import { describe, expect, it } from "vitest"

import type { OnboardingReviewDraft } from "../contracts"
import { onboardingRecipeDefaults } from "./review"

const draft: OnboardingReviewDraft = {
  id: "d0000000-0000-4000-8000-000000000001",
  status: "needs_input",
  itemId: null,
  actorType: "creator",
  entrySource: "partner_creator",
  sourceType: "instagram_post",
  sourceUrl: "https://www.instagram.com/p/ABC/",
  unresolvedFields: ["servings", "ingredients"],
  sourceImageEndpoint: null,
  recipe: {
    title: "명시된 제목",
    description: "명시된 설명",
    servings: null,
    cooking_time_minutes: 25,
    ingredients: [{ raw: "소금 약간", name: "소금 약간", amount: null, unit: null }],
    instructions: [{ description: "팬을 달군다." }],
    tags: ["구이"],
    source_image_url: null,
    source_url: "https://www.instagram.com/p/ABC/",
  },
}

describe("onboarding recipe review defaults", () => {
  it("keeps unresolved numeric fields invalid instead of inventing defaults", () => {
    const values = onboardingRecipeDefaults(draft)
    expect(values.servings).toBe(0)
    expect(values.ingredients[0]).toEqual({ name: "소금 약간", amount: 0, unit: "" })
    expect(values.cooking_time_minutes).toBe(25)
    expect(values.is_public).toBe(false)
  })
})
