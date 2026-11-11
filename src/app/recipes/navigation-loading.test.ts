import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

/** Prevent a blank legal-footer-only frame before Recipe detail loading.tsx can render. */
describe("recipe route transition", () => {
  const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

  it("does not mask nested Recipe detail loading with an empty parent Suspense fallback", () => {
    const layout = source("src/app/recipes/layout.tsx")
    const page = source("src/app/recipes/page.tsx")
    expect(layout).not.toContain("fallback={null}")
    expect(layout).not.toContain("<Suspense")
    expect(page).toContain("<Suspense fallback={<PageLoading />}>")
    expect(source("src/app/recipes/[id]/loading.tsx")).toContain("DetailLoading")
  })

  it("keeps service footer at the bottom when a route has no visible body yet", () => {
    const wrapper = source("src/components/layout/AppWrapper.tsx")
    expect(wrapper).toContain('className="relative flex min-h-screen flex-col w-full"')
    expect(wrapper).toMatch(/<main className="flex-1 w-full">/)
    expect(wrapper.indexOf("<SiteFooter")).toBeGreaterThan(wrapper.indexOf("</main>"))
  })
})
