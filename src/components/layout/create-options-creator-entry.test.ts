import { readFileSync } from "node:fs"
import { expect, it } from "vitest"

it("offers a contextual creator entry from the existing compose drawer", () => {
  const source = readFileSync(new URL("./CreateOptionsModal.tsx", import.meta.url), "utf8")
  expect(source).toContain("이미 다른 곳에 올린 레시피가 있나요?")
  expect(source).toContain("크리에이터 시작 안내")
  expect(source.match(/handleNavigation\("\/partners\/creators"\)/g)).toHaveLength(1)
  expect(source).toContain('void logEvent("creator_guide_click", null, "compose_drawer")')
  expect(source).toContain("onClick={handleCreatorGuide}")
  expect(source).toContain("min-h-11")
  expect(source).toContain("focus-visible:ring-2")
  expect(source).not.toContain('handleNavigation("/partners/creators/import")')
})
