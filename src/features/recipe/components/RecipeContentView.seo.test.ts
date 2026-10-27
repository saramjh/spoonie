import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import RecipeContentView from "./RecipeContentView"

it("links an indexable recipe's ingredient-adjustment help to the public magazine", () => {
  const html = renderToStaticMarkup(createElement(RecipeContentView, {
    initialServings: 2,
    ingredients: [{ name: "소금", amount: 1, unit: "작은술" }],
    steps: [],
  }))
  expect(html).toContain('href="/magazine"')
  expect(html).toContain("인분 늘리기 안내")
  expect(html).toContain('aria-label="인분 조절"')
})
