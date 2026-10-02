/**
 * BookmarkButton - SSA 표준 북마크 토글 버튼
 * SimplifiedLikeButton과 동일한 SSA 패턴 적용
 */

"use client"

import { useState, forwardRef, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cacheManager } from "@/lib/unified-cache-manager"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import { mutate } from "swr"
import type { Item } from "@/types/item"
import LoginPromptSheet from "@/components/auth/LoginPromptSheet"

interface BookmarkButtonProps {
  itemId: string
  itemType: 'post' | 'recipe'
  currentUserId?: string | null
  initialBookmarksCount?: number
  initialIsBookmarked?: boolean
  isAuthLoading?: boolean
  onBookmarkChange?: (bookmarksCount: number, isBookmarked: boolean) => void
  className?: string
  size?: "sm" | "icon" | "default"
  variant?: "ghost" | "outline" | "default"
  cachedItem?: Item // SSA 캐시된 완전한 아이템 데이터 (이미지 보존용)
}

export const BookmarkButton = forwardRef<HTMLButtonElement, BookmarkButtonProps>(({
  itemId,
  itemType,
  currentUserId,
  initialBookmarksCount = 0,
  initialIsBookmarked = false,
  isAuthLoading = false,
  onBookmarkChange,
  className = "",
  size = "icon",
  variant = "ghost",
  cachedItem: providedCachedItem
}, ref) => {

  
  // SSA 업계표준: 이미지 데이터 완전 보존 + 부분 업데이트
  const fallbackItem: Item = providedCachedItem ? {
    // 기존 데이터 모두 보존 (특히 이미지!)
    ...providedCachedItem,
    // 북마크/좋아요 상태만 보완 (덮어쓰지 않고 보완만)
    bookmarks_count: providedCachedItem.bookmarks_count ?? initialBookmarksCount,
    is_bookmarked: providedCachedItem.is_bookmarked ?? initialIsBookmarked,
    likes_count: providedCachedItem.likes_count ?? 0,
    is_liked: providedCachedItem.is_liked ?? false
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
    likes_count: 0,
    comments_count: 0,
    is_liked: false,
    is_following: false,
    bookmarks_count: initialBookmarksCount,
    is_bookmarked: initialIsBookmarked
  }

  const cachedItem = useSSAItemCache(itemId, fallbackItem)
  
  // CRITICAL DEBUG: BookmarkButton 최종 데이터 확인

  
  const bookmarksCount = cachedItem.bookmarks_count || initialBookmarksCount
  const isBookmarked = cachedItem.is_bookmarked || initialIsBookmarked

  const [isLoading, setIsLoading] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const { toast } = useToast()

  // Race Condition 방지 (SimplifiedLikeButton과 동일한 패턴)
  const isProcessingRef = useRef(false)
  const lastClickTimeRef = useRef(0)

  // SSA 표준: 완전한 Single Source of Truth
  const handleBookmark = useCallback(async (e?: React.MouseEvent) => {
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
      // SSA 표준: 캐시만 업데이트, UI는 자동 동기화
      const newIsBookmarked = !isBookmarked
      
      // SSA 기반: 완전한 Seamless Sync Architecture 패턴 유지
      // 이미지 정보 보존하면서 Request Deduplication + Batch Processing 유지
      await cacheManager.bookmark(itemId, currentUserId, newIsBookmarked, cachedItem)
      
      // 북마크 페이지 실시간 동기화 (Optimistic Update)
      if (currentUserId) {
        const bookmarksCacheKey = `bookmarks_${currentUserId}`
        
        if (!newIsBookmarked) {
          // 북마크 해제 시: 즉시 목록에서 제거
          await mutate(
            bookmarksCacheKey,
            (currentBookmarks: Item[] | undefined) => {
              if (!currentBookmarks || currentBookmarks.length === 0) return currentBookmarks
              const updatedBookmarks = currentBookmarks.filter(item => (item.id || item.item_id) !== itemId)

              return updatedBookmarks
            },
            { revalidate: false }
          )
        } else {
          // 북마크 추가 시: 백그라운드에서 새로운 데이터 fetch
          await mutate(bookmarksCacheKey)

        }
      }
      
      // 부모 컴포넌트에게 알림 (필요한 경우)
      onBookmarkChange?.(newIsBookmarked ? bookmarksCount + 1 : bookmarksCount - 1, newIsBookmarked)

    } catch (error: unknown) {
      console.error(`❌ BookmarkButton: Error for ${itemId}:`, error)
      
      // 북마크 페이지 캐시도 롤백 (에러 시 정확한 데이터 다시 fetch)
      if (currentUserId) {
        const bookmarksCacheKey = `bookmarks_${currentUserId}`
        await mutate(bookmarksCacheKey)
      }
      
      // SSA 표준: 간단한 에러 처리 (캐시 매니저가 롤백 처리)
      toast({
        title: "북마크 처리 실패",
        description: "네트워크 오류입니다. 잠시 후 다시 시도해주세요.",
        variant: "destructive"
      })
    } finally {
      // 잠금 해제
      isProcessingRef.current = false
      setIsLoading(false)
    }
  }, [currentUserId, isAuthLoading, isBookmarked, bookmarksCount, itemId, onBookmarkChange, toast, cachedItem])

  return (
    <>
      <Button
        ref={ref}
        variant={variant}
        size={size}
        onClick={handleBookmark}
        disabled={isLoading || isAuthLoading}
        aria-label={isBookmarked ? "저장 취소" : "저장하기"}
        aria-pressed={isBookmarked}
        className={cn("transition-colors", isBookmarked ? "text-orange-ink" : "text-ink-soft hover:text-ink", className)}
      >
        <Bookmark 
          aria-hidden
          className={`h-5 w-5 transition-all duration-200 ${
            isBookmarked 
              ? 'fill-primary text-orange-ink scale-110' 
              : 'hover:scale-105'
          }`} 
        />
      </Button>

      {/* 토스 스타일 로그인 유도 바텀시트 */}
      <LoginPromptSheet
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        action="bookmark"
      />
    </>
  )
})

BookmarkButton.displayName = "BookmarkButton"