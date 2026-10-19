import { describe, expect, it, vi } from "vitest"
import { metadata as partnerHub } from "./page"
import { metadata as creatorLanding } from "./creators/page"
import { metadata as brandLanding } from "./brands/page"
import sitemap from "../sitemap"

vi.mock("./partner-landing", () => ({ default: () => null }))
vi.mock("@/shared/infra/supabase-public", () => ({ createSupabasePublicClient: () => ({}) }))
vi.mock("@/features/discovery/data/public-assets", () => ({
  fetchAllPublicDiscoveryItems: async () => [],
}))

describe("partner acquisition SEO contract", () => {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

  it("indexes the segment landings but not the legacy partner hub", () => {
    expect(partnerHub.robots).toMatchObject({ index: false, follow: true })
    for (const [page, route] of [
      [creatorLanding, "/partners/creators"],
      [brandLanding, "/partners/brands"],
    ] as const) {
      expect(page.robots).toMatchObject({ index: true, follow: true })
      expect(page.alternates?.canonical).toBe(`${siteUrl}${route}`)
    }
  })

  it("lists indexed segment URLs in the sitemap, never the noindex hub", async () => {
    const urls = (await sitemap()).map((item) => item.url)
    expect(urls).toContain(`${siteUrl}/partners/creators`)
    expect(urls).toContain(`${siteUrl}/partners/brands`)
    expect(urls).not.toContain(`${siteUrl}/partners`)
  })
})
