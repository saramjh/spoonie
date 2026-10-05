import { describe, expect, it } from "vitest"
import {
  normalizePartnerSourceUrl,
  validatePartnerOnboardingRequest,
} from "./validation"

describe("partner onboarding validation", () => {
  it("accepts creator Instagram posts/reels and canonicalizes tracking", () => {
    expect(
      validatePartnerOnboardingRequest({
        actorType: "creator",
        sourceUrls: [
          "https://instagram.com/p/ABC123/?utm_source=share",
          "https://www.instagram.com/reel/XYZ789/?igsh=foo",
        ],
        note: "대표 두 개부터",
        rightsConfirmed: true,
        sourcePath: "/partners/creators",
      }),
    ).toEqual({
      actorType: "creator",
      sources: [
        { sourceType: "instagram_post", sourceUrl: "https://www.instagram.com/p/ABC123/" },
        { sourceType: "instagram_reel", sourceUrl: "https://www.instagram.com/reel/XYZ789/" },
      ],
      note: "대표 두 개부터",
      rightsConfirmed: true,
      sourcePath: "/partners/creators",
    })
  })

  it("accepts owned brand web recipe sources and removes obvious tracking", () => {
    expect(
      validatePartnerOnboardingRequest({
        actorType: "brand",
        sourceUrls: [
          "https://brand.example/recipes/soup?utm_source=instagram&variant=hot#howto",
          "https://www.instagram.com/p/BRAND1/",
        ],
        note: "",
        rightsConfirmed: true,
        sourcePath: "/partners/brands",
      }),
    ).toEqual({
      actorType: "brand",
      sources: [
        { sourceType: "web", sourceUrl: "https://brand.example/recipes/soup?variant=hot" },
        { sourceType: "instagram_post", sourceUrl: "https://www.instagram.com/p/BRAND1/" },
      ],
      note: null,
      rightsConfirmed: true,
      sourcePath: "/partners/brands",
    })
  })

  it("requires account-segment path consistency and explicit rights", () => {
    expect(
      validatePartnerOnboardingRequest({
        actorType: "creator",
        sourceUrls: ["https://www.instagram.com/p/ABC/"],
        rightsConfirmed: false,
        sourcePath: "/partners/creators",
      }),
    ).toBeNull()

    expect(
      validatePartnerOnboardingRequest({
        actorType: "creator",
        sourceUrls: ["https://www.instagram.com/p/ABC/"],
        rightsConfirmed: true,
        sourcePath: "/partners/brands",
      }),
    ).toBeNull()
  })

  it("rejects creator non-Instagram sources and unsafe local/private URLs", () => {
    expect(normalizePartnerSourceUrl("https://example.com/recipe", "creator")).toBeNull()
    expect(normalizePartnerSourceUrl("http://example.com/recipe", "brand")).toBeNull()
    expect(normalizePartnerSourceUrl("https://localhost/recipe", "brand")).toBeNull()
    expect(normalizePartnerSourceUrl("https://127.0.0.1/recipe", "brand")).toBeNull()
    expect(normalizePartnerSourceUrl("https://10.1.2.3/recipe", "brand")).toBeNull()
  })

  it("requires one to five unique sources and bounds note length", () => {
    const base = {
      actorType: "brand" as const,
      rightsConfirmed: true,
      sourcePath: "/partners/brands",
    }

    expect(validatePartnerOnboardingRequest({ ...base, sourceUrls: [] })).toBeNull()
    expect(
      validatePartnerOnboardingRequest({
        ...base,
        sourceUrls: Array.from({ length: 6 }, (_, i) => `https://example.com/r/${i}`),
      }),
    ).toBeNull()
    expect(
      validatePartnerOnboardingRequest({
        ...base,
        sourceUrls: ["https://example.com/r/1"],
        note: "x".repeat(1001),
      }),
    ).toBeNull()
  })
})
