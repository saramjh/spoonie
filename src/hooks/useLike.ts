/**
 * 🎯 업계 표준 좋아요 훅 - 완전한 관심사 분리
 * Instagram/Twitter/Facebook 방식의 robust한 좋아요 시스템
 * 
 * 책임:
 * - 좋아요 상태 관리 (로컬 + 서버)
 * - 옵티미스틱 업데이트 + 자동 롤백
 * - 에러 처리 및 사용자 피드백
 * - 캐시 동기화 (전역)
 */

"use client"

import { useState, useCallback } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { mutate } from "swr"

interface UseLikeOptions {
  itemId: string
  initialLikesCount: number
  initialHasLiked: boolean
  currentUserId?: string | null
  onLikeChange?: (likesCount: number, hasLiked: boolean) => void
}

interface UseLikeReturn {
  likesCount: number
  hasLiked: boolean
  isLoading: boolean
  toggleLike: () => Promise<void>
}

/**
 * 🎯 좋아요 기능 훅 - 업계 표준 구현
 */
export function useLike({
  itemId,
  initialLikesCount,
  initialHasLiked,
  currentUserId,
  onLikeChange
}: UseLikeOptions): UseLikeReturn {
  
  // 🎯 상태 관리 - 단순하고 명확
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [hasLiked, setHasLiked] = useState(initialHasLiked)
  const [isLoading, setIsLoading] = useState(false)
  
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  /**
   * 🚀 좋아요 토글 - 3단계 프로세스
   * 1. 즉시 UI 업데이트 (0ms 응답)
   * 2. 서버 업데이트 (백그라운드)
   * 3. 에러 시 자동 롤백
   */
  const toggleLike = useCallback(async () => {
    // 🚫 가드 조건
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

    // 백업 데이터 초기화 (catch 블록에서도 접근 가능하도록)
    let backup = { likesCount, hasLiked }

    setIsLoading(true)

    try {
      // 🔍 STEP 0: 실제 DB 상태 확인 (업계 표준 방식)
      const { data: currentLike, error: checkError } = await supabase
        .from('likes')
        .select('user_id')
        .eq('item_id', itemId)
        .eq('user_id', currentUserId)
        .maybeSingle()

      // 에러 무시하고 데이터 유무로 판단
      const actualHasLiked = !checkError && !!currentLike
      const newHasLiked = !actualHasLiked // 실제 상태 기준으로 토글
      const newLikesCount = actualHasLiked ? likesCount - 1 : likesCount + 1
      
  
      
      // 백업 데이터 업데이트 (실제 상태 기준)
      backup = {
        likesCount,
        hasLiked: actualHasLiked
      }
      // 🚀 STEP 1: 즉시 UI 업데이트 (옵티미스틱)
      setHasLiked(newHasLiked)
      setLikesCount(newLikesCount)
      onLikeChange?.(newLikesCount, newHasLiked)

      // 🚀 STEP 2: 전역 캐시 업데이트 (모든 화면 동기화)
      await updateGlobalCaches(itemId, newLikesCount, newHasLiked)

      // 🚀 STEP 3: 서버 업데이트 (업계 표준 Upsert 방식)
      if (newHasLiked) {
        // 좋아요 추가 - upsert 방식으로 중복 방지
        const { error } = await supabase.from('likes').upsert({
          item_id: itemId,
          user_id: currentUserId
        }, {
          onConflict: 'user_id,item_id'
        })
        if (error) throw error
      } else {
        // 좋아요 제거
        const { error } = await supabase.from('likes').delete()
          .eq('item_id', itemId)
          .eq('user_id', currentUserId)
        if (error) throw error
      }



    } catch (error) {
      // 🚀 STEP 4: 에러 시 완전 롤백
      console.error(`❌ Like error for item ${itemId}:`, error)
      
      // UI 롤백
      setHasLiked(backup.hasLiked)
      setLikesCount(backup.likesCount)
      onLikeChange?.(backup.likesCount, backup.hasLiked)
      
      // 캐시 롤백
      await updateGlobalCaches(itemId, backup.likesCount, backup.hasLiked)
      
      // 사용자 피드백
      toast({
        title: "좋아요 처리 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [itemId, currentUserId, hasLiked, likesCount, isLoading, onLikeChange, toast, supabase])

  return {
    likesCount,
    hasLiked,
    isLoading,
    toggleLike
  }
}

/**
 * 🌐 전역 캐시 업데이트 - 모든 화면의 좋아요 상태 동기화
 */
async function updateGlobalCaches(
  itemId: string, 
  likesCount: number, 
  hasLiked: boolean
): Promise<void> {
  
  const updateItem = (item: any) => {
    if (item && (item.id === itemId || item.item_id === itemId)) {
      return {
        ...item,
        likes_count: likesCount,
        is_liked: hasLiked
      }
    }
    return item
  }

  // 📱 홈피드 업데이트
  await mutate(
    (key) => typeof key === 'string' && key.startsWith('items|'),
    (data: any[][] | undefined) => {
      if (!data || !Array.isArray(data)) return data
      return data.map(page => {
        // 🔧 page가 배열인지 안전하게 확인
        if (!Array.isArray(page)) return page
        return page.map(updateItem)
      })
    },
    { revalidate: false }
  )

  // 📚 레시피북 업데이트  
  await mutate(
    (key) => typeof key === 'string' && key.startsWith('recipes|'),
    (data: any[][] | undefined) => {
      if (!data || !Array.isArray(data)) return data
      return data.map(page => {
        // 🔧 page가 배열인지 안전하게 확인
        if (!Array.isArray(page)) return page
        return page.map(updateItem)
      })
    },
    { revalidate: false }
  )

  // 👤 프로필 페이지 업데이트
  await mutate(
    (key) => typeof key === 'string' && key.includes('user_items_'),
    (data: any[][] | undefined) => {
      if (!data || !Array.isArray(data)) return data
      return data.map(page => {
        // 🔧 page가 배열인지 안전하게 확인
        if (!Array.isArray(page)) return page
        return page.map(updateItem)
      })
    },
    { revalidate: false }
  )

  // 📄 상세페이지 업데이트
  await mutate(
    `item_details_${itemId}`,
    (data: any) => updateItem(data),
    { revalidate: false }
  )

  
} 