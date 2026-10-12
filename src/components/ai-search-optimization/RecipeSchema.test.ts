import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import RecipeSchema from "./RecipeSchema"
import type { ItemDetail } from "@/types/item"

function recipeJsonLd(item: Partial<ItemDetail>) {
  const html = renderToStaticMarkup(createElement(RecipeSchema, { item: item as ItemDetail, baseUrl: "https://spoonie.kr" }))
  const body = /<script type="application\/ld\+json">([^<]+)<\/script>/.exec(html)?.[1]
  if (!body) throw new Error("Recipe structured data absent")
  return JSON.parse(body)
}

describe("Recipe search schema consistency", () => {
  it("uses the author's selected cover first and retains every unique image", () => {
    const item = {
      id: "sample-recipe",
      title: "게시된 조리법",
      created_at: "2026-10-08T00:00:00Z",
      image_urls: ["https://spoonie.kr/side.jpg", "https://spoonie.kr/cover.jpg", "https://spoonie.kr/step.jpg"],
      thumbnail_index: 1,
    }
    const data = recipeJsonLd(item)
    expect(data.image).toEqual(["https://spoonie.kr/cover.jpg", "https://spoonie.kr/side.jpg", "https://spoonie.kr/step.jpg"])
  })

  it("uses descriptive step text without unhelpful numbered-only step names", () => {
    const item = {
      id: "sample-recipe",
      title: "게시된 조리법",
      created_at: "2026-10-08T00:00:00Z",
      instructions: [
        { step_number: 1, description: "팬을 달군다." },
        { step_number: 2, description: "재료를 볶는다." },
      ],
    }
    const data = recipeJsonLd(item)
    expect(data.recipeInstructions).toEqual([
      { "@type": "HowToStep", position: 1, url: "https://spoonie.kr/recipes/sample-recipe#step-1", text: "팬을 달군다." },
      { "@type": "HowToStep", position: 2, url: "https://spoonie.kr/recipes/sample-recipe#step-2", text: "재료를 볶는다." },
    ])
  })
})
