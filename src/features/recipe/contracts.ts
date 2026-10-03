/**
 * 레시피 기능의 계약(타입만). 실행 코드는 없다.
 *
 * 계층 규칙
 * - domain: 이 파일의 입력 타입을 받아 저장 명령을 만드는 순수 함수 (React·Supabase 모름)
 * - data:   RecipeRepository를 구현해 DB를 읽고 쓴다 (database.ts의 행 타입은 여기서만)
 * - components: 폼 값 → domain → data 순서로 부른다
 *
 * 앱 타입(types/item.ts)과 DB가 어긋나는 곳이 있다. 지금 동작을 바꾸지 않으려고 그대로 두고 여기 적어 둔다.
 * - Ingredient.amount/unit: 앱은 number/string, DB는 number|null / string|null
 * - Item.thumbnail_index: 앱은 number|null, DB는 number (기본값 0)
 */

import type { Tables, TablesInsert } from "@/types/database"
import type { Item, ItemDetail } from "@/types/item"

// ── DB 행 (저장소 계층만 쓴다) ──
export type ItemRow = Tables<"items">
export type IngredientRow = Tables<"ingredients">
export type InstructionRow = Tables<"instructions">
export type ItemInsert = TablesInsert<"items">
export type IngredientInsert = TablesInsert<"ingredients">
export type InstructionInsert = TablesInsert<"instructions">

// ── 폼 입력: RecipeForm의 zod 스키마(recipeSchema) 결과와 같은 모양 ──
export interface RecipeIngredientInput {
	name: string
	amount: number
	unit: string
}

export interface RecipeInstructionInput {
	description: string
	image_url?: string // 단계 사진 주소 (새 사진은 저장 직전에 올려서 채운다)
}

export interface RecipeDraft {
	title: string
	description?: string
	servings: number
	cooking_time_minutes: number
	is_public: boolean
	ingredients: RecipeIngredientInput[]
	instructions: RecipeInstructionInput[]
	color_label?: string | null
	tags: string[] // 폼의 쉼표 문자열을 쪼갠 결과
	cited_recipe_ids?: string[]
}

// 폼에 채워 넣는 값: tags만 쉼표로 이은 문자열이다 (zod가 제출 때 배열로 바꾼다)
export type RecipeFormInput = Omit<RecipeDraft, "tags"> & { tags: string }

// ── 저장 명령: domain이 만들고 data가 실행한다 ──
export type CreationOrigin = NonNullable<Item["creation_origin"]>

export interface SaveRecipeCommand {
	mode: "create" | "update"
	itemId?: string // update일 때만
	userId: string
	item: Omit<ItemInsert, "id" | "user_id" | "item_type">
	ingredients: Omit<IngredientInsert, "item_id">[]
	instructions: Omit<InstructionInsert, "item_id">[]
}

export interface SaveRecipeResult {
	itemId: string
}

// ── 화면 계약: RecipeForm의 Props (지금 컴포넌트 안의 선언과 같다) ──
export interface RecipeFormProps {
	initialData?: Item | null
	// "참고해서 내 레시피 만들기": 원본의 분량·재료·단계를 미리 채우고 출처를 자동으로 남긴다
	forkFrom?: ItemDetail | null
	onNavigateBack?: (itemId?: string, options?: { replace?: boolean }) => void
}

// ── RPC get_recipe_activity 응답 (DB 타입은 Json이라 여기서 모양을 정한다. RecipeActivity.tsx의 Activity와 같다) ──
export type RecipeActivity =
	| { role: "owner"; viewers: number; saves: number; cook_starts: number; cook_completes: number; made: number; profile_visits: number }
	| { role: "viewer"; last_cook_start: string | null; recorded: boolean; remind?: boolean }

// ── 저장소 포트 (3단계에서 구현한다) ──
export interface RecipeRepository {
	getDetail(itemId: string): Promise<ItemDetail | null>
	save(command: SaveRecipeCommand): Promise<SaveRecipeResult>
	remove(itemIds: string[]): Promise<void>
	getActivity(recipeId: string): Promise<RecipeActivity | null>
}
