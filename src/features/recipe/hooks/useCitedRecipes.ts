"use client"

import useSWR from "swr"
import { fetchAuthorPublicRecipes, fetchCitedRecipeCards, fetchRecipeRelations } from "@/features/recipe/data/related-recipes"
import { useSessionStore } from "@/store/sessionStore"
import { viewerCacheKey } from "@/shared/infra/viewer-cache-key"

export function useCitedRecipes(citedRecipeIds: string[] | null | undefined) {
	// citedRecipeIds가 없거나 빈 배열이면 null을 key로 사용하여 fetch 안함
	const viewerId = useSessionStore(state => state.session?.id ?? null)
	const authLoading = useSessionStore(state => state.isInitialLoad)
	const ids = citedRecipeIds?.length ? [...new Set(citedRecipeIds)].sort().join(",") : null
	const cacheKey = viewerCacheKey("cited-recipes", ids, viewerId, authLoading)

	const { data, error, isLoading, mutate } = useSWR(cacheKey, () => fetchCitedRecipeCards(citedRecipeIds!), {
		revalidateOnFocus: true, // Privacy/access changes should not persist through an entire session.
		dedupingInterval: 60 * 1000,
		focusThrottleInterval: 60 * 1000,
		errorRetryCount: 1,
	})



	return {
		citedRecipes: data || [],
		isLoading: isLoading || Boolean(ids && authLoading),
		error,
		// 수동으로 캐시 갱신이 필요한 경우에만 사용
		refreshCitedRecipes: mutate,
	}
}
 
export function useRecipeRelations(recipeId: string | null | undefined) {
	const viewerId = useSessionStore(state => state.session?.id ?? null)
	const authLoading = useSessionStore(state => state.isInitialLoad)
	const { data } = useSWR(viewerCacheKey("recipe-relations", recipeId, viewerId, authLoading), () => fetchRecipeRelations(recipeId!), {
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
