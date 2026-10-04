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
  cachedItem?: Item // 부분 갱신 시 이미지 등 기존 필드를 보존할 fallback
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
  // 부분 상태만 바꿀 때 이미지 등 기존 필드는 유지한다.
  const fallbackItem: Item = providedCachedItem ? {
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
  

  
  const likesCount = cachedItem.likes_count
  const hasLiked = cachedItem.is_liked

  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Race Condition 방지
  const isProcessingRef = useRef(false)
  const lastClickTimeRef = useRef(0)

  // 좋아요한 사람 목록 모달
  const [showLikersModal, setShowLikersModal] = useState(false)
  
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const handleLike = useCallback(async (e?: React.MouseEvent) => {
    // 카드 링크로 클릭이 전파되지 않게 한다.
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // 비로그인은 로그인 유도만 열고 원래 화면을 유지한다.
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
      const newHasLiked = !hasLiked
      
      // 캐시 매니저가 optimistic update와 실패 롤백을 담당한다.
      await cacheManager.like(itemId, currentUserId, newHasLiked, cachedItem)
      
      // 좋아요 알림과 푸시는 DB 트리거가 서버에서 처리한다
      
      // callback에는 캐시에 반영된 다음 상태를 넘긴다.

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
      <div className="flex items-center">
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

        {/* 숫자는 좋아요한 사람 목록을 연다. */}
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
      
      <LoginPromptSheet
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        action="like"
      />
    </>
  )
})

LikeButton.displayName = "LikeButton" 