import { afterEach, describe, expect, it } from "vitest"
import { cache } from "swr/_internal"
import { updateStartingWith } from "./swr-cache"

// Use SWR's actual default cache rather than a mocked mutate implementation.
// Verify the app's v2.3.4 infinite-key contract and viewer filtering.
const names = [
  "$inf$items|0|alice",
  "items|0|alice",
  "$inf$items|0|bob",
  "items|0|bob",
  "unrelated",
]
afterEach(() => { for (const name of names) cache.delete(name) })

describe("SWR 2.3.4 infinite list cache compatibility", () => {
  it("patches the mounted-style infinite data once and isolates a different viewer", async () => {
    const a = [{ id: "a", is_liked: false }]
    const b = [{ id: "a", is_liked: false }]
    cache.set(names[0], { data: [a] })
    cache.set(names[1], { data: a })
    cache.set(names[2], { data: [b] })
    cache.set(names[3], { data: b })
    cache.set(names[4], { data: "not a list" })
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
    expect((cache.get(names[2]) as { data: typeof b[] }).data[0][0].is_liked).toBe(false)
    expect((cache.get(names[4]) as { data: string }).data).toBe("not a list")
  })
})
