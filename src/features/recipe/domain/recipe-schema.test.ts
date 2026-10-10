import { describe, expect, it } from "vitest"
import { recipeSchema } from "./recipe-schema"

const input = {
  title: "집에서 만드는 파스타",
  description: "",
  servings: "2",
  cooking_time_minutes: "35",
  is_public: true,
  ingredients: [{ name: "면", amount: "125.5", unit: "g" }],
  instructions: [{ description: "물에 면을 넣습니다.", image_url: "" }],
  color_label: null,
  tags: "파스타, 간단한 요리, , 집밥",
  cited_recipe_ids: [],
}

describe("recipe form input/output contract", () => {
  it("converts HTML number strings and comma-separated tags to typed submit data", () => {
    const values = recipeSchema.parse(input)
    expect(values.servings).toBe(2)
    expect(values.cooking_time_minutes).toBe(35)
    expect(values.ingredients[0].amount).toBe(125.5)
    expect(values.tags).toEqual(["파스타", "간단한 요리", "집밥"])
  })

  it("converts an empty tags input to an empty list", () => {
    expect(recipeSchema.parse({ ...input, tags: "" }).tags).toEqual([])
  })

  it("rejects nonpositive ingredient quantities entered as strings", () => {
    expect(recipeSchema.safeParse({ ...input, ingredients: [{ name: "면", amount: "0", unit: "g" }] }).success).toBe(false)
  })

  it("preserves minimum title and minimum ingredient checks", () => {
    expect(recipeSchema.safeParse({ ...input, title: "면" }).success).toBe(false)
    expect(recipeSchema.safeParse({ ...input, ingredients: [] }).success).toBe(false)
  })
})
