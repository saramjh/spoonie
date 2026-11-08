/** Only the explicitly marked closing line moves below the recipe steps. */
export function splitKitchenEditorialFooter(description: string | null | undefined): { body: string; note: string | null } {
  const text = description ?? ''
  const marker = /(?:^|\n)\s*출처·안내:\s*([^\n]{1,500})\s*$/u.exec(text)
  return marker
    ? { body: text.slice(0, marker.index).trimEnd(), note: marker[1].trim() }
    : { body: text, note: null }
}

/**
 * 외부 원작 레시피의 공개 출처를 기존 description 데이터에서 안전하게 분리한다.
 * 기존 Spoonie Kitchen 게시기/DB 스키마는 변경하지 않는다.
 * 인식할 수 없는 기존 문구는 절대 잘라내지 않는다.
 */
export interface ExternalRecipeSource {
  creator: string
  url: string
}

export interface ParsedRecipeDescription {
  description: string
  source: ExternalRecipeSource | null
}

function validUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null
    return url.href
  } catch { return null }
}

function readSourceFooter(text: string): ParsedRecipeDescription | null {

  // New and existing source-footer format. Keep all image/licence notes after the first URL.
  const footer = /(?:^|\n\n)출처·안내:\s*([^\n]+)$/u.exec(text)
  if (footer) {
    const match = /^(.+?)\s*·\s*(https?:\/\/\S+?)(?=\s*·|\s*$)/u.exec(footer[1])
    if (match) {
      const creator = match[1].replace(/^원작자:\s*/u, "").trim()
      const url = validUrl(match[2])
      if (creator && url) {
        const notes = footer[1].slice(match[0].length).replace(/^\s*·\s*/u, "").trim()
        return { description: [text.slice(0, footer.index).trim(), notes].filter(Boolean).join("\n\n"), source: { creator, url } }
      }
    }
  }

  // The already-published first recipe used separate "원작자" / "원문" lines.
  const legacy = /(?:^|\n\n)원작자:\s*([^\n]+)\n원문:\s*(https?:\/\/[^\s]+)/u.exec(text)
  if (legacy) {
    const url = validUrl(legacy[2])
    if (url) {
      const before = text.slice(0, legacy.index).trim()
      const after = text.slice(legacy.index + legacy[0].length).trim()
      return { description: [before, after].filter(Boolean).join("\n\n"), source: { creator: legacy[1].trim(), url } }
    }
  }
  return null
}

export function parseRecipeDescription(value: string | null | undefined): ParsedRecipeDescription {
  const original = value ?? ""
  const parsed = readSourceFooter(original)
  if (parsed) return parsed

  // The old publisher could escape line breaks, including the source markers.
  // Decode only as a fallback for those records so literal \n in current prose survives.
  if (original.includes("\\n\\n출처·안내:") || original.includes("\\n원문:")) {
    const legacy = readSourceFooter(original.replace(/\\n/g, "\n"))
    if (legacy) return legacy
  }
  return { description: original, source: null }
}

export function serializeRecipeDescription(description: string, creator?: string, sourceUrl?: string): string {
  const name = creator?.trim()
  if (!name && !sourceUrl?.trim()) return description
  if (!name || !sourceUrl?.trim()) throw new Error("원작자와 원문 주소를 함께 입력해주세요.")
  if (/[\r\n]|\\n|·\s*https?:\/\//iu.test(name)) {
    throw new Error("원작자 또는 사이트 이름만 적고 링크는 원문 주소에 입력해 주세요.")
  }
  const url = validUrl(sourceUrl.trim())
  if (!url) throw new Error("외부 원문 주소는 올바른 http(s) 링크여야 합니다.")
  const parsed = parseRecipeDescription(description)
  return [parsed.description.trim(), `출처·안내: ${name} · ${url}`].filter(Boolean).join("\n\n")
}
