import type {
  OnboardingIngredientDraft,
  OnboardingRecipeData,
  OnboardingSourceType,
} from "../contracts"

type SourceDescriptor = {
  sourceType: OnboardingSourceType
  sourceUrl: string
}

export type ExtractedOnboardingDraft = {
  recipe: OnboardingRecipeData
  evidence: {
    source_url: string
    source_type: OnboardingSourceType
    extraction: "json_ld_recipe" | "page_metadata"
    fields: Record<string, string>
    source_image_url: string | null
  }
  unresolvedFields: string[]
}

const UNIT_ALIASES: Array<[RegExp, string]> = [
  [/^(g|gram|grams|그램)$/i, "g"],
  [/^(kg|kilogram|kilograms|킬로그램)$/i, "kg"],
  [/^(ml|milliliter|milliliters|밀리리터)$/i, "ml"],
  [/^(l|liter|liters|리터)$/i, "L"],
  [/^(tbsp|tablespoon|tablespoons|큰술)$/i, "큰술"],
  [/^(tsp|teaspoon|teaspoons|작은술)$/i, "작은술"],
  [/^(cup|cups|컵)$/i, "컵"],
  [/^(개|대|장|쪽|알|줌|꼬집)$/i, "$1"],
]

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return ""
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())
}

function parseAttributes(tag: string) {
  const attrs: Record<string, string> = {}
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(tag))) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "")
  }
  return attrs
}

function pageMetadata(html: string) {
  const meta = new Map<string, string>()
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = parseAttributes(tag)
    const key = (attrs.property || attrs.name || "").toLowerCase()
    if (key && attrs.content && !meta.has(key)) meta.set(key, attrs.content.trim())
  }
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
  return {
    title: cleanText(meta.get("og:title") || titleMatch?.[1] || ""),
    description: cleanText(meta.get("og:description") || meta.get("description") || ""),
    image: cleanText(meta.get("og:image") || meta.get("twitter:image") || ""),
  }
}

function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = []
  const pattern =
    /<script\b[^>]*type\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html))) {
    const raw = match[1].trim()
    if (!raw) continue
    try {
      blocks.push(JSON.parse(raw))
    } catch {
      // Malformed JSON-LD is ignored; explicit page metadata remains usable.
    }
  }
  return blocks
}

function hasRecipeType(value: unknown) {
  if (typeof value === "string") return value.toLowerCase() === "recipe"
  return (
    Array.isArray(value) &&
    value.some((entry) => typeof entry === "string" && entry.toLowerCase() === "recipe")
  )
}

function findRecipeNode(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 8 || value == null) return null
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = findRecipeNode(child, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof value !== "object") return null
  const object = value as Record<string, unknown>
  if (hasRecipeType(object["@type"])) return object
  if (object["@graph"]) {
    const found = findRecipeNode(object["@graph"], depth + 1)
    if (found) return found
  }
  return null
}

function sourceImage(value: unknown): string | null {
  if (typeof value === "string" && /^https:\/\//i.test(value)) return value
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = sourceImage(entry)
      if (found) return found
    }
    return null
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>
    return sourceImage(object.url) || sourceImage(object.contentUrl)
  }
  return null
}

function parsePositiveNumber(value: string) {
  const normalized = value.trim()
  if (/^\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized)
  const mixed = normalized.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const fraction = normalized.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (fraction) return Number(fraction[1]) / Number(fraction[2])
  return null
}

function normalizeUnit(raw: string) {
  const value = raw.trim()
  for (const [pattern, normalized] of UNIT_ALIASES) {
    const match = value.match(pattern)
    if (match) return normalized === "$1" ? match[1] : normalized
  }
  return null
}

export function parseStructuredIngredient(rawValue: unknown): OnboardingIngredientDraft {
  const raw = cleanText(rawValue)
  if (!raw) return { raw: "", name: "", amount: null, unit: null }

  const amountToken =
    "(\\d+(?:\\.\\d+)?|\\d+\\s+\\d+\\s*\\/\\s*\\d+|\\d+\\s*\\/\\s*\\d+)"
  const unitToken =
    "(g|grams?|그램|kg|kilograms?|킬로그램|ml|milliliters?|밀리리터|l|liters?|리터|tbsp|tablespoons?|큰술|tsp|teaspoons?|작은술|cups?|컵|개|대|장|쪽|알|줌|꼬집)"

  const leading = raw.match(new RegExp("^" + amountToken + "\\s*" + unitToken + "\\s+(.+)$", "i"))
  const trailing = raw.match(new RegExp("^(.+?)\\s+" + amountToken + "\\s*" + unitToken + "$", "i"))
  const match = leading
    ? { name: leading[3], amount: leading[1], unit: leading[2] }
    : trailing
      ? { name: trailing[1], amount: trailing[2], unit: trailing[3] }
      : null

  if (!match) return { raw, name: raw, amount: null, unit: null }
  const amount = parsePositiveNumber(match.amount)
  const unit = normalizeUnit(match.unit)
  if (!amount || !unit) return { raw, name: raw, amount: null, unit: null }
  return { raw, name: cleanText(match.name), amount, unit }
}

function servings(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value)
  const text = Array.isArray(value) ? cleanText(value[0]) : cleanText(value)
  const match = text.match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const parsed = Number(match[1])
  return parsed > 0 ? Math.round(parsed) : null
}

