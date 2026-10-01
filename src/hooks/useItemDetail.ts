"use client"

import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { ItemDetail } from "@/types/item"
import { fetchItemDetail } from "@/lib/item-detail"

const itemDetailFetcher = (key: string): Promise<ItemDetail> =>
	fetchItemDetail(createSupabaseBrowserClient(), key.replace('item_details_', ''))

// 통합 아이템 상세 훅
// initialItem: 서버에서 미리 조회한 데이터. 상세 페이지는 요청마다 서버에서 새로 그리므로 이미 최신이다.
// 서버 데이터가 있으면 마운트 직후 같은 데이터를 다시 받지 않는다 (DB 조회가 두 배가 되던 문제).
// 좋아요·댓글 수 같은 즉시 반영 값은 useSSAItemCache와 Realtime이 맡는다.
export function useItemDetail(itemId: string | null, initialItem?: ItemDetail | null) {
	const swrKey = itemId ? `item_details_${itemId}` : null

	const { data, error, mutate, isLoading } = useSWR(
		swrKey,
		itemDetailFetcher,
		{
			revalidateOnFocus: false,
			dedupingInterval: 30000, // 30초 중복 방지
			errorRetryCount: 3,
			errorRetryInterval: 5000, // 5초 간격으로 재시도
			fallbackData: initialItem ?? undefined,
			revalidateOnMount: !initialItem,
			revalidateIfStale: !initialItem,
		}
	)

	// 디버깅 로그 추가
	if (error) {
		console.error(`❌ useItemDetail: SWR error for item ${itemId}:`, error)
	}

	return {
		item: data,
		isLoading,
		error,
		mutate, // 캐시 수동 업데이트용
		refresh: () => mutate(), // 새로고침용
	}
}