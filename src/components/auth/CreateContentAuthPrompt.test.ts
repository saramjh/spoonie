import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, expect, it, vi } from "vitest"
import CreateContentAuthPrompt from "./CreateContentAuthPrompt"

afterEach(() => vi.unstubAllGlobals())

function markup(type: "recipe" | "post", url: string) {
  const parsed = new URL(url, "https://spoonie.kr")
  vi.stubGlobal("window", { location: { pathname: parsed.pathname, search: parsed.search } })
  return renderToStaticMarkup(createElement(CreateContentAuthPrompt, { contentType: type }))
}

it("shows a genuine Recipe, distinct authoring value and direct same-page return on signup/login", () => {
  const next = "/recipes/new?fork=554ae9ef-15a1-4806-944e-170884d17a96&entry=partner_creator"
  const html = markup("recipe", next)
  expect((html.match(/<h1\b/g) ?? [])).toHaveLength(1)
  expect(html).toContain("아보카도 게살 그라탕")
  expect(html).toContain("/recipes/554ae9ef-15a1-4806-944e-170884d17a96")
  expect(html).toContain("재료·분량과 조리 과정을")
  expect(html).toContain("/signup?next=" + encodeURIComponent(next))
  expect(html).toContain("/login?next=" + encodeURIComponent(next))
  expect(html).not.toContain("레시피를 쓰려면 로그인해 주세요")
})

it("shows a real Recipeed while retaining the original referenced Recipe route after login", () => {
  const next = "/posts/new?source=554ae9ef-15a1-4806-944e-170884d17a96&origin=cook_mode"
  const html = markup("post", next)
  expect((html.match(/<h1\b/g) ?? [])).toHaveLength(1)
  expect(html).toContain("개복숭아 잼")
  expect(html).toContain("/posts/3a740af5-9baa-48a8-8276-8e5859f49bf5")
  expect(html).toContain("지금 선택한 Recipe의 연결 주소")
  expect(html).toContain("참고한 Recipe가 있다면")
  expect(html).toContain("/signup?next=" + encodeURIComponent(next))
  expect(html).toContain("/login?next=" + encodeURIComponent(next))
  expect(html).not.toContain("레시피드를 쓰려면 로그인해 주세요")
})

it("does not pretend there is a source Recipe when creating a standalone Recipeed", () => {
  const html = markup("post", "/posts/new")
  expect(html).not.toContain("지금 선택한 Recipe의 연결 주소")
})
