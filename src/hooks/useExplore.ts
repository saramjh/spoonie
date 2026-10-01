"use client"

import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { Item } from "@/types/item"

/**
 * 탐색 화면(검색어 없음)의 두 묶음 (DESIGN.md Interface Grammar 1)
 * - 레시피: 다른 사람이 만들어 본 수 → 좋아요 → 최신 순. 레시피가 탐색의 중심이다
 * - 만들어 본 기록: 레시피를 출처로 단 최근 레시피드. 사진 아래에 어떤 레시피로 만들었는지 붙여 레시피로 돌려보낸다
 * 두 번의 조회를 5분 동안 재사용한다.
 */
export interface MadeRecord {
	item: Item
	sourceTitle: string | null
}

const RECIPE_LIMIT = 8
const MADE_LIMIT = 9

const toItem = (row: Record<string, unknown>): Item =>
	({
		...row,
		id: String(row.id),
		item_id: String(row.id),
	}) as unknown as Item

async function fetchExplore(): Promise<{ recipes: Item[]; made: MadeRecord[] }> {
	const supabase = createSupabaseBrowserClient()
	const columns =
		"id, user_id, item_type, created_at, title, content, image_urls, thumbnail_index, is_public, servings, cooking_time_minutes, cited_recipe_ids, creation_origin, username, user_public_id, likes_count, made_count, ingredient_count, key_ingredients"

	const [recipesRes, madeRes] = await Promise.all([
		supabase
			.from("optimized_feed_view")
			.select(columns)
			.eq("item_type", "recipe")
			.order("made_count", { ascending: false })
			.order("likes_count", { ascending: false })
			.order("created_at", { ascending: false })
			.limit(RECIPE_LIMIT),
		supabase
			.from("optimized_feed_view")
			.select(columns)
			.eq("item_type", "post")
			.not("cited_recipe_ids", "is", null)
			.neq("cited_recipe_ids", "{}")
			.order("created_at", { ascending: false })
			.limit(MADE_LIMIT),
	])
	if (recipesRes.error) throw recipesRes.error
	if (madeRes.error) throw madeRes.error

	const madeRows = (madeRes.data || []) as Record<string, unknown>[]
	const sourceIds = Array.from(new Set(madeRows.map((r) => (r.cited_recipe_ids as string[] | null)?.[0]).filter(Boolean))) as string[]
	const titles = new Map<string, string>()
	if (sourceIds.length > 0) {
		const { data } = await supabase.from("items").select("id, title").in("id", sourceIds)
		data?.forEach((r) => titles.set(r.id, r.title))
	}

	return {
		recipes: ((recipesRes.data || []) as Record<string, unknown>[]).map(toItem),
		made: madeRows.map((row) => {
			const sourceId = (row.cited_recipe_ids as string[] | null)?.[0]
			return { item: toItem(row), sourceTitle: (sourceId && titles.get(sourceId)) || null }
		}),
	}
}

export function useExplore() {
	return useSWR("explore|v1", fetchExplore, {
		revalidateOnFocus: false,
		revalidateOnReconnect: false,
		dedupingInterval: 5 * 60 * 1000,
	})
}
