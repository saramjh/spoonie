/**
 * 🚀 성능 최적화된 아이템 데이터 후크
 * 메모이제이션과 선택적 리렌더링으로 최적화
 */

import { useMemo, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { Item } from '@/types/item'
import { createSWRKey } from '@/lib/cache-keys'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

interface OptimizedItemOptions {
  // 어떤 필드 변경 시에만 리렌더링할지 선택
  watchFields?: (keyof Item)[]
  // 초기 데이터
  initialData?: Item
  // 자동 새로고침 주기 (ms)
  refreshInterval?: number
  // 포커스 시 재검증 여부
  revalidateOnFocus?: boolean
}

interface OptimizedItemReturn {
  item: Item | null | undefined
  isLoading: boolean
  error: any
  // 선택적 업데이트 함수들
  updateLikes: (count: number, hasLiked: boolean) => void
  updateComments: (count: number) => void
  updateFollow: (isFollowing: boolean) => void
  // 전체 새로고침
  refresh: () => void
}

/**
 * 성능 최적화된 아이템 데이터 후크
 */
export function useOptimizedItem(
  itemId: string | null,
  options: OptimizedItemOptions = {}
): OptimizedItemReturn {
  const {
    // watchFields = ['likes_count', 'comments_count', 'is_liked', 'is_following'], // Not used
    initialData,
    refreshInterval,
    revalidateOnFocus = false
  } = options

  const supabase = createSupabaseBrowserClient()

  // 🚀 SWR로 데이터 로드 + 캐싱
  const { data: item, error, mutate, isLoading } = useSWR(
    itemId ? createSWRKey.itemDetail(itemId) : null,
    async () => {
      if (!itemId) return null

      const { data, error } = await supabase
        .from('optimized_feed_view')
        .select('*')
        .eq('id', itemId)
        .single()

      if (error) throw error
      return data as Item
    },
    {
      fallbackData: initialData,
      refreshInterval,
      revalidateOnFocus,
      // 🎯 성능 최적화: 중복 제거
      dedupingInterval: 5000,
      // 🎯 성능 최적화: 에러 재시도 제한
      errorRetryCount: 2,
      errorRetryInterval: 3000
    }
  )

  // 🚀 메모이제이션된 선택적 업데이트 함수들
  const updateLikes = useCallback((count: number, hasLiked: boolean) => {
    if (!itemId) return

    mutate((currentItem: Item | null | undefined) => {
      if (!currentItem) return currentItem
      return {
        ...currentItem,
        likes_count: count,
        is_liked: hasLiked
      }
    }, { revalidate: false })
  }, [itemId, mutate])

  const updateComments = useCallback((count: number) => {
    if (!itemId) return

    mutate((currentItem: Item | null | undefined) => {
      if (!currentItem) return currentItem
      return {
        ...currentItem,
        comments_count: count
      }
    }, { revalidate: false })
  }, [itemId, mutate])

  const updateFollow = useCallback((isFollowing: boolean) => {
    if (!itemId) return

    mutate((currentItem: Item | null | undefined) => {
      if (!currentItem) return currentItem
      return {
        ...currentItem,
        is_following: isFollowing
      }
    }, { revalidate: false })
  }, [itemId, mutate])

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  // 🎯 성능 최적화: 메모이제이션된 반환값
  return useMemo(() => ({
    item,
    isLoading,
    error,
    updateLikes,
    updateComments,
    updateFollow,
    refresh
  }), [
    item,
    isLoading,
    error,
    updateLikes,
    updateComments,
    updateFollow,
    refresh
  ])
}

/**
 * 🚀 배치 업데이트용 후크 (여러 아이템 동시 업데이트)
 */
export function useBatchItemUpdates() {
  // const supabase = createSupabaseBrowserClient() // Not used in current implementation

  const batchUpdateLikes = useCallback(async (
    updates: Array<{ itemId: string; count: number; hasLiked: boolean }>
  ) => {
    // 배치로 여러 아이템의 좋아요 상태 업데이트
    updates.forEach(({ itemId, count, hasLiked }) => {
      const key = createSWRKey.itemDetail(itemId)
      mutate(key, (currentItem: Item | null | undefined) => {
        if (!currentItem) return currentItem
        return {
          ...currentItem,
          likes_count: count,
          is_liked: hasLiked
        }
      }, { revalidate: false })
    })
  }, [])

  return {
    batchUpdateLikes
  }
}

/**
 * 🎯 리스트 최적화용 후크 (무한 스크롤 최적화)
 */
export function useOptimizedItemList(cacheKey: string) {
  const updateItemInList = useCallback((
    itemId: string,
    updates: Partial<Item>
  ) => {
    mutate(
      (key: any) => typeof key === 'string' && key.startsWith(cacheKey),
      (data: Item[][] | undefined) => {
        if (!data || !Array.isArray(data)) return data

        return data.map(page =>
          page.map(item => {
            if (item.id === itemId || item.item_id === itemId) {
              return { ...item, ...updates }
            }
            return item
          })
        )
      },
      { revalidate: false }
    )
  }, [cacheKey])

  return {
    updateItemInList
  }
} 