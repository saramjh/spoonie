import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("committed Recipe/Recipeed never reports a new DB save failure", () => {
  for (const [label, filename, repoCall] of [
    ["Recipe", "src/features/recipe/components/RecipeForm.tsx", "saveRecipeRows"],
    ["Recipeed", "src/components/items/PostForm.tsx", "savePostRow"],
  ] as const) {
    it(label + " guards failed side effects after a successful DB commit", () => {
      const src = readFileSync(resolve(process.cwd(), filename), "utf8")
      expect(src).toContain("dbCommitted = true")
      expect(src.indexOf("dbCommitted = true")).toBeGreaterThan(src.indexOf("await " + repoCall + "("))
      expect(src).toContain("await afterCommit(\"draft\"")
      expect(src).toMatch(/await afterCommit\("cache"/)
      expect(src).toMatch(/await afterCommit\("revalidate"/)
      // Catch must distinguish persisted content from a failed database write.
      expect(src).toMatch(/catch \(error(?:: unknown)?\) \{[\s\S]*?if \(dbCommitted\) \{/)
      expect(src).toContain("cleanupUncommittedImages(newUploadUrls")
    })
  }
})
