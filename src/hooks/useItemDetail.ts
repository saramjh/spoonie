"use client"

import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { ItemDetail } from "@/types/item"
import { fetchItemDetail } from "@/lib/item-detail"

const itemDetailFetcher = (key: string): Promise<ItemDetail> =>
	fetchItemDetail(createSupabaseBrowserClient(), key.replace('item_details_', ''))

// 통합 아이템 상세 훅
// initialItem: 서버에서 미리 조회한 데이터. 초기 HTML에 본문을 포함시키고, 마운트 후 최신 상태로 갱신한다.
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
			revalidateOnMount: true,
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