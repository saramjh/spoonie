import type { SupabaseClient } from "@supabase/supabase-js"
import type { Item } from "@/types/item"

// 탐색 목록 (검색어가 없을 때의 /search). 순위 규칙은 DB 함수 get_explore 한 곳에 있다
// (supabase/discovery_and_behavior.sql, docs/discovery-and-behavior.md). 서버(미리 만든 /search)와 브라우저가 같이 쓴다.
export interface MadeRecord {
	item: Item
	sourceTitle: string | null
}

export interface ExploreData {
	recipes: Item[]
	made: MadeRecord[]
}

const toItem = (row: Record<string, unknown>): Item =>
	({
		...row,
		id: String(row.id),
		item_id: String(row.id),
	}) as unknown as Item

export async function fetchExplore(supabase: SupabaseClient): Promise<ExploreData> {
	const { data, error } = await supabase.rpc("get_explore", { recipe_limit: 8, made_limit: 9 })
	if (error) throw error
	const result = (data || {}) as { recipes?: Record<string, unknown>[]; made?: Record<string, unknown>[] }
	return {
		recipes: (result.recipes || []).map(toItem),
		made: (result.made || []).map((row) => ({ item: toItem(row), sourceTitle: (row.source_title as string) || null })),
	}
}
