import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("recipe route transition", () => {
  const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

  it("does not mask nested Recipe detail loading with an empty parent Suspense fallback", () => {
    const layout = source("src/app/recipes/layout.tsx")
    const page = source("src/app/recipes/page.tsx")
    expect(layout).not.toContain("fallback={null}")
    expect(layout).not.toContain("<Suspense")
    expect(page).toContain("<Suspense fallback={<RecipeBookLoading />}>")
    expect(source("src/app/recipes/[id]/loading.tsx")).toContain("DetailLoading")
  })
})
