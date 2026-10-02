"use client"

import { useState } from "react"
import { useItemDetail } from "@/hooks/useItemDetail"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import type { Item, ItemDetail } from "@/types/item"

/**
 * 수정 화면의 처음 값: 서버의 완전한 글(재료·단계·참고 레시피 포함)에, 화면 캐시의 최신 사진 순서·썸네일을 얹는다.
 * 한 번 정해지면 고정한다 (쓰는 도중 다른 곳의 갱신으로 폼이 바뀌지 않게).
 * 서버 글을 못 받았지만 화면 캐시에 그 글이 있으면(비공개 → 공개 전환 직후 등) 캐시로 시작한다.
 */
export function useEditInitialData(itemId: string) {
	const { item: baseItem, isLoading, error } = useItemDetail(itemId)
	const cachedItem = useSSAItemCache(itemId, (baseItem ?? { id: itemId, item_id: itemId }) as Item)
	const [initialData, setInitialData] = useState<ItemDetail | null>(null)

	// 처음 값이 준비되는 렌더에서 한 번만 정한다 (effect로 옮겨 담으면 렌더가 한 번 더 일어난다)
	if (!initialData) {
		if (baseItem) {
			setInitialData({
				...baseItem,
				thumbnail_index: cachedItem.thumbnail_index,
				image_urls: cachedItem.image_urls,
				likes_count: cachedItem.likes_count,
				is_liked: cachedItem.is_liked,
				comments_count: cachedItem.comments_count,
			} as ItemDetail)
		} else if (!isLoading && cachedItem.user_id) {
			setInitialData(cachedItem as ItemDetail)
		}
	}

	return { initialData, isLoading, error, hasItem: !!baseItem }
}
