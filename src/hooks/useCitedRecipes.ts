"use client"

import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { Item, Profile } from "@/types/item"

// 참고 레시피 fetcher - SWR용
const fetchCitedRecipes = async (citedRecipeIds: string[]): Promise<Item[]> => {
	if (!citedRecipeIds || citedRecipeIds.length === 0) {
		return []
	}

	const supabase = createSupabaseBrowserClient()


	const { data, error } = await supabase
		.from("items")
		.select(
			`
			id, 
			title, 
			item_type, 
			image_urls, 
			user_id, 
			created_at,
			profiles!items_user_id_fkey(
				display_name, 
				username, 
				public_id, 
				avatar_url
			)
		`
		)
		.in("id", citedRecipeIds)
		.eq("item_type", "recipe")

	if (error) {
		console.error("❌ useCitedRecipes: Error fetching cited recipes:", error)
		throw error
	}



	// FeedItem 형태로 매핑
	const mappedData = (data || []).map((recipe: Record<string, unknown>) => {
		const authorProfile = Array.isArray(recipe.profiles) ? recipe.profiles[0] : recipe.profiles

		// 실제 사용되는 필드만 정확하게 매핑 (id, title, created_at, author)
		const mappedRecipe: Item = {
			// 🎯 UI에서 실제 사용되는 핵심 필드들
			id: String(recipe.id),
			item_id: String(recipe.id), 
			user_id: String(recipe.user_id),
			item_type: 'recipe',
			created_at: String(recipe.created_at),
			title: String(recipe.title || "제목 없음"),
			
			// 🎯 작성자 정보 (UI에서 사용)
			author: authorProfile ? {
				id: String(recipe.user_id),
				public_id: authorProfile.public_id || String(recipe.user_id),
				username: authorProfile.username || "익명",
				display_name: authorProfile.display_name,
				avatar_url: authorProfile.avatar_url,
			} as Profile : undefined,
			
			// 🎯 Item 타입 호환성을 위한 필수 필드들 (안전한 기본값)
			content: null,
			description: null,
			image_urls: Array.isArray(recipe.image_urls) ? recipe.image_urls as string[] : null,
			thumbnail_index: null,
			tags: null,
			is_public: true,
			color_label: null,
			servings: null,
			cooking_time_minutes: null,
			recipe_id: null,
			cited_recipe_ids: null,
			
			// 🎯 통계/상호작용 정보 (실제 사용되지 않으므로 안전한 기본값)
			username: authorProfile?.username,
			display_name: authorProfile?.display_name,
			avatar_url: authorProfile?.avatar_url,
			user_public_id: authorProfile?.public_id,
			comments_count: 0,
			likes_count: 0,
			is_liked: false,
			is_following: false,
			bookmarks_count: 0,
			is_bookmarked: false,
		}

		// 데이터 매핑 완료

		return mappedRecipe
	})

	return mappedData
}

// 🚀 최적화된 참고 레시피 캐싱 훅 (스마트 캐시 전략)
export function useCitedRecipes(citedRecipeIds: string[] | null | undefined) {
	// citedRecipeIds가 없거나 빈 배열이면 null을 key로 사용하여 fetch 안함
	const cacheKey = citedRecipeIds && citedRecipeIds.length > 0 ? `cited-recipes:${[...citedRecipeIds].sort().join(",")}` : null

	const { data, error, isLoading, mutate } = useSWR(cacheKey, () => fetchCitedRecipes(citedRecipeIds!), {
		// 🚀 스마트 캐싱 최적화 설정
		revalidateOnFocus: false, // 포커스 시 재검증 안함
		revalidateOnReconnect: true, // 재연결 시에는 재검증 (네트워크 문제 대응)
		dedupingInterval: 15 * 60 * 1000, // 15분 동안 중복 요청 방지 (1시간→15분으로 단축)
		focusThrottleInterval: 30 * 60 * 1000, // 30분 동안 포커스 throttle (균형)
		errorRetryCount: 1, // 에러 시 최대 1번 재시도 (서버 부담 감소)
		refreshInterval: 0, // 자동 새로고침 비활성화
		refreshWhenHidden: false,
		refreshWhenOffline: false,
		// 💡 fallbackData를 통한 즉시 응답 (있을 때만)
		fallbackData: undefined,
		// 💡 서버 부담 최소화를 위한 조건부 재검증
		revalidateIfStale: true, // stale 데이터일 때만 재검증
	})



	return {
		citedRecipes: data || [],
		isLoading,
		error,
		// 수동으로 캐시 갱신이 필요한 경우에만 사용
		refreshCitedRecipes: mutate,
	}
}
 
export interface RelatedItem {
	id: string
	title: string | null
	item_type: "recipe" | "post"
	username: string
	image_url: string | null
	relation_type: "cooked" | "adapted" | "referenced"
}

// 이 레시피에서 나온 공개 글: 만들어 본 기록(레시피드)과 이어진 레시피(레시피)
const fetchRecipeRelations = async (recipeId: string): Promise<RelatedItem[]> => {
	const supabase = createSupabaseBrowserClient()
	const { data, error } = await supabase
		.from("content_relations")
		.select(
			"relation_type, item:items!content_relations_from_item_id_fkey(id, title, item_type, image_urls, thumbnail_index, author:profiles!user_id(username))"
		)
		.eq("to_recipe_id", recipeId)
		.order("created_at", { ascending: false })
		.limit(30)
	if (error) throw error
	return (data || []).flatMap((row) => {
		const item = (Array.isArray(row.item) ? row.item[0] : row.item) as Record<string, unknown> | null
		// 공개 여부는 RLS가 판단한다 (작성자는 자기 비공개 글도 본다)
		if (!item) return []
		const author = Array.isArray(item.author) ? item.author[0] : item.author
		const images = (item.image_urls as string[] | null) || []
		return [
			{
				id: String(item.id),
				title: (item.title as string | null) ?? null,
				item_type: item.item_type === "recipe" ? "recipe" : "post",
				username: (author as { username?: string } | null)?.username || "익명",
				image_url: images[(item.thumbnail_index as number) || 0] || images[0] || null,
				relation_type: row.relation_type as RelatedItem["relation_type"],
			},
		]
	})
}

export function useRecipeRelations(recipeId: string | null | undefined) {
	const { data } = useSWR(recipeId ? `recipe-relations:${recipeId}` : null, () => fetchRecipeRelations(recipeId!), {
		revalidateOnFocus: false,
		dedupingInterval: 5 * 60 * 1000,
		errorRetryCount: 1,
	})
	const related = data || []
	return {
		made: related.filter((r) => r.item_type === "post"),
		continued: related.filter((r) => r.item_type === "recipe"),
	}
}
