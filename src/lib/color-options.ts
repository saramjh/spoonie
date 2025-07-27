// 레시피 색상 라벨을 위한 공통 색상 옵션
export const RECIPE_COLOR_OPTIONS = [
	{
		value: "red",
		label: "빨강",
		color: "bg-red-500",
		lightColor: "bg-red-200",
		mediumColor: "bg-red-300",
		ringColor: "ring-red-500",
	},
	{
		value: "orange",
		label: "주황",
		color: "bg-orange-500",
		lightColor: "bg-orange-200",
		mediumColor: "bg-orange-300",
		ringColor: "ring-orange-500",
	},
	{
		value: "yellow",
		label: "노랑",
		color: "bg-yellow-500",
		lightColor: "bg-yellow-200",
		mediumColor: "bg-yellow-300",
		ringColor: "ring-yellow-500",
	},
	{
		value: "green",
		label: "초록",
		color: "bg-green-500",
		lightColor: "bg-green-200",
		mediumColor: "bg-green-300",
		ringColor: "ring-green-500",
	},
	{
		value: "blue",
		label: "파랑",
		color: "bg-blue-500",
		lightColor: "bg-blue-200",
		mediumColor: "bg-blue-300",
		ringColor: "ring-blue-500",
	},
	{
		value: "purple",
		label: "보라",
		color: "bg-purple-500",
		lightColor: "bg-purple-200",
		mediumColor: "bg-purple-300",
		ringColor: "ring-purple-500",
	},
	{
		value: "gray",
		label: "회색",
		color: "bg-gray-500",
		lightColor: "bg-gray-200",
		mediumColor: "bg-gray-300",
		ringColor: "ring-gray-500",
	},
] as const

export type RecipeColorValue = (typeof RECIPE_COLOR_OPTIONS)[number]["value"]

// 색상 값으로 옵션 객체 찾기
export function getColorOption(value: string | null) {
	return RECIPE_COLOR_OPTIONS.find((option) => option.value === value)
}

// 색상 값으로 특정 색상 클래스 가져오기
export function getColorClass(value: string | null, type: "color" | "lightColor" | "mediumColor" = "lightColor") {
	const option = getColorOption(value)
	return option?.[type] || "bg-gray-200"
}
