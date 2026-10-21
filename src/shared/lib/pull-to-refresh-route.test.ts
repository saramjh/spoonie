import { describe, expect, it } from "vitest"
import { canPullToRefresh } from "./pull-to-refresh-route"

describe("pull-to-refresh ownership", () => {
  it.each(["/", "/recipes", "/search", "/bookmarks", "/notifications", "/profile/author"])(
    "keeps list screen %s refreshable", (path) => expect(canPullToRefresh(path)).toBe(true),
  )
  it.each(["/recipes/new", "/recipes/abc/edit", "/posts/new", "/posts/abc/edit", "/profile/author/edit", "/login", "/signup", "/partners", "/early-cooks", "/recipes/abc"])(
    "keeps %s scroll gesture native", (path) => expect(canPullToRefresh(path)).toBe(false),
  )
})
