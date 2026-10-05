export type CreatorMigrationPayload = {
  name?: unknown
  email?: unknown
  instagramUrls?: unknown
  note?: unknown
  rightsConfirmed?: unknown
  website?: unknown
  sourcePath?: unknown
}

export type ValidCreatorMigrationRequest = {
  display_name: string
  email: string
  instagram_urls: string[]
  note: string | null
  rights_confirmed: true
  source_path: string
}

export function cleanMigrationValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export function normalizeInstagramContentUrl(value: unknown): string | null {
  const raw = cleanMigrationValue(value)
  if (!raw || raw.length > 1000) return null

  try {
    const url = new URL(raw)
    if (url.protocol !== "https:") return null

    const hostname = url.hostname.toLowerCase()
    if (hostname !== "instagram.com" && hostname !== "www.instagram.com") return null

    const parts = url.pathname.split("/").filter(Boolean)
    if (parts.length !== 2) return null

    const [kind, shortcode] = parts
    if (kind !== "p" && kind !== "reel" && kind !== "tv") return null
    if (!/^[A-Za-z0-9_-]+$/.test(shortcode)) return null

    return `https://www.instagram.com/${kind}/${shortcode}/`
  } catch {
    return null
  }
}

export function validateCreatorMigrationRequest(
  payload: CreatorMigrationPayload,
): ValidCreatorMigrationRequest | null {
  const name = cleanMigrationValue(payload.name)
  const email = cleanMigrationValue(payload.email).toLowerCase()
  const note = cleanMigrationValue(payload.note)
  const sourcePath = cleanMigrationValue(payload.sourcePath) || "/partners/creators"

  if (name.length < 2 || name.length > 80) return null
  if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  if (note.length > 1000) return null
  if (payload.rightsConfirmed !== true) return null
  if (sourcePath !== "/partners/creators") return null
  if (!Array.isArray(payload.instagramUrls)) return null
  if (payload.instagramUrls.length < 1 || payload.instagramUrls.length > 5) return null

  const normalized = payload.instagramUrls.map(normalizeInstagramContentUrl)
  if (normalized.some((url) => url === null)) return null

  const instagramUrls = Array.from(new Set(normalized as string[]))
  if (instagramUrls.length < 1 || instagramUrls.length > 5) return null

  return {
    display_name: name,
    email,
    instagram_urls: instagramUrls,
    note: note || null,
    rights_confirmed: true,
    source_path: sourcePath,
  }
}
