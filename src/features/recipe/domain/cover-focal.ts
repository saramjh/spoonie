export interface CoverFocal { x: number; y: number }

export const CENTER_FOCAL: CoverFocal = { x: 50, y: 50 }

// Imported/older items have no focal metadata; invalid API or draft values must not break CSS.
export function normalizeCoverFocal(value: unknown): CoverFocal {
  if (!value || typeof value !== "object") return { ...CENTER_FOCAL }
  const { x, y } = value as Record<string, unknown>
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return { ...CENTER_FOCAL }
  return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) }
}

export function coverObjectPosition(value: unknown): string {
  const { x, y } = normalizeCoverFocal(value)
  return `${x}% ${y}%`
}
