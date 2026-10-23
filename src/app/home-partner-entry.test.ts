import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("@/features/feed/data/server-data", () => ({
  getPublicFeedData: vi.fn().mockResolvedValue(null),
}))
vi.mock("@/components/items/SeamlessItemList", () => ({
  default: () => null,
}))
vi.mock("@/components/items/PostCardSkeleton", () => ({
  default: () => null,
}))

import HomePage from "./page"

describe("home partner entry discoverability", () => {
  it("renders normal accessible creator and brand links before the feed", async () => {
    const markup = renderToStaticMarkup(await HomePage())
    const navStart = markup.indexOf('aria-label="Spoonie 크리에이터와 브랜드 이용 안내"')
    const creatorLink = markup.indexOf('href="/partners/creators"')
    const brandLink = markup.indexOf('href="/partners/brands"')
    expect(navStart).toBeGreaterThan(-1)
    expect(creatorLink).toBeGreaterThan(navStart)
    expect(brandLink).toBeGreaterThan(creatorLink)
    expect(markup).toContain("요리 크리에이터 안내")
    expect(markup).toContain("식품·주방 브랜드 안내")
  })
})
