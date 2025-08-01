/**
 * 🎯 검증된 업계 표준 좋아요 시스템
 * Instagram/Twitter/Facebook 검증된 패턴
 * 
 * 원칙:
 * 1. 단순함 > 복잡함
 * 2. 예측 가능한 동작
 * 3. 에러 시 안전한 폴백
 * 4. 서버 효율성
 */

"use client"

import { useState, useCallback, useEffect } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { mutate } from "swr"

interface UseRobustLikeProps {
  itemId: string
  initialLikesCount: number
  initialHasLiked: boolean
  currentUserId?: string | null
  onStateChange?: (likesCount: number, hasLiked: boolean) => void
}

interface UseRobustLikeReturn {
  likesCount: number
  hasLiked: boolean
  isLoading: boolean
  toggleLike: () => Promise<void>
  // 디버깅용
  _debugState: {
    lastAction: string
    lastError: string | null
    dbState: boolean | null
  }
}

export function useRobustLike({
  itemId,
  initialLikesCount,
  initialHasLiked,
  currentUserId,
  onStateChange
}: UseRobustLikeProps): UseRobustLikeReturn {
  
  // 🎯 단순한 상태 관리
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [hasLiked, setHasLiked] = useState(initialHasLiked)
  const [isLoading, setIsLoading] = useState(false)
  
  // 디버깅 상태
  const [debugState, setDebugState] = useState({
    lastAction: 'init',
    lastError: null as string | null,
    dbState: null as boolean | null
  })

  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  // 🔄 초기 상태와 props 동기화 (한 번만)
  useEffect(() => {
    if (likesCount !== initialLikesCount || hasLiked !== initialHasLiked) {
      setLikesCount(initialLikesCount)
      setHasLiked(initialHasLiked)
      setDebugState(prev => ({ ...prev, lastAction: 'sync_with_props' }))
    }
  }, [initialLikesCount, initialHasLiked, likesCount, hasLiked])

  /**
   * 🚀 업계 표준 좋아요 토글 - 3단계 검증된 프로세스
   */
  const toggleLike = useCallback(async () => {
    // 🚫 기본 가드
    if (!currentUserId || isLoading) {
      if (!currentUserId) {
        toast({
          title: "로그인이 필요합니다",
          description: "좋아요를 누르려면 로그인해주세요.",
          variant: "destructive"
        })
      }
      return
    }

    const actionId = Date.now().toString()
    // console.log(`🎯 [${actionId}] Like toggle START for ${itemId}`)

    // 현재 상태 백업
    const backupState = { likesCount, hasLiked }
    const targetState = {
      likesCount: hasLiked ? likesCount - 1 : likesCount + 1,
      hasLiked: !hasLiked
    }

    setIsLoading(true)
    setDebugState(prev => ({ 
      ...prev, 
      lastAction: `toggle_${targetState.hasLiked ? 'add' : 'remove'}`,
      lastError: null 
    }))

    try {
      // 🚀 STEP 1: 즉시 UI 업데이트 (사용자 체감 0ms)
      setLikesCount(targetState.likesCount)
      setHasLiked(targetState.hasLiked)
      onStateChange?.(targetState.likesCount, targetState.hasLiked)
      
      // console.log(`🎯 [${actionId}] UI updated: ${backupState.hasLiked} → ${targetState.hasLiked}`)

      // 🚀 STEP 2: 전역 캐시 즉시 업데이트
      await updateAllCaches(itemId, targetState.likesCount, targetState.hasLiked)
      
      // console.log(`🎯 [${actionId}] Caches updated`)

      // 🚀 STEP 3: DB 업데이트 (안전한 upsert 방식)
      if (targetState.hasLiked) {
        // 좋아요 추가
        const { error } = await supabase
          .from('likes')
          .upsert(
            { 
              item_id: itemId, 
              user_id: currentUserId,
              created_at: new Date().toISOString()
            },
            { 
              onConflict: 'user_id,item_id',
              ignoreDuplicates: false 
            }
          )
        
        if (error) throw error
      } else {
        // 좋아요 제거
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('item_id', itemId)
          .eq('user_id', currentUserId)
        
        if (error && error.code !== 'PGRST116') { // 404는 이미 삭제된 것이므로 무시
          throw error
        }
      }

      // console.log(`✅ [${actionId}] DB updated successfully`)
      
      // 성공 시 디버그 상태 업데이트
      setDebugState(prev => ({ 
        ...prev, 
        dbState: targetState.hasLiked,
        lastError: null 
      }))

    } catch (error) {
      // 🚀 STEP 4: 에러 시 완전 롤백
      console.error(`❌ [${actionId}] Error:`, error)
      
      // UI 상태 롤백
      setLikesCount(backupState.likesCount)
      setHasLiked(backupState.hasLiked)
      onStateChange?.(backupState.likesCount, backupState.hasLiked)
      
      // 캐시 상태 롤백
      await updateAllCaches(itemId, backupState.likesCount, backupState.hasLiked)
      
      // 에러 기록
      const errorMessage = error instanceof Error ? error.message : String(error)
      setDebugState(prev => ({ 
        ...prev, 
        lastError: errorMessage 
      }))
      
      // 사용자 알림
      toast({
        title: "좋아요 처리 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive"
      })
      
      // console.log(`🔄 [${actionId}] Rolled back to: ${backupState.hasLiked}`)
    } finally {
      setIsLoading(false)
    }
  }, [itemId, currentUserId, likesCount, hasLiked, isLoading, onStateChange, toast, supabase])

  return {
    likesCount,
    hasLiked,
    isLoading,
    toggleLike,
    _debugState: debugState
  }
}

/**
 * 🌐 전역 캐시 업데이트 - 검증된 패턴
 */
async function updateAllCaches(
  itemId: string,
  likesCount: number,
  hasLiked: boolean
): Promise<void> {
  
  const updateItem = (item: any) => {
    if (!item || (item.id !== itemId && item.item_id !== itemId)) {
      return item
    }
    return {
      ...item,
      likes_count: likesCount,
      is_liked: hasLiked
    }
  }

  const updateInfiniteData = (data: any[][] | undefined) => {
    if (!Array.isArray(data)) return data
    
    return data.map(page => {
      if (!Array.isArray(page)) return page
      return page.map(updateItem)
    })
  }

  try {
    // 모든 관련 캐시 업데이트
    await Promise.all([
      // 홈피드
      mutate(
        (key) => typeof key === 'string' && key.startsWith('items|'),
        updateInfiniteData,
        { revalidate: false }
      ),
      // 레시피북  
      mutate(
        (key) => typeof key === 'string' && key.startsWith('recipes|'),
        updateInfiniteData,
        { revalidate: false }
      ),
      // 프로필 페이지
      mutate(
        (key) => typeof key === 'string' && key.includes('user_items_'),
        updateInfiniteData,
        { revalidate: false }
      ),
      // 상세페이지
      mutate(
        `item_details_${itemId}`,
        updateItem,
        { revalidate: false }
      )
    ])
    
    // console.log(`🔄 Cache sync completed for item ${itemId}: likes=${likesCount}, liked=${hasLiked}`)
  } catch (error) {
    console.warn(`⚠️ Cache update failed (non-critical):`, error)
  }
} 