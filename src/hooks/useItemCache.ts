"use client"

import useSWR from 'swr'
import { Item } from '@/types/item'

import { useEffect } from 'react'

export function useItemCache(itemId: string, fallbackData: Item) {
  const { data: cachedItem, mutate } = useSWR(`itemDetail|${itemId}`, null, {
    fallbackData,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  // 개별 캐시가 비었을 때 목록 데이터로 복원해 이미지 등 원본 필드를 잃지 않는다.
  useEffect(() => {
    if (!cachedItem && fallbackData) {
      // 캐시가 완전히 비어있는 경우
      mutate(fallbackData, { revalidate: false })
    } else if (cachedItem && fallbackData) {
      // 이미지 손실 감지 및 복원 로직
      const cacheHasNoImages = !cachedItem.image_urls || cachedItem.image_urls.length === 0
      const fallbackHasImages = fallbackData.image_urls && fallbackData.image_urls.length > 0
      
      if (cacheHasNoImages && fallbackHasImages) {
        // 캐시에서 이미지가 손실된 경우, fallbackData의 이미지로 복원
        const restoredItem = {
          ...cachedItem,
          image_urls: fallbackData.image_urls,
          thumbnail_index: fallbackData.thumbnail_index ?? cachedItem.thumbnail_index
        }
        mutate(restoredItem, { revalidate: false })
      }
    }
  }, [cachedItem, fallbackData, itemId, mutate])

  // 캐시가 채워지면 캐시 우선, 아니면 fallbackData 사용
  const finalItem = cachedItem || fallbackData
  

  
  return finalItem
} 