export function isoDurationMinutes(value: unknown): number | null {
  const text = cleanText(value)
  const match = text.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/i)
  if (!match) return null
  const days = Number(match[1] || 0)
  const hours = Number(match[2] || 0)
  const minutes = Number(match[3] || 0)
  const total = days * 1440 + hours * 60 + minutes
  return total > 0 ? total : null
}

function instructionTexts(value: unknown): string[] {
  if (typeof value === "string") {
    const text = cleanText(value)
    return text ? [text] : []
  }
  if (Array.isArray(value)) return value.flatMap(instructionTexts)
  if (!value || typeof value !== "object") return []
  const object = value as Record<string, unknown>
  if (object.itemListElement) return instructionTexts(object.itemListElement)
  const text = cleanText(object.text || object.name)
  return text ? [text] : []
}

function keywordList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : []
  return Array.from(new Set(values.map(cleanText).filter(Boolean))).slice(0, 20)
}

function instagramCaption(value: string) {
  const wrapped = value.match(/:\s*"([\s\S]*)"\.?$/)
  return cleanText(wrapped?.[1] || value)
}

function explicitServingAndTime(value: string) {
  const match = value.match(/(?:^|\s)(\d{1,3})\s*인분\s*[·•|/]\s*(\d{1,4})\s*분(?:\s|$|[.,])/)
  if (!match) return { servings: null, cookingTime: null }
  const servingCount = Number(match[1])
  const cookingTime = Number(match[2])
  return {
    servings: servingCount > 0 ? servingCount : null,
    cookingTime: cookingTime > 0 ? cookingTime : null,
  }
}

function unresolvedFields(recipe: OnboardingRecipeData) {
  const missing: string[] = []
  if (!recipe.title) missing.push("title")
  if (!recipe.source_image_url) missing.push("image")
  if (!recipe.servings) missing.push("servings")
  if (!recipe.cooking_time_minutes) missing.push("cooking_time")
  if (
    !recipe.ingredients.length ||
    recipe.ingredients.some((ingredient) => !ingredient.name || !ingredient.amount || !ingredient.unit)
  ) {
    missing.push("ingredients")
  }
  if (!recipe.instructions.length || recipe.instructions.some((instruction) => !instruction.description)) {
    missing.push("instructions")
  }
  return missing
}

export function extractOnboardingDraft(
  html: string,
  source: SourceDescriptor,
): ExtractedOnboardingDraft {
  const meta = pageMetadata(html)
  const recipeNode = jsonLdBlocks(html)
    .map((block) => findRecipeNode(block))
    .find((node): node is Record<string, unknown> => Boolean(node))

  if (recipeNode) {
    const ingredients = Array.isArray(recipeNode.recipeIngredient)
      ? recipeNode.recipeIngredient.map(parseStructuredIngredient).filter((ingredient) => ingredient.raw)
      : []
    const instructions = instructionTexts(recipeNode.recipeInstructions).map((description) => ({
      description,
    }))
    const image = sourceImage(recipeNode.image) || meta.image || null
    const data: OnboardingRecipeData = {
      title: cleanText(recipeNode.name),
      description: cleanText(recipeNode.description) || meta.description,
      servings: servings(recipeNode.recipeYield),
      cooking_time_minutes:
        isoDurationMinutes(recipeNode.totalTime) ||
        isoDurationMinutes(recipeNode.cookTime) ||
        isoDurationMinutes(recipeNode.prepTime),
      ingredients,
      instructions,
      tags: keywordList(recipeNode.keywords),
      source_image_url: image,
      source_url: source.sourceUrl,
    }
    return {
      recipe: data,
      evidence: {
        source_url: source.sourceUrl,
        source_type: source.sourceType,
        extraction: "json_ld_recipe",
        fields: {
          title: recipeNode.name ? "schema:name" : "",
          description: recipeNode.description
            ? "schema:description"
            : meta.description
              ? "meta:description"
              : "",
          servings: recipeNode.recipeYield ? "schema:recipeYield" : "",
          cooking_time: recipeNode.totalTime
            ? "schema:totalTime"
            : recipeNode.cookTime
              ? "schema:cookTime"
              : recipeNode.prepTime
                ? "schema:prepTime"
                : "",
          ingredients: recipeNode.recipeIngredient ? "schema:recipeIngredient" : "",
          instructions: recipeNode.recipeInstructions ? "schema:recipeInstructions" : "",
        },
        source_image_url: image,
      },
      unresolvedFields: unresolvedFields(data),
    }
  }

  const isInstagram = source.sourceType !== "web"
  const description = isInstagram ? instagramCaption(meta.description) : meta.description
  const explicitTiming = isInstagram
    ? explicitServingAndTime(description)
    : { servings: null, cookingTime: null }
  const data: OnboardingRecipeData = {
    title: isInstagram ? "" : meta.title,
    description,
    servings: explicitTiming.servings,
    cooking_time_minutes: explicitTiming.cookingTime,
    ingredients: [],
    instructions: [],
    tags: [],
    source_image_url: meta.image || null,
    source_url: source.sourceUrl,
  }
  return {
    recipe: data,
    evidence: {
      source_url: source.sourceUrl,
      source_type: source.sourceType,
      extraction: "page_metadata",
      fields: {
        title: !isInstagram && meta.title ? "meta:title" : "",
        description: meta.description ? "meta:description" : "",
      },
      source_image_url: meta.image || null,
    },
    unresolvedFields: unresolvedFields(data),
  }
}
