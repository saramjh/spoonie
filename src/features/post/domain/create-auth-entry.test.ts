import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("Recipe and Recipeed authenticated creation entry", () => {
  for (const [kind, filename] of [
    ["Recipe", "src/app/recipes/new/page.tsx"],
    ["Recipeed", "src/app/posts/new/page.tsx"],
  ] as const) {
    it(kind + " distinguishes an absent session from a failed authentication request", () => {
      const code = readFileSync(resolve(process.cwd(), filename), "utf8")
      expect(code).toContain('error.name !== "AuthSessionMissingError"')
      expect(code).toContain("setAuthError(true)")
      expect(code.indexOf("if (authError)")).toBeGreaterThan(code.indexOf("if (isLoading)"))
      expect(code.indexOf("if (!user)")).toBeGreaterThan(code.indexOf("if (authError)"))
      expect(code).toContain('title="로그인 상태를 확인할 수 없습니다"')
      expect(code).toContain("window.location.reload()")
      expect(code).toContain("active = false")
    })
  }

  it("Recipe separates a subsequent onboarding failure from the initial auth check", () => {
    const code = readFileSync(resolve(process.cwd(), "src/app/recipes/new/page.tsx"), "utf8")
    expect(code).toContain("authChecked = true")
    expect(code).toContain('if (authChecked) setOnboardingError("Recipe 작성 화면을 준비하지 못했습니다.")')
  })
})
