"use client"

import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { Item } from "@/types/item"

/**
 * 탐색 화면(검색어 없음)의 두 묶음 (DESIGN.md Interface Grammar 1, docs/discovery-and-behavior.md)
 * - 레시피: 최근 30일 동안 다른 사람이 실제로 쓴 정도로 정렬, 한 작성자 최대 2개, 새 레시피 1자리
 * - 만들어 본 기록: 레시피에 이어진 최근 레시피드 (같은 레시피·같은 사람 최대 2개)
 * 한 번의 호출을 5분 동안 재사용한다.
 */
export interface MadeRecord {
	item: Item
	sourceTitle: string | null
}

const toItem = (row: Record<string, unknown>): Item =>
	({
		...row,
		id: String(row.id),
		item_id: String(row.id),
	}) as unknown as Item

// 순위 규칙은 DB 함수 get_explore 한 곳에 있다 (supabase/discovery_and_behavior.sql)
async function fetchExplore(): Promise<{ recipes: Item[]; made: MadeRecord[] }> {
	const supabase = createSupabaseBrowserClient()
	const { data, error } = await supabase.rpc("get_explore", { recipe_limit: 8, made_limit: 9 })
	if (error) throw error
	const result = (data || {}) as { recipes?: Record<string, unknown>[]; made?: Record<string, unknown>[] }
	return {
		recipes: (result.recipes || []).map(toItem),
		made: (result.made || []).map((row) => ({ item: toItem(row), sourceTitle: (row.source_title as string) || null })),
	}
}

export function useExplore() {
	return useSWR("explore|v2", fetchExplore, {
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
		dedupingInterval: 5 * 60 * 1000,
	})
}
