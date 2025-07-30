"use client"

import useSWR from 'swr'
import { Item } from '@/types/item'

import { useEffect } from 'react'

export function useSSAItemCache(itemId: string, fallbackData: Item) {
  const { data: cachedItem, mutate } = useSWR(`itemDetail|${itemId}`, null, {
    fallbackData,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  // 🚀 SSA 수정: 캐시가 비어있으면 fallbackData로 채우기 (이미지 보존)
  useEffect(() => {
    if (!cachedItem && fallbackData) {
      console.log(`🔄 [useSSAItemCache] Populating cache for ${itemId}:`, {
        fallbackImages: fallbackData.image_urls?.length || 0,
        fallbackUrls: fallbackData.image_urls
      })
      mutate(fallbackData, { revalidate: false })
    }
  }, [cachedItem, fallbackData, itemId, mutate])

  // 🔧 캐시가 채워지면 캐시 우선, 아니면 fallbackData 사용
  const finalItem = cachedItem || fallbackData
  
  // 🔍 CRITICAL DEBUG: 최종 데이터 확인
  console.log(`📊 [useSSAItemCache ${itemId}] Final result:`, {
    source: cachedItem ? 'cache' : 'fallback',
    finalImages: finalItem?.image_urls?.length || 0,
    finalUrls: finalItem?.image_urls,
    likes: finalItem?.likes_count,
    liked: finalItem?.is_liked
  })
  
  return finalItem
} 