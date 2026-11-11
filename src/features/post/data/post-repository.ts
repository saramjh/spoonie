/**
 * 레시피드 저장소. PostForm.tsx에서 호출 순서·오류 문구를 바꾸지 않고 옮겨 왔다.
 */

import type { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import type { Item } from "@/types/item"
import type { PollDraft, PollSaveAction } from "@/features/recipe/domain/item-poll"
import { fetchCitedRecipes } from "@/features/recipe/data/recipe-repository"

type Db = ReturnType<typeof createSupabaseBrowserClient>

// 참고 레시피의 표시 정보(제목, 작성자). 실패하면 빈 목록 (레시피 폼과 같은 조회, 같은 오류 로그)
export async function loadCitedRecipesForPost(supabase: Db, ids: string[]): Promise<Item[]> {
	return (await fetchCitedRecipes(supabase, ids)) ?? []
}

// Post row and its optional poll must succeed or fail in one PostgreSQL transaction.
export async function savePostRow(
  supabase: Db,
  args: { existingId: string | null; itemPayload: object; poll: PollDraft | null; pollAction: PollSaveAction },
): Promise<{ itemId: string }> {
  const { data, error } = await supabase.rpc("save_item_with_poll_atomic", {
    p_existing_id: args.existingId,
    p_item: args.itemPayload,
    p_ingredients: null,
    p_instructions: null,
    p_poll: args.poll,
    p_poll_action: args.pollAction,
  })
  if (error) throw new Error("레시피드 " + (args.existingId ? "수정" : "생성") + " 실패: " + error.message, { cause: error })
  if (!data) throw new Error("레시피드 저장 결과를 확인할 수 없습니다.")
  return { itemId: String(data) }
}
