import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import LinkifiedText from "./LinkifiedText"
import { recipeToken } from "@/features/recipe/domain/inline-recipe-reference"
import type { Item } from "@/types/item"

const id = "efe00924-c5b4-4d82-8f55-d476848196d6"
const title = "김치전"
const recipe = { id, title, image_urls: null } as Item

describe("rendering inline recipe references", () => {
  it("renders a safe, in-flow recipe link from an RLS-visible record", () => {
    const html = renderToStaticMarkup(createElement(LinkifiedText, {
      text: "참고 " + recipeToken(id) + " 좋아요", recipes: [recipe],
    }))
    expect(html).toContain('href="/recipes/' + id + '"')
    expect(html).toContain("레시피 열기: 김치전")
    expect(html).toContain("참고 ")
    expect(html).toContain(" 좋아요")
    expect(html).not.toContain("[[recipe:")
  })
  it("never links or reveals metadata for a missing or private reference", () => {
    const html = renderToStaticMarkup(createElement(LinkifiedText, { text: recipeToken(id), recipes: [] }))
    expect(html).toContain("볼 수 없는 레시피")
    expect(html).not.toContain('href="/recipes/')
    expect(html).not.toContain(title)
  })
  it("does not execute or trust malformed user-supplied reference markup", () => {
    const html = renderToStaticMarkup(createElement(LinkifiedText, {
      text: '[[recipe:javascript:alert(1)]] <script>alert(1)</script>',
    }))
    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<script>")
    expect(html).not.toContain('href="/recipes/')
  })
})
