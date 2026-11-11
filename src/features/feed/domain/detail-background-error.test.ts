import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { useItemDetail } from "@/features/feed/hooks/useItemDetail"
import RecipeDetailClient from "@/app/recipes/[id]/RecipeDetailClient"
import PostDetailClient from "@/app/posts/[id]/PostDetailClient"

vi.mock("@/features/feed/hooks/useItemDetail", () => ({ useItemDetail: vi.fn() }))
vi.mock("@/components/common/ItemDetailView", () => ({
  default: () => "VALID_CACHED_ITEM",
}))
vi.mock("@/components/common/DetailStateMessage", () => ({
  default: ({ title }: { title: string }) => "ERROR_SCREEN:" + title,
}))
vi.mock("@/components/common/RouteLoading", () => ({
  DetailLoading: () => "SKELETON",
}))

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}))
afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks() })

describe("detail stale-while-revalidate contract", () => {
  for (const [kind, Component] of [
    ["recipe", RecipeDetailClient],
    ["post", PostDetailClient],
  ] as const) {
    it(kind + " preserves an already loaded item during background network errors", () => {
      const item = { id: "visible", item_type: kind }
      vi.mocked(useItemDetail).mockReturnValue({
        item, isLoading: false, error: new Error("temporary network failure"), refresh: vi.fn(),
      } as never)
      const html = renderToStaticMarkup(createElement(Component, { params: { id: "visible" }, initialItem: item as never }))
      expect(html).toContain("VALID_CACHED_ITEM")
      expect(html).not.toContain("ERROR_SCREEN")
    })

    it(kind + " hides stale data when permission or existence is revoked", () => {
      const item = { id: "visible", item_type: kind }
      vi.mocked(useItemDetail).mockReturnValue({
        item, isLoading: false, error: Object.assign(new Error("access denied"), { code: "PGRST116" }), refresh: vi.fn(),
      } as never)
      const html = renderToStaticMarkup(createElement(Component, { params: { id: "visible" }, initialItem: item as never }))
      expect(html).toContain("ERROR_SCREEN")
      expect(html).not.toContain("VALID_CACHED_ITEM")
    })

    it(kind + " displays an error if data was never loaded", () => {
      vi.mocked(useItemDetail).mockReturnValue({
        item: undefined, isLoading: false, error: new Error("temporary network failure"), refresh: vi.fn(),
      } as never)
      const html = renderToStaticMarkup(createElement(Component, { params: { id: "unavailable" } }))
      expect(html).toContain("ERROR_SCREEN")
    })
  }
})
