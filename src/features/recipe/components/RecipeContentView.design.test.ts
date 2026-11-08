import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import RecipeContentView from "./RecipeContentView"

const ingredients = [
  { name: "스파게티", amount: 200, unit: "g" },
  { name: "토마토", amount: 10, unit: "개" },
]
const steps = [
  { step_number: 1, description: "면을 삶아요.", image_url: undefined },
  { step_number: 2, description: "소스를 만들어요.", image_url: undefined },
]

describe("approved recipe-detail mockup contract", () => {
  it("defaults to an accessible ingredients tab and a matching method tab without losing the shared cooking action", () => {
    const html = renderToStaticMarkup(createElement(RecipeContentView, { initialServings: 2, ingredients, steps }))
    expect(html).toContain('role="tablist"')
    expect(html).toContain('role="tab"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('role="tabpanel"')
    expect(html).toContain('재료')
    expect(html).toContain('만드는 법')
    expect(html).toContain('요리 시작')
    expect(html).toContain('aria-label="요리 시작"')
  })

  it("does not show a cooking action when the recipe has no instructions", () => {
    const html = renderToStaticMarkup(createElement(RecipeContentView, { initialServings: 2, ingredients, steps: [] }))
    expect(html).not.toContain('aria-label="요리 시작"')
  })
})
