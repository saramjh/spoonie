import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import RecipeBookGuest from "./RecipeBookGuest"

it("shows one genuine public Recipe and preserves both return-to-book authentication paths", () => {
  const html = renderToStaticMarkup(createElement(RecipeBookGuest))

  expect((html.match(/<h1\b/g) ?? [])).toHaveLength(1)
  expect(html).toContain("/recipes/554ae9ef-15a1-4806-944e-170884d17a96")
  expect(html).toContain("아보카도 게살 그라탕")
  expect(html).toContain("내 레시피북에 저장된 항목은 아닙니다.")
  expect(html).toContain("/signup?next=%2Frecipes")
  expect(html).toContain("/login?next=%2Frecipes")
  expect((html.match(/<dt\b/g) ?? [])).toHaveLength(3)
  expect(html).not.toContain("레시피북은 회원이 쓰는 공간이에요")
})
