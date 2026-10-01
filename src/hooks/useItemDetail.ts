"use client"

import { useEffect } from "react"
import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { ItemDetail } from "@/types/item"
import { fetchItemDetail } from "@/lib/item-detail"

const itemDetailFetcher = (key: string): Promise<ItemDetail> =>
	fetchItemDetail(createSupabaseBrowserClient(), key.replace('item_details_', ''))

// 통합 아이템 상세 훅
// initialItem: 미리 만든 공개 페이지에 담긴 데이터 (로그인 정보 없이 만든 것).
// 비로그인 방문자는 그대로 쓰고 다시 받지 않는다. 로그인 사용자는 내 좋아요·저장 상태와 최신 수를 위해 한 번 다시 받는다.
// 공개 데이터가 없으면(비공개 글·없는 글) 처음부터 로그인 세션으로 받는다.
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

	// 로그인 세션이 있으면(브라우저 저장소에서 바로 확인, 네트워크 없음) 사용자 기준으로 한 번 다시 받는다
	useEffect(() => {
		if (!swrKey || !initialItem) return
		createSupabaseBrowserClient()
			.auth.getSession()
			.then(({ data: { session } }) => {
				if (session) mutate()
			})
	}, [swrKey, initialItem, mutate])

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