/**
 * 레시피드 저장소. PostForm.tsx에서 호출 순서·오류 문구를 바꾸지 않고 옮겨 왔다.
 */

import type { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { Item } from "@/types/item"
import { fetchCitedRecipes } from "@/features/recipe/data/recipe-repository"

type Db = ReturnType<typeof createSupabaseBrowserClient>

// 참고 레시피의 표시 정보(제목, 작성자). 실패하면 빈 목록 (레시피 폼과 같은 조회, 같은 오류 로그)
export async function loadCitedRecipesForPost(supabase: Db, ids: string[]): Promise<Item[]> {
	return (await fetchCitedRecipes(supabase, ids)) ?? []
}

// 레시피드 items 행을 새로 넣거나 고친다
export async function savePostRow(supabase: Db, args: { existingId: string | null; itemPayload: object }): Promise<{ itemId: string }> {
	if (args.existingId) {
		const { data: updatedItem, error: itemError } = await supabase.from("items").update(args.itemPayload).eq("id", args.existingId).select("*").single()
		if (itemError) throw new Error(`레시피드 수정 실패: ${itemError.message}`)
		return { itemId: updatedItem.id }
	}
	const { data: newItem, error: itemError } = await supabase.from("items").insert(args.itemPayload).select("*").single()
	if (itemError) throw new Error(`레시피드 생성 실패: ${itemError.message}`)
	return { itemId: newItem.id }
}
