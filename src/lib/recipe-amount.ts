// 레시피 분량 표기.
// 무게와 부피(g, ml 등)는 정수로 반올림하고, 컵·큰술·개처럼 세는 단위는 부엌에서 쓰는 분수로 보여 준다.

const METRIC_UNITS = new Set(["g", "kg", "mg", "ml", "mL", "l", "L", "cc", "그램", "밀리리터", "리터"])

const FRACTIONS: Array<[number, string]> = [
	[1 / 4, "1/4"],
	[1 / 3, "1/3"],
	[1 / 2, "1/2"],
	[2 / 3, "2/3"],
	[3 / 4, "3/4"],
]

const FRACTION_TOLERANCE = 0.04

function trimDecimal(value: number, digits: number): string {
	return String(Number(value.toFixed(digits)))
}

export function formatAmount(amount: number, unit?: string | null): string {
	if (!Number.isFinite(amount) || amount <= 0) return ""

	if (unit && METRIC_UNITS.has(unit.trim())) {
		return amount < 10 ? trimDecimal(amount, 1) : String(Math.round(amount))
	}

	const whole = Math.floor(amount)
	const rest = amount - whole
	if (rest < FRACTION_TOLERANCE) return String(whole)
	if (1 - rest < FRACTION_TOLERANCE) return String(whole + 1)

	const fraction = FRACTIONS.find(([value]) => Math.abs(rest - value) < FRACTION_TOLERANCE)
	if (fraction) return whole > 0 ? `${whole} ${fraction[1]}` : fraction[1]

	return amount < 10 ? trimDecimal(amount, 1) : String(Math.round(amount))
}

export function formatCookingTime(minutes: number | null | undefined): string | null {
	if (!minutes || minutes <= 0) return null
	const hours = Math.floor(minutes / 60)
	const rest = minutes % 60
	if (hours === 0) return `${rest}분`
	return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`
}
