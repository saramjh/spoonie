import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import RecipeBookGuest from "./RecipeBookGuest"

it("matches the approved locked Recipebook screen without claiming sample data is the user's library", () => {
  const html = renderToStaticMarkup(createElement(RecipeBookGuest))

  expect((html.match(/<h1\b/g) ?? [])).toHaveLength(1)
  expect(html).toContain("레시피북")
  expect(html).toContain("lucide-lock")
  expect(html).toContain("로그인하고 이어서 볼 수 있어요")
  expect(html).toContain("내 레시피와 저장한 글을 한곳에서 관리해 보세요.")
  expect(html).toContain('/login?next=%2Frecipes')
  expect(html).not.toContain('/recipes/554ae9ef-15a1-4806-944e-170884d17a96')
  expect(html).not.toContain("아보카도 게살 그라탕")
  expect(html).not.toContain("내 레시피북에 저장된 항목은 아닙니다.")
  expect(html).not.toContain("로그인 없이 미리 보기")
})
