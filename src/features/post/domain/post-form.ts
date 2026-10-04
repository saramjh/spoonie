/**
 * 레시피드 폼의 판단 로직 (순수 함수). PostForm.tsx에서 내용을 바꾸지 않고 옮겨 왔다.
 */

import type { Item } from "@/types/item"
import type { PostDraft, PostSourceOrigin } from "../contracts"
import { normalizeTags } from "@/shared/lib/topics"

// 폼 처음 값: 수정이면 저장된 값, 아니면 빈 값 (레시피드 기본값은 공개)
export function postFormDefaults(editing: Item | null): Required<Omit<PostDraft, "title">> & { title: string } {
	return {
		title: editing?.title || "",
		content: editing?.content || "",
		is_public: editing?.is_public ?? true,
		tags: editing?.tags || [],
		cited_recipe_ids: Array.isArray(editing?.cited_recipe_ids) ? editing.cited_recipe_ids.map(String).filter(Boolean) : [],
	}
}

// 작성 경로: 출처 레시피가 그대로 연결돼 있으면 그 경로, 직접 고른 인용이면 manual. 수정 때는 바꾸지 않는다
export function postCreationOriginField(
	isEditMode: boolean,
	sourceRecipeId: string | null,
	sourceOrigin: PostSourceOrigin | null,
	citedRecipeIds: string[] | undefined
): { creation_origin?: PostSourceOrigin | "manual" | null } {
	if (isEditMode) return {}
	return {
		creation_origin:
			sourceRecipeId && sourceOrigin && citedRecipeIds?.includes(sourceRecipeId)
				? sourceOrigin
				: citedRecipeIds && citedRecipeIds.length > 0
					? ("manual" as const)
					: null,
	}
}

// items 표에 쓸 값
export function buildPostItemPayload(
	values: PostDraft,
	ctx: { userId: string; imageUrls: string[]; thumbnailIndex: number; isEditMode: boolean; sourceRecipeId: string | null; sourceOrigin: PostSourceOrigin | null }
) {
	return {
		user_id: ctx.userId,
		item_type: "post" as const,
		title: values.title?.trim() || null,
		content: values.content,
		image_urls: ctx.imageUrls,
		tags: normalizeTags(values.tags),
		cited_recipe_ids: values.cited_recipe_ids,
		is_public: values.is_public,
		thumbnail_index: ctx.thumbnailIndex,
		...postCreationOriginField(ctx.isEditMode, ctx.sourceRecipeId, ctx.sourceOrigin, values.cited_recipe_ids),
	}
}

// 고른 참고 레시피 → 저장할 id 목록 (빈 id는 뺀다)
export function citedIdsFromRecipes(recipes: Item[]): string[] {
	return recipes.map((r: Item) => String(r.id || r.item_id || "")).filter((id) => id !== "")
}

// 새로 쓴 기록이 출처 레시피를 그대로 인용하면 그 레시피의 "만들어 본 기록"으로 돌아간다
export function returnToSourcePath(isEditMode: boolean, sourceRecipeId: string | null, citedRecipeIds: string[] | undefined): string | null {
	if (!isEditMode && sourceRecipeId && citedRecipeIds?.includes(sourceRecipeId)) return `/recipes/${sourceRecipeId}#made-heading`
	return null
}
