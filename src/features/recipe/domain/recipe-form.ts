/**
 * 레시피 폼의 판단 로직 (순수 함수: React·Supabase·브라우저를 모른다).
 * RecipeForm.tsx에서 내용을 바꾸지 않고 옮겨 왔다. 동작은 recipe-form.test.ts가 기록한다.
 */

import type { Item, ItemDetail } from "@/types/item"
import type { RecipeDraft, RecipeFormInput, RecipeIngredientInput, RecipeInstructionInput } from "../contracts"
import { normalizeTags } from "@/shared/lib/topics"

// 수정 화면: 저장된 레시피로 폼을 채운다. 재료는 order_index 순서로 (원래 배열을 그 자리에서 정렬하는 동작도 그대로)
export function editDefaults(initialData: Item): RecipeFormInput {
	return {
		title: initialData.title || "",
		description: initialData.description || "",
		servings: initialData.servings || 1,
		cooking_time_minutes: initialData.cooking_time_minutes || 1,
		is_public: initialData.is_public !== undefined ? initialData.is_public : true,
		ingredients:
			initialData.ingredients && initialData.ingredients.length > 0
				? initialData.ingredients
						.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
						.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit || "개" }))
				: [{ name: "", amount: 1, unit: "개" }],
		instructions:
			initialData.instructions && initialData.instructions.length > 0
				? initialData.instructions.map((i) => ({ description: i.description, image_url: i.image_url || "" }))
				: [{ description: "", image_url: "" }],
		color_label: initialData.color_label,
		tags: initialData.tags?.join(", ") || "",
		cited_recipe_ids: initialData.cited_recipe_ids || [],
	}
}

// 내 버전 만들기: 사진과 색상 라벨은 가져오지 않는다 (내가 만든 요리의 사진, 내 정리 기준을 쓴다)
export function forkDefaults(forkFrom: ItemDetail): RecipeFormInput {
	return {
		title: "",
		description: "",
		servings: forkFrom.servings || 1,
		cooking_time_minutes: forkFrom.cooking_time_minutes || 1,
		is_public: true,
		ingredients:
			forkFrom.ingredients && forkFrom.ingredients.length > 0
				? forkFrom.ingredients.map((ing) => ({ name: ing.name, amount: ing.amount, unit: ing.unit }))
				: [{ name: "", amount: 1, unit: "" }],
		instructions:
			forkFrom.instructions && forkFrom.instructions.length > 0
				? forkFrom.instructions.map((inst) => ({ description: inst.description, image_url: "" }))
				: [{ description: "", image_url: "" }],
		color_label: null,
		tags: forkFrom.tags?.join(", ") || "",
		cited_recipe_ids: [forkFrom.id],
	}
}

// 끌어서 바꾼 순서대로 폼 값을 다시 놓는다. 원래 칸을 못 찾으면 끌어온 항목의 값으로 채운다
export function reorderIngredients(
	newOrder: { id: string; name?: string; amount?: number; unit?: string }[],
	fieldIds: string[],
	currentValues: RecipeIngredientInput[]
): RecipeIngredientInput[] {
	return newOrder.map((item) => {
		const originalIndex = fieldIds.findIndex((id) => id === item.id)
		if (originalIndex !== -1) return currentValues[originalIndex]
		return { name: item.name || "", amount: item.amount || 0, unit: item.unit || "" }
	})
}

// 작성 경로: fork로 시작해 원본을 그대로 인용하면 fork(고친 버전), 직접 고른 인용은 manual. 수정 때는 바꾸지 않는다
export function creationOriginField(
	isEditMode: boolean,
	forkFromId: string | undefined,
	citedRecipeIds: string[] | undefined
): { creation_origin?: "fork" | "manual" | null } {
	if (isEditMode) return {}
	return {
		creation_origin:
			forkFromId !== undefined && citedRecipeIds?.includes(forkFromId)
				? ("fork" as const)
				: citedRecipeIds && citedRecipeIds.length > 0
					? ("manual" as const)
					: null,
	}
}

// items 표에 쓸 값
export function buildRecipeItemPayload(
	values: RecipeDraft,
	ctx: { userId: string; imageUrls: string[]; thumbnailIndex: number; isEditMode: boolean; forkFromId: string | undefined }
) {
	return {
		user_id: ctx.userId,
		item_type: "recipe" as const,
		title: values.title,
		description: values.description,
		servings: values.servings,
		cooking_time_minutes: values.cooking_time_minutes,
		is_public: values.is_public,
		image_urls: ctx.imageUrls,
		color_label: values.color_label,
		tags: normalizeTags(values.tags),
		cited_recipe_ids: values.cited_recipe_ids,
		thumbnail_index: ctx.thumbnailIndex,
		...creationOriginField(ctx.isEditMode, ctx.forkFromId, values.cited_recipe_ids),
	}
}

// 단계마다 올린 사진 주소를 붙인다 (사진이 없으면 image_url을 비운다)
export function attachInstructionImages(instructions: RecipeInstructionInput[], imageUrls: (string | null)[]) {
	return instructions.map((inst, index) => ({ ...inst, image_url: imageUrls[index] || undefined }))
}

// 재료 행: 끌어서 바꾼 순서를 order_index(1부터)로 남긴다
export function toIngredientRows(ingredients: RecipeIngredientInput[], itemId: string) {
	return ingredients.map((ing, index) => ({ ...ing, item_id: itemId, order_index: index + 1 }))
}

// 단계 행: step_number는 1부터
export function toInstructionRows<T extends RecipeInstructionInput>(instructions: T[], itemId: string) {
	return instructions.map((inst, index) => ({ ...inst, item_id: itemId, step_number: index + 1 }))
}
