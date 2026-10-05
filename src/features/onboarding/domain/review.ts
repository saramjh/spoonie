import type { RecipeFormInput } from "@/features/recipe/contracts"
import type { OnboardingReviewDraft } from "../contracts"

export function onboardingRecipeDefaults(draft: OnboardingReviewDraft): RecipeFormInput {
  const recipe = draft.recipe
  return {
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings || 0,
    cooking_time_minutes: recipe.cooking_time_minutes || 0,
    is_public: false,
    ingredients: recipe.ingredients.length
      ? recipe.ingredients.map((ingredient) => ({
          name: ingredient.name,
          amount: ingredient.amount || 0,
          unit: ingredient.unit || "",
        }))
      : [{ name: "", amount: 0, unit: "" }],
    instructions: recipe.instructions.length
      ? recipe.instructions.map((instruction) => ({ description: instruction.description }))
      : [{ description: "" }],
    color_label: null,
    tags: recipe.tags.join(", "),
    cited_recipe_ids: [],
  }
}
