import { describe, expect, it } from "vitest"
import { isRecipeReferenceId, docToStoredText, recipeReferenceIds, recipeToken, splitRecipeReferences, storedTextToDoc } from "./inline-recipe-reference"

const A = "c7d218a9-9834-4cd4-b9aa-e1d4e380d040"
const B = "7b304b7c-612f-4b3a-a802-46f11af6df37"

describe("inline recipe reference serialization", () => {
  it("round-trips Korean prose, newlines, references and unclosed [[", () => {
    const text = "김치찌개 [[" + "\n" + "참고 " + recipeToken(A) + " 레시피\n" + recipeToken(B) + " 추천"
    expect(docToStoredText(storedTextToDoc(text))).toBe(text)
  })
  it("keeps duplicate-title references distinct by UUID and batches IDs", () => {
    const text = recipeToken(A) + " " + recipeToken(A) + " " + recipeToken(B)
    expect(recipeReferenceIds(text)).toEqual([A, B])
    expect(splitRecipeReferences(text).filter(p => p.recipeId)).toHaveLength(3)
  })
  it("leaves non-UUID markup and HTML as inert text", () => {
    const text = "[[recipe:javascript:alert(1)]] <script>x</script> [[recipe:not-uuid]]"
    expect(splitRecipeReferences(text)).toEqual([{ text }])
    expect(docToStoredText(storedTextToDoc(text))).toBe(text)
  })
  it("accepts only UUID-shaped reference IDs from clipboard nodes", () => {
    expect(isRecipeReferenceId(A)).toBe(true)
    expect(isRecipeReferenceId("javascript:alert(1)")).toBe(false)
    expect(isRecipeReferenceId(null)).toBe(false)
  })
  it("bounds referenced IDs per view to prevent unbounded item lookups", () => {
    const many = Array.from({ length: 50 }, (_, i) =>
      recipeToken("00000000-0000-4000-8000-" + i.toString(16).padStart(12, "0"))
    )
    expect(recipeReferenceIds(many)).toHaveLength(40)
  })
  it("supports empty content and consecutive blank lines", () => {
    expect(docToStoredText(storedTextToDoc(""))).toBe("")
    expect(docToStoredText(storedTextToDoc("\n\n"))).toBe("\n\n")
  })
})
