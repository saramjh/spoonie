"use client"

import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { FeedItem } from "@/types/item"

// 참고 레시피 fetcher - SWR용
const fetchCitedRecipes = async (citedRecipeIds: string[]): Promise<FeedItem[]> => {
	if (!citedRecipeIds || citedRecipeIds.length === 0) {
		return []
	}

	const supabase = createSupabaseBrowserClient()
	console.log("📡 useCitedRecipes: Fetching cited recipes from database...")

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

	console.log("✅ useCitedRecipes: Cited recipes fetched successfully:", data)

	// FeedItem 형태로 매핑
	const mappedData = (data || []).map((recipe: Record<string, unknown>) => {
		const authorProfile = Array.isArray(recipe.profiles) ? recipe.profiles[0] : recipe.profiles

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { profiles, ...recipeWithoutAuthor } = recipe

		const mappedRecipe = {
			...recipeWithoutAuthor,
			item_id: recipe.id,
			content: "",
			description: "",
			tags: [],
			cited_recipe_ids: [],
			is_public: true,
			color_label: null,
			servings: null,
			cooking_time_minutes: null,
			recipe_id: null,
			comments_count: 0,
			likes_count: 0,
			has_liked: false,
			is_liked: false,
			username: authorProfile?.username || "익명",
			display_name: authorProfile?.display_name || authorProfile?.username || "익명",
			avatar_url: authorProfile?.avatar_url || null,
			user_public_id: authorProfile?.public_id || null,
			is_following: false,
			// UI에서 사용하는 author 필드 추가
			author: authorProfile || {
				username: "익명",
				display_name: null,
				public_id: null,
				avatar_url: null,
			},
		} as FeedItem

		// 데이터 매핑 완료

		return mappedRecipe
	})

	return mappedData
}

// 🚀 최적화된 참고 레시피 캐싱 훅 (스마트 캐시 전략)
export function useCitedRecipes(citedRecipeIds: string[] | null | undefined) {
	// citedRecipeIds가 없거나 빈 배열이면 null을 key로 사용하여 fetch 안함
	const cacheKey = citedRecipeIds && citedRecipeIds.length > 0 ? `cited-recipes:${citedRecipeIds.sort().join(",")}` : null

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

	console.log(`🔄 useCitedRecipes: Cache status for ${cacheKey}:`, {
		hasData: !!data,
		isLoading,
		dataLength: data?.length || 0,
		error: !!error,
	})

	return {
		citedRecipes: data || [],
		isLoading,
		error,
		// 수동으로 캐시 갱신이 필요한 경우에만 사용
		refreshCitedRecipes: mutate,
	}
}
 