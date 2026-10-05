export type PartnerActorType = "creator" | "brand"
export type PartnerSourceType = "instagram_post" | "instagram_reel" | "instagram_tv" | "web"

export type PartnerOnboardingPayload = {
  actorType?: unknown
  sourceUrls?: unknown
  note?: unknown
  rightsConfirmed?: unknown
  sourcePath?: unknown
}

export type ValidPartnerOnboardingRequest = {
  actorType: PartnerActorType
  sources: Array<{ sourceType: PartnerSourceType; sourceUrl: string }>
  note: string | null
  rightsConfirmed: true
  sourcePath: "/partners/creators" | "/partners/brands"
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function isPrivateIpv4(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!match) return false
  const parts = match.slice(1).map(Number)
  if (parts.some((part) => part < 0 || part > 255)) return true
  const [a, b] = parts
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  )
}

function normalizeInstagramUrl(url: URL) {
  const hostname = url.hostname.toLowerCase()
  if (hostname !== "instagram.com" && hostname !== "www.instagram.com") return null

  const parts = url.pathname.split("/").filter(Boolean)
  if (parts.length !== 2) return null

  const [kind, shortcode] = parts
  if (kind !== "p" && kind !== "reel" && kind !== "tv") return null
  if (!/^[A-Za-z0-9_-]+$/.test(shortcode)) return null

  const sourceType: PartnerSourceType =
    kind === "p" ? "instagram_post" : kind === "reel" ? "instagram_reel" : "instagram_tv"

  return {
    sourceType,
    sourceUrl: `https://www.instagram.com/${kind}/${shortcode}/`,
  }
}

export function normalizePartnerSourceUrl(
  value: unknown,
  actorType: PartnerActorType,
): { sourceType: PartnerSourceType; sourceUrl: string } | null {
  const raw = clean(value)
  if (!raw || raw.length > 1000) return null

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  if (url.protocol !== "https:" || url.username || url.password) return null

  const instagram = normalizeInstagramUrl(url)
  if (instagram) return instagram
  if (actorType === "creator") return null

  const hostname = url.hostname.toLowerCase()
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname === "::1" ||
    isPrivateIpv4(hostname)
  ) {
    return null
  }

  url.hash = ""
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || key === "fbclid" || key === "igsh") {
      url.searchParams.delete(key)
    }
  }

  return { sourceType: "web", sourceUrl: url.toString() }
}

export function validatePartnerOnboardingRequest(
  payload: PartnerOnboardingPayload,
): ValidPartnerOnboardingRequest | null {
  const actorType = clean(payload.actorType) as PartnerActorType
  if (actorType !== "creator" && actorType !== "brand") return null

  const expectedPath = actorType === "creator" ? "/partners/creators" : "/partners/brands"
  const sourcePath = clean(payload.sourcePath)
  if (sourcePath !== expectedPath) return null

  if (payload.rightsConfirmed !== true) return null

  const note = clean(payload.note)
  if (note.length > 1000) return null

  if (!Array.isArray(payload.sourceUrls)) return null
  if (payload.sourceUrls.length < 1 || payload.sourceUrls.length > 5) return null

  const normalized = payload.sourceUrls.map((value) => normalizePartnerSourceUrl(value, actorType))
  if (normalized.some((source) => source === null)) return null

  const unique = Array.from(
    new Map(
      (normalized as NonNullable<(typeof normalized)[number]>[]).map((source) => [
        source.sourceUrl,
        source,
      ]),
    ).values(),
  )

  if (unique.length < 1 || unique.length > 5) return null

  return {
    actorType,
    sources: unique,
    note: note || null,
    rightsConfirmed: true,
    sourcePath: expectedPath,
  }
}
