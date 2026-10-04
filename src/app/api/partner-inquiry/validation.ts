export type PartnerSegment = "creator" | "brand"

export type InquiryPayload = {
  segment?: unknown
  name?: unknown
  email?: unknown
  organization?: unknown
  profileUrl?: unknown
  message?: unknown
  website?: unknown
  sourcePath?: unknown
}

export type ValidInquiry = {
  segment: PartnerSegment
  name: string
  email: string
  organization: string | null
  profile_url: string | null
  message: string
  source_path: string
}

export function cleanInquiryValue(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function validOptionalUrl(value: string) {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

export function validatePartnerInquiry(payload: InquiryPayload): ValidInquiry | null {
  const segment = payload.segment
  const name = cleanInquiryValue(payload.name)
  const email = cleanInquiryValue(payload.email).toLowerCase()
  const organization = cleanInquiryValue(payload.organization)
  const profileUrl = cleanInquiryValue(payload.profileUrl)
  const message = cleanInquiryValue(payload.message)
  const sourcePath = cleanInquiryValue(payload.sourcePath) || "/partners"

  if (segment !== "creator" && segment !== "brand") return null
  if (name.length < 2 || name.length > 80) return null
  if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  if (organization.length > 120) return null
  if (profileUrl.length > 500 || !validOptionalUrl(profileUrl)) return null
  if (message.length < 10 || message.length > 1500) return null
  if (sourcePath.length > 120 || !sourcePath.startsWith("/partners")) return null

  return {
    segment,
    name,
    email,
    organization: organization || null,
    profile_url: profileUrl || null,
    message,
    source_path: sourcePath,
  }
}
