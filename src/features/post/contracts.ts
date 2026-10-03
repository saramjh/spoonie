/**
 * 레시피드 기능의 계약(타입만). 실행 코드는 없다. 계층 규칙은 features/recipe/contracts.ts와 같다.
 */

import type { Item } from "@/types/item"

// 레시피 화면("이 레시피로 만들었어요")이나 요리 모드에서 들어온 경로
export type PostSourceOrigin = "recipe_detail" | "cook_mode"

// 폼 입력: PostForm의 zod 스키마(postSchema) 결과와 같은 모양
export interface PostDraft {
	title?: string
	content: string
	is_public: boolean
	tags?: string[]
	cited_recipe_ids?: string[]
}

// 화면 계약: PostForm의 Props
export interface PostFormProps {
	isEditMode?: boolean
	initialData?: Item
	onNavigateBack?: (itemId?: string, options?: { replace?: boolean }) => void
	sourceRecipeId?: string | null
	sourceOrigin?: PostSourceOrigin | null
}

// 저장소 포트
export interface PostRepository {
	save(args: { existingId: string | null; itemPayload: object }): Promise<{ itemId: string }>
}
