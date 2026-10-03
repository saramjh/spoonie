"use client"

import useSWR from "swr"
import { fetchAuthorPublicRecipes, fetchCitedRecipeCards, fetchRecipeRelations } from "@/features/recipe/data/related-recipes"

// 최적화된 참고 레시피 캐싱 훅 (스마트 캐시 전략)
export function useCitedRecipes(citedRecipeIds: string[] | null | undefined) {
	// citedRecipeIds가 없거나 빈 배열이면 null을 key로 사용하여 fetch 안함
	const cacheKey = citedRecipeIds && citedRecipeIds.length > 0 ? `cited-recipes:${[...citedRecipeIds].sort().join(",")}` : null

	const { data, error, isLoading, mutate } = useSWR(cacheKey, () => fetchCitedRecipeCards(citedRecipeIds!), {
		// 스마트 캐싱 최적화 설정
		revalidateOnFocus: false, // 포커스 시 재검증 안함
		revalidateOnReconnect: true, // 재연결 시에는 재검증 (네트워크 문제 대응)
		dedupingInterval: 15 * 60 * 1000, // 15분 동안 중복 요청 방지 (1시간→15분으로 단축)
		focusThrottleInterval: 30 * 60 * 1000, // 30분 동안 포커스 throttle (균형)
		errorRetryCount: 1, // 에러 시 최대 1번 재시도 (서버 부담 감소)
		refreshInterval: 0, // 자동 새로고침 비활성화
		refreshWhenHidden: false,
		refreshWhenOffline: false,
		// fallbackData를 통한 즉시 응답 (있을 때만)
		fallbackData: undefined,
		// 서버 부담 최소화를 위한 조건부 재검증
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

// 작성자의 다른 공개 레시피 (작성자 발견: 레시피드·레시피를 보다가 그 사람의 다른 레시피로)
export function useAuthorRecipes(authorId: string | null | undefined, excludeId: string | null | undefined) {
	const { data } = useSWR(authorId ? `author-recipes:${authorId}` : null, () => fetchAuthorPublicRecipes(authorId!), { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 })
	return (data || []).filter((r) => r.id !== excludeId).slice(0, 4)
}
