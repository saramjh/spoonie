import { mutate } from 'swr'

/**
 * 🔄 통합 캐시 동기화 시스템
 * 서버 최적화 + 실시간 동기화를 모두 지원
 */

interface CacheSyncParams {
  itemId: string
  updateType: 'comment_add' | 'comment_delete' | 'like_add' | 'like_remove'
  delta: number
}

/**
 * 🚀 댓글/좋아요 변경 시 모든 관련 캐시 동기화
 * 1. 홈 피드 캐시 (useSWRInfinite)
 * 2. 상세 페이지 캐시
 * 3. 데이터베이스 뷰 새로고침
 */
export async function syncAllCaches(params: CacheSyncParams): Promise<void> {
  const { itemId, updateType, delta } = params
  
  console.log(`🔄 [CacheSync] Starting full sync for ${updateType} (${delta > 0 ? '+' : ''}${delta}) on item ${itemId}`)

  // 1. 홈 피드 캐시 즉시 업데이트 (Optimistic UI)
  updateHomeFeedCache(params)
  
  // 2. 상세 페이지 캐시 업데이트 
  updateItemDetailCache(params)
  
  // 3. 서버 뷰 강제 새로고침 (최종 데이터 정합성 보장)
  await forceViewRevalidation()
  
  console.log(`✅ [CacheSync] Full sync completed for item ${itemId}`)
}

/**
 * 홈 피드 캐시 업데이트 (useSWRInfinite 구조 지원)
 */
function updateHomeFeedCache({ itemId, updateType, delta }: CacheSyncParams): void {
  console.log(`📱 [CacheSync] Updating home feed cache: ${updateType} ${delta > 0 ? '+' : ''}${delta}`)
  
  // useSWRInfinite 캐시 구조 처리
  mutate(
    (key) => typeof key === 'string' && key.startsWith('items|') && !key.includes('cited-recipes'),
    (data: unknown) => {
      if (!Array.isArray(data)) {
        console.log(`⚠️ [CacheSync] Unexpected data type: ${typeof data}`)
        return data
      }

      let updateCount = 0
      const updatedData = data.map((page: unknown) => {
        if (!Array.isArray(page)) return page

        return page.map((item: Record<string, unknown>) => {
          if (item.id === itemId || item.item_id === itemId) {
            const countField = updateType.includes('comment') ? 'comments_count' : 'likes_count'
            const currentCount = (item[countField] as number) || 0
            const newCount = Math.max(0, currentCount + delta)
            
            updateCount++
            console.log(`✅ [CacheSync] Updated ${countField}: ${currentCount} → ${newCount}`)
            
            return {
              ...item,
              [countField]: newCount
            }
          }
          return item
        })
      })

      if (updateCount === 0) {
        console.log(`⚠️ [CacheSync] Item ${itemId} not found in home feed cache`)
      }

      return updatedData
    },
    { revalidate: false } // 즉시 업데이트, 서버 검증은 나중에
  )
}

/**
 * 상세 페이지 캐시 업데이트
 */
function updateItemDetailCache({ itemId, updateType, delta }: CacheSyncParams): void {
  console.log(`📄 [CacheSync] Updating detail page cache for item ${itemId}`)
  
  // 상세 페이지 캐시 업데이트
  mutate(
    `item_details_${itemId}`,
    (data: Record<string, unknown> | undefined) => {
      if (!data) return data

      const countField = updateType.includes('comment') ? 'comments_count' : 'likes_count'
      const currentCount = (data[countField] as number) || 0
      const newCount = Math.max(0, currentCount + delta)
      
      console.log(`✅ [CacheSync] Updated detail ${countField}: ${currentCount} → ${newCount}`)
      
      return {
        ...data,
        [countField]: newCount
      }
    },
    { revalidate: false }
  )
  
  // 댓글 섹션 캐시도 새로고침 (댓글 변경인 경우)
  if (updateType.includes('comment')) {
    mutate(`comments_${itemId}`)
  }
}

/**
 * 🔄 데이터베이스 뷰 강제 새로고침
 * 최종 데이터 정합성을 위해 서버에서 최신 데이터 가져오기
 */
async function forceViewRevalidation(): Promise<void> {
  console.log(`🔄 [CacheSync] Force revalidating database view...`)
  
  // 짧은 지연 후 전체 새로고침 (DB 트랜잭션 완료 대기)
  setTimeout(() => {
    mutate(
      (key) => typeof key === 'string' && key.startsWith('items|'),
      undefined,
      { revalidate: true }
    )
    console.log(`✅ [CacheSync] Database view revalidation triggered`)
  }, 500) // 500ms 후 서버 검증
}

/**
 * 🏠 페이지 전환 시 홈 피드 강제 새로고침
 * 뒤로가기 등으로 홈으로 돌아올 때 최신 데이터 보장
 */
export function refreshHomeFeedOnReturn(): void {
  console.log(`🏠 [CacheSync] Refreshing home feed on return`)
  
  mutate(
    (key) => typeof key === 'string' && key.startsWith('items|'),
    undefined,
    { revalidate: true }
  )
}

/**
 * 🧹 특정 아이템의 모든 캐시 무효화 (강력한 새로고침)
 */
export function invalidateAllItemCaches(itemId: string): void {
  console.log(`🧹 [CacheSync] Invalidating all caches for item ${itemId}`)
  
  // 모든 관련 캐시 무효화
  mutate(`item_details_${itemId}`)
  mutate(`comments_${itemId}`)
  mutate(`likers|${itemId}`)
  
  // 홈 피드도 강제 새로고침
  mutate(
    (key) => typeof key === 'string' && key.startsWith('items|'),
    undefined,
    { revalidate: true }
  )
}

/**
 * 🔍 React Hook: 컴포넌트에서 쉽게 사용할 수 있는 인터페이스
 */
export function useFeedCacheSync() {
  const syncComment = (itemId: string, delta: number) => {
    syncAllCaches({
      itemId,
      updateType: delta > 0 ? 'comment_add' : 'comment_delete',
      delta
    })
  }

  const syncLike = (itemId: string, delta: number) => {
    syncAllCaches({
      itemId,
      updateType: delta > 0 ? 'like_add' : 'like_remove',
      delta
    })
  }

  return {
    syncComment,
    syncLike,
    refreshOnReturn: refreshHomeFeedOnReturn,
    invalidateItem: invalidateAllItemCaches,
  }
}

/**
 * 🐛 디버깅용: 현재 캐시 상태 확인
 */
export function debugCacheState(): void {
  if (typeof window !== 'undefined') {
    console.log('🔍 [CacheSync] Current cache keys:')
    // SWR 캐시 내용을 콘솔에 출력 (개발용)
    console.log('Items cache keys:', Object.keys(window.localStorage).filter(k => k.includes('items')))
  }
} 