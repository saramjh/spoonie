import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

// 편집 중 대표 사진 선택은 로컬 미리보기만 변경해야 한다.
// 취소·DB 거절 전 피드 캐시가 바뀌지 않게 실제 저장 순서도 검증한다.
function readCoverHandler(filename: string): { handler: string; source: string } {
  const source = readFileSync(resolve(process.cwd(), filename), "utf8")
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let handler = ""
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === "handleThumbnailChange" && node.initializer) {
      handler = node.initializer.getText(file)
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return { handler, source }
}

describe("Recipe/Recipeed cover change save boundary", () => {
  for (const [kind, filename, write] of [
    ["Recipe", "src/features/recipe/components/RecipeForm.tsx", "saveRecipeRows"],
    ["Recipeed", "src/components/items/PostForm.tsx", "savePostRow"],
  ] as const) {
    it(kind + " selection changes only local preview; cache updates after DB succeeds", () => {
      const { handler, source } = readCoverHandler(filename)
      // 업로드 후 사진 병합도 원래 UI 순서를 사용해야 index가 같은 사진을 가리킨다.
      expect(source).toContain("resolveImageUploadOrder(mainImages, uploadResults)")
      expect(handler).toContain("setThumbnailIndex(newIndex)")
      expect(handler).not.toContain("cacheManager.updateItem")
      expect(handler).not.toContain("supabase.auth.getUser")
      const committed = source.indexOf("dbCommitted = true")
      const database = source.indexOf("await " + write + "(")
      const cached = source.indexOf("await afterCommit(\"cache\", () => cacheManager.updateItem(itemId, fullItemPayload))")
      expect(database).toBeGreaterThan(0)
      expect(committed).toBeGreaterThan(database)
      expect(cached).toBeGreaterThan(committed)
    })
  }
})
