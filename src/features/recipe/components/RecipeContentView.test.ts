import { it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import RecipeContentView from "./RecipeContentView"

it("shows a discoverable quantity adjust entry, accessible help and preparation count", () => {
  const html = renderToStaticMarkup(createElement(RecipeContentView, {
    initialServings: 2,
    ingredients: [{name:"감자",amount:300,unit:"g"},{name:"밀가루",amount:50,unit:"g"}],
    steps: [],
  }))
  expect(html).toContain("가진 재료 양에 맞추기")
  expect(html).toContain("재료 준비 0/2")
  expect(html).toContain('aria-label="인분 늘리기 안내"')
  expect(html).toContain("2인분")
  expect(html).not.toContain("맞추기 끝내기")
  expect(html).not.toContain('id="adjust-reference-amount"')
})

it("does not offer a ratio adjustment without a second ingredient or a positive source value", () => {
  const html = renderToStaticMarkup(createElement(RecipeContentView, {
    initialServings: 1,
    ingredients: [{name:"소금",amount:0,unit:"약간"}],
    steps: [],
  }))
  expect(html).not.toContain("가진 재료 양에 맞추기")
})
