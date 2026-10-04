/**
 * 간단화된 LikeButton - 업계 표준 방식
 * 기존 400줄 → 50줄로 대폭 간소화
 * 통합 캐시 매니저 사용으로 완벽한 데이터 일관성 보장
 */

"use client"

import { useState, forwardRef, useRef, useCallback } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cacheManager } from "@/shared/infra/unified-cache-manager"
import { useItemCache } from "@/hooks/useItemCache"
import type { Item } from "@/types/item"
import LikersModal from "./LikersModal"
import LoginPromptSheet from "@/components/auth/LoginPromptSheet"

interface LikeButtonProps {
  itemId: string
  itemType: 'post' | 'recipe'
  authorId: string
  currentUserId?: string | null
  initialLikesCount?: number
  initialHasLiked?: boolean
  isAuthLoading?: boolean
  	cachedItem?: Item // SSA 캐시된 완전한 아이템 데이터 (이미지 보존용)
}

export const LikeButton = forwardRef<HTMLButtonElement, LikeButtonProps>(({
  itemId,
  itemType,
  currentUserId,
  initialLikesCount = 0,
  initialHasLiked = false,
  isAuthLoading = false,
  cachedItem: providedCachedItem,
}, ref) => {
  // SSA 표준: 완전한 아이템 데이터를 fallback으로 사용 (이미지 보존)

  
  // SSA 업계표준: 이미지 데이터 완전 보존 + 부분 업데이트
  const fallbackItem: Item = providedCachedItem ? {
    // 기존 데이터 모두 보존 (특히 이미지!)
    ...providedCachedItem,
    // 좋아요/북마크 상태만 보완 (덮어쓰지 않고 보완만)
    likes_count: providedCachedItem.likes_count ?? initialLikesCount,
    is_liked: providedCachedItem.is_liked ?? initialHasLiked,
    bookmarks_count: providedCachedItem.bookmarks_count ?? 0,
    is_bookmarked: providedCachedItem.is_bookmarked ?? false
  } : {
    // 안전한 기본값 (providedCachedItem이 없을 때만)
    id: itemId,
    item_id: itemId,
    user_id: '',
    item_type: itemType,
    created_at: new Date().toISOString(),
    title: null,
    content: null,
    description: null,
    image_urls: null, // 이미지 없음 (홈피드 캐시에서 가져올 예정)
    thumbnail_index: null,
    tags: null,
    is_public: true,
    color_label: null,
    servings: null,
    cooking_time_minutes: null,
    recipe_id: null,
    cited_recipe_ids: null,
    likes_count: initialLikesCount,
    comments_count: 0,
    is_liked: initialHasLiked,
    is_following: false,
    bookmarks_count: 0,
    is_bookmarked: false
  }

  const cachedItem = useItemCache(itemId, fallbackItem)
  

  
  // SSA 업계표준: 캐시만이 Single Source of Truth (소셜미디어 표준)
  const likesCount = cachedItem.likes_count
  const hasLiked = cachedItem.is_liked

  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Race Condition 방지
  const isProcessingRef = useRef(false)
  const lastClickTimeRef = useRef(0)

  // Instagram 방식: 좋아요한 사람들 모달 상태
  const [showLikersModal, setShowLikersModal] = useState(false)
  
  // 토스 스타일 로그인 유도 바텀시트 상태
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // 업계 표준: 완전한 Single Source of Truth
  const handleLike = useCallback(async (e?: React.MouseEvent) => {
    // 이벤트 전파 방지 - 상위 링크 클릭 방지
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // 비로그인 사용자 회원가입 유도 (토스 UX 스타일 - 바텀시트)
    if (!currentUserId) {
      setShowLoginPrompt(true)
      return
    }
    
    // 기본 검증
    if (isAuthLoading || isProcessingRef.current) {
      return
    }

    // 디바운싱: 300ms 내 중복 클릭 방지
    const now = Date.now()
    if (now - lastClickTimeRef.current < 300) {
      return
    }
    lastClickTimeRef.current = now

    // 처리 중 표시
    isProcessingRef.current = true
    setIsLoading(true)

    try {
      // 업계 표준: 캐시만 업데이트, UI는 자동 동기화
      const newHasLiked = !hasLiked
      
      // SSA 기반: 완전한 Seamless Sync Architecture 패턴 유지
      // 이미지 정보 보존하면서 Request Deduplication + Batch Processing 유지
      await cacheManager.like(itemId, currentUserId, newHasLiked, cachedItem)
      
      // 좋아요 알림과 푸시는 DB 트리거가 서버에서 처리한다
      
      // 부모 컴포넌트에게 알림 (캐시 매니저가 업데이트한 후의 정확한 값 전달)

    } catch (error: unknown) {
      console.error(`❌ LikeButton: Error for ${itemId}:`, error)
      
      toast({
        title: "좋아요 처리 실패",
        description: "네트워크 오류입니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive"
      })
    } finally {
      // 잠금 해제
      isProcessingRef.current = false
      setIsLoading(false)
    }
  }, [currentUserId, isAuthLoading, hasLiked, itemId, toast, cachedItem])

  return (
    <>
      {/* Instagram 방식: 하트 + 숫자 분리 */}
      <div className="flex items-center">
        {/* 하트 아이콘 버튼 - 좋아요 토글 */}
        <Button
          ref={ref}
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={isLoading || isAuthLoading}
          aria-label={hasLiked ? "좋아요 취소" : "좋아요"}
          aria-pressed={hasLiked}
          className="h-11 pl-2.5 pr-1 text-ink-soft hover:text-like transition-colors"
        >
          <Heart 
            aria-hidden
            className={`w-5 h-5 transition-all duration-200 ${
              hasLiked 
                ? 'fill-like text-like scale-110' 
                : 'hover:scale-105'
            }`} 
          />
        </Button>

        {/* 숫자 버튼 - 좋아요한 사람들 모달 (Instagram 방식) */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowLikersModal(true)
          }}
          disabled={isAuthLoading}
          aria-label={`좋아요 ${likesCount}개, 좋아요한 사람 보기`}
          className="h-11 min-w-6 pl-1 pr-2 text-ink-soft hover:text-ink transition-colors"
        >
          <span className="text-label font-medium tabular-nums">{likesCount}</span>
        </Button>
      </div>

      {/* 좋아요한 사람들 모달 */}
      <LikersModal
        isOpen={showLikersModal}
        onClose={() => setShowLikersModal(false)}
        itemId={itemId}
        itemType={itemType}
        currentUserId={currentUserId}
      />
      
      {/* 토스 스타일 로그인 유도 바텀시트 */}
      <LoginPromptSheet
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        action="like"
      />
    </>
  )
})

LikeButton.displayName = "LikeButton" 