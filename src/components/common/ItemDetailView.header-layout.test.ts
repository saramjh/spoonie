import { readFileSync } from "node:fs"
import { expect, it } from "vitest"

const source = readFileSync(new URL("./ItemDetailView.tsx", import.meta.url), "utf8")

it("uses the same left-aligned author header for Recipe and Recipeed details", () => {
  expect(source).toContain('className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-border bg-paper px-1"')
  expect(source).toContain('className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5"')
  expect(source).toContain('className="flex items-center pr-1"')
  expect(source).not.toContain('isRecipe && "justify-center text-[17px]"')
  expect(source).toContain('href={`/profile/${item.user_public_id || item.user_id}`}')
  expect(source).toContain('aria-label="뒤로 가기"')
  expect(source).toContain('aria-label="더보기"')
  // The parent route controls loading/error boundaries. Detail must not render
  // its own second fake-data skeleton after the route-level skeleton.
  expect(source).toContain("item: ItemDetail")
  expect(source).not.toContain("item: ItemDetail | null | undefined")
  expect(source).not.toContain("컨텐츠를 불러오는 중...")

  // The byline must contain identity only. Recipe/Recipeed type belongs in content, not in the profile link.
  expect(source).not.toContain('!isRecipe && <span className="flex-shrink-0 text-meta text-ink-soft">레시피드</span>')
})
