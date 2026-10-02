// 레시피 색상 라벨: 주인의 정리 도구 (DESIGN.md Interface Grammar 3).
// 색의 출처는 여기 한 곳이다. 화면은 Magnet(kit)으로만 그린다.
export const RECIPE_COLOR_OPTIONS = [
	{ value: "red", label: "빨강", hex: "#D6453D" },
	{ value: "orange", label: "주황", hex: "#FF6900" },
	{ value: "yellow", label: "노랑", hex: "#F2C230" },
	{ value: "green", label: "초록", hex: "#3E9B5F" },
	{ value: "blue", label: "파랑", hex: "#2E6FBA" },
	{ value: "purple", label: "보라", hex: "#7A5CC2" },
	{ value: "gray", label: "회색", hex: "#8A9296" },
] as const

export function getMagnet(value: string | null | undefined) {
	if (!value) return null
	return RECIPE_COLOR_OPTIONS.find((option) => option.value === value) ?? null
}
