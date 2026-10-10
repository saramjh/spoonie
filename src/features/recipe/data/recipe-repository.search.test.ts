import { describe, expect, it } from "vitest"
import { searchCitableRecipes } from "./recipe-repository"

type Outcome = { data: unknown; error: Error | null }
type Call = { table: string; operation: string; arguments: unknown[] }

function clientFor(profiles: Outcome, items: Outcome) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const query = {
        select(...args: unknown[]) { calls.push({ table, operation: "select", arguments: args }); return query },
        ilike(...args: unknown[]) { calls.push({ table, operation: "ilike", arguments: args }); return query },
        eq(...args: unknown[]) { calls.push({ table, operation: "eq", arguments: args }); return query },
        or(...args: unknown[]) { calls.push({ table, operation: "or", arguments: args }); return query },
        limit(...args: unknown[]) { calls.push({ table, operation: "limit", arguments: args }); return query },
        async abortSignal(signal: AbortSignal) {
          calls.push({ table, operation: "abortSignal", arguments: [signal] })
          return table === "profiles" ? profiles : items
        },
      }
      return query
    },
  }
  return { client: client as unknown as Parameters<typeof searchCitableRecipes>[0], calls }
}

describe("searchCitableRecipes", () => {
  it("preserves RLS-visible recipe visibility and passes abort signal to both requests", async () => {
    const profiles = { data: [{ id: "author-id" }], error: null }
    const items = { data: [{
      id: "recipe-id", title: "감자전", created_at: "2026-10-10T00:00:00Z",
      item_type: "recipe", is_public: false, image_urls: ["image.jpg"], user_id: "author-id",
      cited_recipe_ids: [], author: [{ username: "부엌", public_id: "chef", avatar_url: null }],
    }], error: null }
    const { client, calls } = clientFor(profiles, items)
    const signal = new AbortController().signal
    const rows = await searchCitableRecipes(client, "감자전", signal)
    expect(rows.map((row) => [row.id, row.title, row.username, row.user_public_id, row.is_public])).toEqual([
      ["recipe-id", "감자전", "부엌", "chef", false],
    ])
    expect(calls.filter((c) => c.operation === "abortSignal").map((c) => c.arguments[0])).toEqual([signal, signal])
    expect(calls.some((call) => call.table === "items" && call.operation === "eq" && call.arguments[0] === "is_public")).toBe(false)
    expect(calls.find((call) => call.table === "items" && call.operation === "select")?.arguments[0]).toContain("is_public")
    expect(calls).toContainEqual({ table: "items", operation: "eq", arguments: ["item_type", "recipe"] })
    expect(calls).toContainEqual({ table: "items", operation: "or", arguments: ["title.ilike.%감자전%,user_id.in.(author-id)"] })
    expect(calls.filter((c) => c.operation === "limit").map((c) => c.arguments[0])).toEqual([10, 10])
  })

  it("returns an empty list with no matching author and no recipe", async () => {
    const { client, calls } = clientFor({ data: [], error: null }, { data: [], error: null })
    expect(await searchCitableRecipes(client, "감자", new AbortController().signal)).toEqual([])
    expect(calls).toContainEqual({ table: "items", operation: "or", arguments: ["title.ilike.%감자%"] })
  })

  it("stops before searching items when profile lookup fails", async () => {
    const { client, calls } = clientFor({ data: null, error: new Error("lookup failed") }, { data: [], error: null })
    await expect(searchCitableRecipes(client, "감자", new AbortController().signal)).rejects.toThrow("lookup failed")
    expect(calls.some((c) => c.table === "items")).toBe(false)
  })

  it("surfaces item search errors rather than displaying an empty result", async () => {
    const { client } = clientFor({ data: [], error: null }, { data: null, error: new Error("filter rejected") })
    await expect(searchCitableRecipes(client, "감자", new AbortController().signal)).rejects.toThrow("filter rejected")
  })
})
