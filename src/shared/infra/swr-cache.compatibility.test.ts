import { afterEach, describe, expect, it } from "vitest"
import { cache } from "swr/_internal"
import { updateStartingWith } from "./swr-cache"

// Use SWR's actual default cache rather than a mocked mutate implementation.
// Verify the app's v2.3.4 infinite-key contract and viewer filtering.
const names = [
  "$inf$items|0|alice",
  "items|0|alice",
  "items|1|alice",
  "$inf$items|0|bob",
  "items|0|bob",
  "unrelated",
]
afterEach(() => { for (const name of names) cache.delete(name) })

describe("SWR 2.3.4 infinite list cache compatibility", () => {
  it("patches the mounted-style infinite data once and isolates a different viewer", async () => {
    const a = [{ id: "a", is_liked: false }]
    const aSecond = [{ id: "a2", is_liked: false }]
    const b = [{ id: "a", is_liked: false }]
    cache.set(names[0], { data: [a, aSecond] })
    cache.set(names[1], { data: a })
    cache.set(names[2], { data: aSecond })
    cache.set(names[3], { data: [b] })
    cache.set(names[4], { data: b })
    cache.set(names[5], { data: "not a list" })
    let updates = 0
    await updateStartingWith(
      ["items|"],
      (data) => {
        updates++
        return (data as typeof a[]).map(page => page.map(row => ({ ...row, is_liked: true })))
      },
      key => key.endsWith("|alice"),
    )
    expect(updates).toBe(1)
    expect((cache.get(names[0]) as { data: typeof a[] }).data[0][0].is_liked).toBe(true)
    expect((cache.get(names[0]) as { data: typeof a[] }).data[1][0].is_liked).toBe(true)
    expect((cache.get(names[3]) as { data: typeof b[] }).data[0][0].is_liked).toBe(false)
    expect((cache.get(names[5]) as { data: string }).data).toBe("not a list")
  })
  it("treats page 2 of the recipe-book infinite cache as part of its first-page container", async () => {
    const first = "recipes||my_recipes||0||new||desc||||all||none||alice"
    const second = "recipes||my_recipes||1||new||desc||||all||none||alice"
    const container = "$inf$" + first
    try {
      cache.set(container, { data: [[{ id: "first" }], [{ id: "second" }]] })
      cache.set(first, { data: [{ id: "first" }] })
      cache.set(second, { data: [{ id: "second" }] })
      let updates = 0
      await updateStartingWith(["recipes||"], data => { updates++; return data }, key => key.endsWith("||alice"))
      expect(updates).toBe(1)
    } finally {
      for (const key of [container, first, second]) cache.delete(key)
    }
  })

})
