import type { Ingredient } from "@/types/item"

export interface Reference { index: number; target: number }

/** Only a real positive source quantity can determine the ratio. */
export function initialReferenceIndex(ingredients: Ingredient[]): number {
  return ingredients.findIndex((item) => Number.isFinite(item.amount) && item.amount > 0)
}

export function parseAmountInput(input: string): number | null {
  const trimmed = input.trim()
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) return null
  const amount = Number(trimmed)
  return Number.isFinite(amount) && amount > 0 && amount <= 1e9 ? amount : null
}

/** Always use the published source amount, never a previously rounded display value. */
export function scaleForReference(ingredients: Ingredient[], reference: Reference): number | null {
  const base = ingredients[reference.index]?.amount
  if (!Number.isFinite(base) || !base || base <= 0 || !Number.isFinite(reference.target) || reference.target <= 0) return null
  const factor = reference.target / base
  // Avoid silently rendering NaN/Infinity or absurd quantities in any ingredient.
  if (!Number.isFinite(factor) || factor <= 0 || factor > 1e6 || factor < 1e-6) return null
  if (!ingredients.every((ing) => Number.isFinite(ing.amount * factor) && Math.abs(ing.amount * factor) <= Number.MAX_SAFE_INTEGER)) return null
  return factor
}

/** Switching the highlighted reference must leave the current result unchanged. */
export function selectReference(ingredients: Ingredient[], index: number, factor: number): Reference | null {
  const base = ingredients[index]?.amount
  if (!Number.isFinite(base) || !base || base <= 0 || !Number.isFinite(factor) || factor <= 0) return null
  const target = base * factor
  const next = { index, target }
  return Number.isFinite(target) && target > 0 && target <= 1e9 && scaleForReference(ingredients, next) !== null ? next : null
}
