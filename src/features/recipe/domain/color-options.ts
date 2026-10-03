// 레시피 색상 라벨: 주인의 정리 도구 (DESIGN.md Interface Grammar 3).
// 색의 출처는 여기 한 곳이다. 화면은 Magnet(kit)으로만 그린다. 돌빛 문 판에 맞춰 채도를 낮춘 흙빛 계열
export const RECIPE_COLOR_OPTIONS = [
	{ value: "red", label: "빨강", hex: "#C4553F" },
	{ value: "orange", label: "주황", hex: "#E07A2E" },
	{ value: "yellow", label: "노랑", hex: "#D9A93A" },
	{ value: "green", label: "초록", hex: "#5E8C64" },
	{ value: "blue", label: "파랑", hex: "#3F6E9E" },
	{ value: "purple", label: "보라", hex: "#7B63A6" },
	{ value: "gray", label: "회색", hex: "#8F8A82" },
] as const

export function getMagnet(value: string | null | undefined) {
	if (!value) return null
	return RECIPE_COLOR_OPTIONS.find((option) => option.value === value) ?? null
}
