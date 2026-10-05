import "server-only"

import { lookup } from "node:dns/promises"
import { request as httpsRequest } from "node:https"
import { isIP, type LookupFunction } from "node:net"

const HTML_LIMIT = 2 * 1024 * 1024
const IMAGE_LIMIT = 10 * 1024 * 1024
const REDIRECT_LIMIT = 3
const FETCH_TIMEOUT_MS = 7000

export class OnboardingSourceFetchError extends Error {
  permanent: boolean

  constructor(message: string, permanent = false) {
    super(message)
    this.name = "OnboardingSourceFetchError"
    this.permanent = permanent
  }
}

function privateIpv4(address: string) {
  const parts = address.split(".").map(Number)
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true
  }
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

function privateIpv6(address: string) {
  const value = address.toLowerCase()
  if (value === "::" || value === "::1") return true
  if (
    value.startsWith("fc") ||
    value.startsWith("fd") ||
    value.startsWith("fe8") ||
    value.startsWith("fe9") ||
    value.startsWith("fea") ||
    value.startsWith("feb")
  ) {
    return true
  }
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return mapped ? privateIpv4(mapped[1]) : false
}

async function publicAddress(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new OnboardingSourceFetchError("invalid source URL", true)
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new OnboardingSourceFetchError("source must use public HTTPS", true)
  }
  if (url.port && url.port !== "443") {
    throw new OnboardingSourceFetchError("non-standard HTTPS ports are not supported", true)
  }

  const hostname = url.hostname.toLowerCase()
  if (!hostname || hostname === "localhost" || hostname.endsWith(".local")) {
    throw new OnboardingSourceFetchError("local source host is not allowed", true)
  }

  const literalFamily = isIP(hostname)
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await lookup(hostname, { all: true, verbatim: true }).catch(() => {
        throw new OnboardingSourceFetchError("source host could not be resolved")
      })

  const address = addresses.find(
    (entry) =>
      (entry.family === 4 && !privateIpv4(entry.address)) ||
      (entry.family === 6 && !privateIpv6(entry.address)),
  )
  if (!address) {
    throw new OnboardingSourceFetchError("private source address is not allowed", true)
  }

  return { url, address }
}

type RawResponse = {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: Uint8Array
}

function fetchPinned(
  url: URL,
  address: { address: string; family: number },
  accept: string,
  limit: number,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      if (options.all) {
        callback(null, [{ address: address.address, family: address.family }])
        return
      }
      callback(null, address.address, address.family)
    }

    const req = httpsRequest(
      url,
      {
        method: "GET",
        lookup: pinnedLookup,
        headers: {
          Accept: accept,
          "User-Agent": "Spoonie/1.0 (+https://spoonie.kr)",
        },
      },
      (response) => {
        const declared = Number(response.headers["content-length"] || "0")
        if (declared > limit) {
          response.destroy()
          reject(new OnboardingSourceFetchError("source response is too large", true))
          return
        }

        response.on("data", (chunk: Buffer) => {
          size += chunk.length
          if (size > limit) {
            response.destroy()
            reject(new OnboardingSourceFetchError("source response is too large", true))
            return
          }
          chunks.push(chunk)
        })
        response.on("end", () => {
          resolve({
            status: response.statusCode || 0,
            headers: response.headers,
            body: new Uint8Array(Buffer.concat(chunks)),
          })
        })
      },
    )

    req.setTimeout(FETCH_TIMEOUT_MS, () => {
      req.destroy(new OnboardingSourceFetchError("source request timed out"))
    })
    req.on("error", (error) => {
      reject(
        error instanceof OnboardingSourceFetchError
          ? error
          : new OnboardingSourceFetchError(error.message || "source request failed"),
      )
    })
    req.end()
  })
}

async function safeFetch(raw: string, accept: string, limit: number) {
  let current = raw
  for (let redirect = 0; redirect <= REDIRECT_LIMIT; redirect += 1) {
    const target = await publicAddress(current)
    const response = await fetchPinned(target.url, target.address, accept, limit)

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.location
      const nextLocation = Array.isArray(location) ? location[0] : location
      if (!nextLocation || redirect === REDIRECT_LIMIT) {
        throw new OnboardingSourceFetchError("source redirected too many times")
      }
      current = new URL(nextLocation, target.url).toString()
      continue
    }

    if (response.status === 404 || response.status === 410) {
      throw new OnboardingSourceFetchError("source returned " + response.status, true)
    }
    if (response.status < 200 || response.status >= 300) {
      throw new OnboardingSourceFetchError("source returned " + response.status)
    }
    return { response, finalUrl: target.url.toString() }
  }
  throw new OnboardingSourceFetchError("source redirect loop")
}

export async function fetchOnboardingHtml(url: string) {
  const { response, finalUrl } = await safeFetch(
    url,
    "text/html,application/xhtml+xml",
    HTML_LIMIT,
  )
  const rawType = response.headers["content-type"]
  const type = (Array.isArray(rawType) ? rawType[0] : rawType || "").toLowerCase()
  if (!type.includes("text/html") && !type.includes("application/xhtml+xml")) {
    throw new OnboardingSourceFetchError("source is not an HTML page", true)
  }
  return { html: new TextDecoder().decode(response.body), finalUrl }
}

export async function fetchOnboardingImage(url: string) {
  const { response } = await safeFetch(
    url,
    "image/avif,image/webp,image/jpeg,image/png",
    IMAGE_LIMIT,
  )
  const rawType = response.headers["content-type"]
  const type = (Array.isArray(rawType) ? rawType[0] : rawType || "")
    .split(";")[0]
    .trim()
    .toLowerCase()
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(type)) {
    throw new OnboardingSourceFetchError("source image type is not supported", true)
  }
  return { body: response.body, contentType: type }
}
