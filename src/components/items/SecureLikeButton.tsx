/**
 * 🔐 보안 및 동시성 강화된 좋아요 버튼
 * Race Condition 방지, 낙관적 업데이트 안전성, 네트워크 오류 복구
 */

"use client"

import { useState, useCallback, useEffect, useRef } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

// 보안 및 동시성 유틸리티
import { withMutex, concurrencyManager } from '@/utils/concurrency-safety'
import { useRetryableOperation, useOnlineStatus } from '@/hooks/useNetworkError'
import { cacheManager } from '@/lib/unified-cache-manager'

// ================================
// 1. 타입 정의
// ================================

interface SecureLikeButtonProps {
  itemId: string
  initialLikesCount: number
  initialHasLiked: boolean
  currentUserId?: string
  onStateChange?: (likesCount: number, hasLiked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  className?: string
}

interface LikeState {
  likesCount: number
  hasLiked: boolean
  isLoading: boolean
  lastError: string | null
  optimisticUpdateId: string | null
}

// ================================
// 2. 메인 컴포넌트
// ================================

export default function SecureLikeButton({
  itemId,
  initialLikesCount,
  initialHasLiked,
  currentUserId,
  onStateChange,
  disabled = false,
  size = 'md',
  showCount = true,
  className = ''
}: SecureLikeButtonProps) {

  // ================================
  // 3. 상태 관리
  // ================================

  const [state, setState] = useState<LikeState>({
    likesCount: initialLikesCount,
    hasLiked: initialHasLiked,
    isLoading: false,
    lastError: null,
    optimisticUpdateId: null
  })

  const supabase = createSupabaseBrowserClient()
  const { isOnline } = useOnlineStatus()
  const debounceRef = useRef<NodeJS.Timeout>()
  const mountedRef = useRef(true)

  // 동시성 관리자에서 낙관적 업데이트 매니저 가져오기
  const optimisticManager = concurrencyManager.getOptimisticManager<LikeState>(`like-${itemId}`)

  // ================================
  // 4. 네트워크 재시도 로직
  // ================================

  const {
    execute: executeLikeOperation,
    isRetrying,
    retryCount,
    lastError: networkError
  } = useRetryableOperation(
    () => performLikeOperation(),
    {
      enableToast: false, // 커스텀 에러 처리
      enableRetry: true,
      retryConfig: { maxAttempts: 3, baseDelay: 1000 }
    }
  )

  // ================================
  // 5. 실제 좋아요 API 호출
  // ================================

  const performLikeOperation = useCallback(async (): Promise<LikeState> => {
    if (!currentUserId) {
      throw new Error('로그인이 필요합니다.')
    }

    const newHasLiked = !state.hasLiked
    const newLikesCount = state.likesCount + (newHasLiked ? 1 : -1)

    if (newHasLiked) {
      // 좋아요 추가
      const { error } = await supabase
        .from('likes')
        .insert({
          item_id: itemId,
          user_id: currentUserId
        })

      if (error) {
        // Unique constraint 위반은 이미 좋아요가 있다는 의미
        if (error.code === '23505') {
          return {
            ...state,
            hasLiked: true,
            isLoading: false,
            lastError: null
          }
        }
        throw new Error(`좋아요 추가 실패: ${error.message}`)
      }
    } else {
      // 좋아요 제거
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('item_id', itemId)
        .eq('user_id', currentUserId)

      if (error) {
        throw new Error(`좋아요 제거 실패: ${error.message}`)
      }
    }

    // 캐시 업데이트
    await updateAllCaches(itemId, newLikesCount, newHasLiked)

    return {
      ...state,
      likesCount: newLikesCount,
      hasLiked: newHasLiked,
      isLoading: false,
      lastError: null
    }
  }, [itemId, currentUserId, state, supabase])

  // ================================
  // 6. 좋아요 토글 처리 (동시성 제어)
  // ================================

  const toggleLike = useCallback(async () => {
    // 기본 가드
    if (!currentUserId || state.isLoading || disabled || !isOnline) {
      if (!currentUserId) {
        toast({
          title: "로그인 필요",
          description: "좋아요를 누르려면 로그인해주세요.",
          variant: "destructive"
        })
      } else if (!isOnline) {
        toast({
          title: "오프라인 상태",
          description: "네트워크 연결을 확인해주세요.",
          variant: "destructive"
        })
      }
      return
    }

    // 디바운싱 (빠른 연속 클릭 방지)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(async () => {
      await performSecureLikeToggle()
    }, 300)

  }, [currentUserId, state.isLoading, disabled, isOnline])

  // ================================
  // 7. 보안 좋아요 토글 수행
  // ================================

  const performSecureLikeToggle = useCallback(async () => {
    const operationId = `like-${itemId}-${Date.now()}`
    
    return withMutex(`like-button-${itemId}`, async () => {
      // 현재 상태 백업
      const backupState = { ...state }
      const newHasLiked = !state.hasLiked
      const newLikesCount = state.likesCount + (newHasLiked ? 1 : -1)

      // 낙관적 업데이트
      const optimisticState: LikeState = {
        likesCount: newLikesCount,
        hasLiked: newHasLiked,
        isLoading: true,
        lastError: null,
        optimisticUpdateId: operationId
      }

      setState(optimisticState)
      onStateChange?.(newLikesCount, newHasLiked)

      try {
        // 낙관적 업데이트 관리자를 통한 안전한 업데이트
        await optimisticManager.performOptimisticUpdate(
          operationId,
          backupState,
          optimisticState,
          () => performLikeOperation(),
          () => {
            // 롤백 함수
            setState(backupState)
            onStateChange?.(backupState.likesCount, backupState.hasLiked)
          },
          {
            timeout: 10000, // 10초 타임아웃
            onSuccess: (finalState) => {
              if (mountedRef.current) {
                setState({
                  ...finalState,
                  isLoading: false,
                  optimisticUpdateId: null
                })
              }
            },
            onError: (error, originalState) => {
              if (mountedRef.current) {
                setState({
                  ...originalState,
                  isLoading: false,
                  lastError: error instanceof Error ? error.message : 'Unknown error',
                  optimisticUpdateId: null
                })
                
                toast({
                  title: "좋아요 처리 실패",
                  description: "잠시 후 다시 시도해주세요.",
                  variant: "destructive"
                })
              }
            }
          }
        )

      } catch (error) {
        // 최종 에러 처리는 낙관적 업데이트 매니저에서 수행됨
        console.error('Like operation failed:', error)
      }
    })
  }, [itemId, state, onStateChange, optimisticManager, performLikeOperation])

  // ================================
  // 8. 캐시 업데이트
  // ================================

  const updateAllCaches = async (
    itemId: string,
    likesCount: number,
    hasLiked: boolean
  ): Promise<void> => {
    try {
      // SWR 캐시 업데이트
      const cacheKeys = [
        `/api/items/${itemId}`,
        '/api/items',
        '/api/items/home-feed',
        `/api/users/posts?userId=${currentUserId}`
      ]

      for (const key of cacheKeys) {
        await cacheManager.updateItemInCache(key, itemId, {
          likes_count: likesCount,
          has_liked: hasLiked
        })
      }
    } catch (error) {
      console.warn('Cache update failed:', error)
    }
  }

  // ================================
  // 9. 프로퍼티 변경 감지
  // ================================

  useEffect(() => {
    setState(prev => ({
      ...prev,
      likesCount: initialLikesCount,
      hasLiked: initialHasLiked
    }))
  }, [initialLikesCount, initialHasLiked])

  // ================================
  // 10. 클린업
  // ================================

  useEffect(() => {
    mountedRef.current = true
    
    return () => {
      mountedRef.current = false
      
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      
      // 진행 중인 낙관적 업데이트 취소
      if (state.optimisticUpdateId) {
        optimisticManager.cancelUpdate(state.optimisticUpdateId)
      }
    }
  }, [state.optimisticUpdateId, optimisticManager])

  // ================================
  // 11. 크기별 스타일
  // ================================

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'h-6 w-6 text-xs'
      case 'lg':
        return 'h-12 w-12 text-lg'
      default:
        return 'h-8 w-8 text-sm'
    }
  }

  const getIconSize = (size: string) => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3'
      case 'lg':
        return 'w-6 h-6'
      default:
        return 'w-4 h-4'
    }
  }

  // ================================
  // 12. 렌더링
  // ================================

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        className={`${getSizeClasses(size)} ${
          state.hasLiked 
            ? 'text-red-500 hover:text-red-600' 
            : 'text-gray-500 hover:text-red-500'
        } transition-colors duration-200 ${
          state.isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={toggleLike}
        disabled={disabled || state.isLoading || !isOnline}
        aria-label={state.hasLiked ? '좋아요 취소' : '좋아요'}
      >
        <Heart 
          className={`${getIconSize(size)} ${
            state.hasLiked ? 'fill-current' : ''
          } ${state.isLoading ? 'animate-pulse' : ''}`}
        />
      </Button>
      
      {showCount && (
        <span className={`font-medium ${
          state.hasLiked ? 'text-red-500' : 'text-gray-600'
        } transition-colors duration-200 ${
          isRetrying ? 'animate-pulse' : ''
        }`}>
          {state.likesCount.toLocaleString()}
        </span>
      )}

      {/* 재시도 상태 표시 */}
      {isRetrying && (
        <span className="text-xs text-orange-500 ml-1">
          ({retryCount}/3)
        </span>
      )}
    </div>
  )
}