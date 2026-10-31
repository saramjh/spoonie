/** Text supplied by members stays text; only explicit HTTP(S)/www URLs become anchors. */
export type TextLinkSegment = { text: string; href?: string }

const URL_CANDIDATE = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi
const TRAILING_PUNCTUATION = /[.,!?;:，。！？]$/u

function peelEnd(candidate: string): [string, string] {
  let link = candidate
  let suffix = ''
  while (link) {
    const last = link.at(-1)!
    const mismatchedClose = ([['(', ')'], ['[', ']'], ['{', '}']] as const)
      .some(([open, close]) => last === close && link.split(close).length > link.split(open).length)
    if (!TRAILING_PUNCTUATION.test(last) && !mismatchedClose) break
    suffix = last + suffix
    link = link.slice(0, -1)
  }
  return [link, suffix]
}

function linkHref(raw: string): string | null {
  const href = raw.startsWith('www.') ? `https://${raw}` : raw
  try {
    const parsed = new URL(href)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password && parsed.hostname.includes('.') ? href : null
  } catch {
    return null
  }
}

export function tokenizeTextLinks(text: string): TextLinkSegment[] {
  const segments: TextLinkSegment[] = []
  const append = (part: TextLinkSegment) => {
    if (part.text && !part.href && segments.length && !segments.at(-1)?.href) segments[segments.length - 1].text += part.text
    else if (part.text) segments.push(part)
  }
  let from = 0
  for (const match of text.matchAll(URL_CANDIDATE)) {
    const start = match.index
    if (start > from) append({ text: text.slice(from, start) })
    const [link, end] = peelEnd(match[0])
    const href = linkHref(link)
    append(href ? { text: link, href } : { text: link })
    if (end) append({ text: end })
    from = start + match[0].length
  }
  if (from < text.length) append({ text: text.slice(from) })
  return segments
}

/** Never claims a URL is safe. Only distinguishes a first-party navigation. */
export function externalLinkDestination(href: string, currentHref: string): URL | null {
  try {
    const url = new URL(href, currentHref)
    const current = new URL(currentHref)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    const host = (value: URL) => value.hostname.toLowerCase().replace(/^www\./, '')
    const ownSpoonie = host(url) === 'spoonie.kr' && host(current) === 'spoonie.kr' && url.protocol === 'https:'
    return url.origin === current.origin || ownSpoonie ? null : url
  } catch {
    return null
  }
}
