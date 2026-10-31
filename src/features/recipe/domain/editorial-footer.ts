/** Only the explicitly marked closing line moves below the recipe steps. */
export function splitKitchenEditorialFooter(description: string | null | undefined): { body: string; note: string | null } {
  const text = description ?? ''
  const marker = /(?:^|\n)\s*출처·안내:\s*([^\n]{1,500})\s*$/u.exec(text)
  return marker
    ? { body: text.slice(0, marker.index).trimEnd(), note: marker[1].trim() }
    : { body: text, note: null }
}
