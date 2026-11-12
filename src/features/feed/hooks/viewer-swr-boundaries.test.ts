import { afterEach, describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import useSWR from "swr"
import { useItemDetail } from "./useItemDetail"
import { useCitedRecipes, useRecipeRelations } from "@/features/recipe/hooks/useCitedRecipes"

const viewer = vi.hoisted(() => ({ id: null as string | null, loading: true }))
vi.mock("@/store/sessionStore", () => ({
  useSessionStore: (selector: (state: { session: { id: string } | null; isInitialLoad: boolean }) => unknown) =>
    selector({ session: viewer.id ? { id: viewer.id } : null, isInitialLoad: viewer.loading }),
}))
vi.mock("swr", () => ({
  default: vi.fn(() => ({ data: undefined, mutate: vi.fn(), isLoading: false, error: null })),
}))
vi.mock("@/shared/infra/supabase-client", () => ({ createSupabaseBrowserClient: vi.fn() }))

function Inspect() {
  useItemDetail("item-a", null)
  useCitedRecipes(["recipe-z", "recipe-a"])
  useRecipeRelations("recipe-a")
  return createElement("span", null, "ok")
}
function getKeys() {
  vi.mocked(useSWR).mockClear()
  renderToStaticMarkup(createElement(Inspect))
  return vi.mocked(useSWR).mock.calls.map(([key]) => key)
}

afterEach(() => { viewer.id = null; viewer.loading = true })

describe("viewer scoped SWR hook integration", () => {
  it("suppresses private-data fetches while checking the active viewer", () => {
    expect(getKeys()).toEqual([null, null, null])
  })
  it("changes all RLS data cache entries when the viewer changes", () => {
    viewer.loading = false
    viewer.id = "alice"
    expect(getKeys()).toEqual([
      ["item_details", "alice", "item-a"],
      ["cited-recipes", "alice", "recipe-a,recipe-z"],
      ["recipe-relations", "alice", "recipe-a"],
    ])
    viewer.id = "bob"
    expect(getKeys().map(key => Array.isArray(key) ? key[1] : null)).toEqual(["bob", "bob", "bob"])
    viewer.id = null
    expect(getKeys().map(key => Array.isArray(key) ? key[1] : null)).toEqual(["guest", "guest", "guest"])
  })
})
