import { describe, expect, it } from "vitest"
import { viewerCacheKey } from "./viewer-cache-key"

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
