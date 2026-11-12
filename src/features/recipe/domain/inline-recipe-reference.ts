import type { JSONContent } from "@tiptap/core"

// Store references as plain text tokens. Database text columns, drafts, and
// existing prose remain valid; only a UUID is authoritative, never a title/URL.
const TOKEN = /\[\[recipe:([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})\]\]/gi

export type RecipeTextPart = { text: string; recipeId?: never } | { recipeId: string; text?: never }

export function isRecipeReferenceId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value)
}

export function splitRecipeReferences(value: string): RecipeTextPart[] {
  const parts: RecipeTextPart[] = []
  let previous = 0
  for (const match of value.matchAll(TOKEN)) {
    if (match.index > previous) parts.push({ text: value.slice(previous, match.index) })
    parts.push({ recipeId: match[1].toLowerCase() })
    previous = match.index + match[0].length
  }
  if (previous < value.length) parts.push({ text: value.slice(previous) })
  return parts
}

export function recipeReferenceIds(values: string | string[]): string[] {
  const ids = new Set<string>()
  for (const value of Array.isArray(values) ? values : [values]) {
    for (const part of splitRecipeReferences(value)) {
      if (part.recipeId) ids.add(part.recipeId)
      if (ids.size === 40) return Array.from(ids)
    }
  }
  return Array.from(ids)
}

export function recipeToken(id: string): string {
  return "[[recipe:" + id.toLowerCase() + "]]"
}

// Treat one newline in a former Textarea as one editor paragraph boundary.
// Inline references are atomic nodes; old plain prose is otherwise untouched.
export function storedTextToDoc(value: string): JSONContent {
  return {
    type: "doc",
    content: value.split("\n").map(line => ({
      type: "paragraph",
      content: splitRecipeReferences(line).map(part =>
        part.recipeId
          ? { type: "recipeMention", attrs: { recipeId: part.recipeId } }
          : { type: "text", text: part.text }
      ),
    })),
  }
}

export function docToStoredText(doc: JSONContent): string {
  return (doc.content ?? []).map(block =>
    (block.content ?? []).map(node =>
      node.type === "recipeMention" && typeof node.attrs?.recipeId === "string"
        ? recipeToken(node.attrs.recipeId)
        : node.type === "hardBreak" ? "\n"
          : node.type === "text" ? node.text ?? "" : ""
    ).join("")
  ).join("\n")
}
