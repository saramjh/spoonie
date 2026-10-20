import { readFileSync } from "node:fs"
import { expect, it } from "vitest"

it("does not reintroduce owner-rejected promotional homepage blocks", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8")
  expect(source).not.toContain("first-cook-home-entry")
  expect(source).not.toContain("recent-recipeed-heading")
  expect(source).not.toContain("최근 요리 기록")
  expect(source).not.toContain("첫 요리기록 시작하기")
  expect(source).not.toContain('href="/early-cooks"')
})
