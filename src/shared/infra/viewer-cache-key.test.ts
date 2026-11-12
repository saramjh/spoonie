import { describe, expect, it } from "vitest"
import { itemOverlayKey, viewerCacheKey, viewerOwnsListCache } from "./viewer-cache-key"

describe("viewer-scoped RLS cache keys", () => {
  it("separates the same resource across user accounts and guests", () => {
    const keys = ["alice", "bob", null].map(user => viewerCacheKey("cited", "a,b", user, false))
    expect(keys).toEqual([["cited", "alice", "a,b"], ["cited", "bob", "a,b"], ["cited", "guest", "a,b"]])
    expect(new Set(keys.map(value => JSON.stringify(value))).size).toBe(3)
  })
  it("does not fetch before auth or with an empty resource", () => {
    expect(viewerCacheKey("detail", "id", null, true)).toBeNull()
    expect(viewerCacheKey("relation", "", "alice", false)).toBeNull()
    expect(viewerCacheKey("detail", undefined, "alice", false)).toBeNull()
  })
  it("preserves resource and namespace isolation", () => {
    expect(viewerCacheKey("detail", "a", "alice", false)).not.toEqual(viewerCacheKey("detail", "b", "alice", false))
    expect(viewerCacheKey("detail", "a", "alice", false)).not.toEqual(viewerCacheKey("relation", "a", "alice", false))
  })
})

describe("optimistic item UI cache keys", () => {
  it("keeps the same post's likes and bookmarks separate for guest and both accounts", () => {
    expect(itemOverlayKey("item-a", "alice")).toBe("itemDetail|alice|item-a")
    expect(itemOverlayKey("item-a", "bob")).toBe("itemDetail|bob|item-a")
    expect(itemOverlayKey("item-a", null)).toBe("itemDetail|guest|item-a")
  })
})

describe("personalized list cache ownership", () => {
  it("selects only the active viewer's paged list keys", () => {
    expect(viewerOwnsListCache("items|0|alice", "alice")).toBe(true)
    expect(viewerOwnsListCache("items|1|bob", "alice")).toBe(false)
    expect(viewerOwnsListCache("recipes||my_recipes||0||new||desc||||all||none||alice", "alice")).toBe(true)
    expect(viewerOwnsListCache("recipes||my_recipes||0||new||desc||||all||none||bob", "alice")).toBe(false)
    expect(viewerOwnsListCache("bookmarks_alice", "alice")).toBe(true)
    expect(viewerOwnsListCache("user_items_author_alice", "alice")).toBe(true)
    expect(viewerOwnsListCache("explore|v2", "alice")).toBe(false)
    expect(viewerOwnsListCache("items|0|guest", null)).toBe(true)
  })
})
