"use client"

import { useEffect } from "react"
import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import type { ItemDetail } from "@/types/item"
import { fetchItemDetail } from "@/features/feed/data/item-detail"
import { viewerCacheKey } from "@/shared/infra/viewer-cache-key"
import { useSessionStore } from "@/store/sessionStore"

// 통합 아이템 상세 훅
// initialItem: 미리 만든 공개 페이지에 담긴 데이터 (로그인 정보 없이 만든 것).
// 비로그인 방문자는 그대로 쓰고 다시 받지 않는다. 로그인 사용자는 내 좋아요·저장 상태와 최신 수를 위해 한 번 다시 받는다.
// 공개 데이터가 없으면(비공개 글·없는 글) 처음부터 로그인 세션으로 받는다.
export function useItemDetail(itemId: string | null, initialItem?: ItemDetail | null) {
	const viewerId = useSessionStore(state => state.session?.id ?? null)
	const authLoading = useSessionStore(state => state.isInitialLoad)
	const swrKey = viewerCacheKey("item_details", itemId, viewerId, authLoading)

	const { data, error, mutate, isLoading } = useSWR(
		swrKey,
		([, , id]) => fetchItemDetail(createSupabaseBrowserClient(), id),
		{
			revalidateOnFocus: false,
			dedupingInterval: 30000, // 30초 중복 방지
			errorRetryCount: 3,
			errorRetryInterval: 5000, // 5초 간격으로 재시도
			fallbackData: initialItem ?? undefined,
			revalidateOnMount: Boolean(viewerId) || !initialItem,
			revalidateIfStale: Boolean(viewerId) || !initialItem,
		}
	)

	// Logging during render runs again on unrelated state changes. Log only
	// when the failed request (or its item) actually changes.
	useEffect(() => {
		if (error) console.error(`useItemDetail: request failed for ${itemId}:`, error)
	}, [error, itemId])

	return {
		item: data,
		// Private detail with no SSR fallback must show skeleton, not a false error,
		// while viewer identity is still being checked.
		isLoading: isLoading || Boolean(itemId && authLoading && !initialItem),
		error,
		mutate, // 캐시 수동 업데이트용
		refresh: () => mutate(), // 새로고침용
	}
}