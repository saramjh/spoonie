"use client"

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, Clock, Users, ChefHat } from 'lucide-react'
import { useSessionStore } from '@/store/sessionStore'
import { useSSAItemCache } from '@/hooks/useSSAItemCache'
import { useThumbnail } from '@/hooks/useThumbnail'
import { SimplifiedLikeButton } from '@/components/items/SimplifiedLikeButton'
import { BookmarkButton } from '@/components/items/BookmarkButton'
import type { Item } from '@/types/item'

interface TossStyleRecipeCardProps {
  item: Item
  showAuthor?: boolean
}

/**
 * 🎨 토스 UX/UI 디자인 원칙 기반 레시피 카드
 * 
 * 핵심 원칙:
 * 1. 명확한 상호작용 영역 분리
 * 2. 충분한 터치 타겟 크기 (44px+)
 * 3. 시각적 계층 구조
 * 4. 일관된 피드백 시스템
 * 5. 접근성 우선 설계
 */
export default function TossStyleRecipeCard({ 
  item,
  showAuthor: _showAuthor = false // Not used in current implementation
}: TossStyleRecipeCardProps) {
  const router = useRouter()
  const { session } = useSessionStore()

  // SSA 기반 캐시 연동
  const fallbackItem = {
    ...item,
    likes_count: item.likes_count || 0,
    comments_count: item.comments_count || 0,
    is_liked: item.is_liked || false,
    is_bookmarked: item.is_bookmarked || false,
    image_urls: item.image_urls || null,
    thumbnail_index: item.thumbnail_index || 0
  }
  
  const cachedItem = useSSAItemCache(item.item_id || item.id, fallbackItem)
  const stableItemId = item.item_id || item.id

  const { orderedImages } = useThumbnail({
    itemId: stableItemId,
    imageUrls: cachedItem.image_urls || [],
    thumbnailIndex: cachedItem.thumbnail_index ?? 0
  })

  const detailUrl = `${item.item_type === 'recipe' ? '/recipes' : '/posts'}/${stableItemId}`

  // 토스 스타일: 애니메이션 및 인터랙션
  const handleCommentClick = () => {
    // 토스 스타일: 부드러운 페이지 전환
    router.push(detailUrl)
  }

  return (
    <Card className="bg-white border border-gray-100 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200 group">
      
      {/* 🎨 토스 디자인: 콘텐츠 영역 (전체 클릭 가능) */}
      <Link href={detailUrl} className="block">
        <div className="relative">
          {/* 이미지 영역 */}
          <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100">
            {orderedImages && orderedImages.length > 0 ? (
              <Image 
                src={orderedImages[0]} 
                alt={item.title || "Recipe Image"} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-105" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ChefHat className="w-12 h-12 text-gray-300" />
              </div>
            )}
            
            {/* 토스 스타일: 상태 배지 */}
            {!item.is_public && (
              <div className="absolute top-3 right-3">
                <div className="bg-black/80 text-white text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm">
                  비공개
                </div>
              </div>
            )}
          </div>

          {/* 텍스트 콘텐츠 영역 */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-bold text-lg text-gray-900 leading-tight group-hover:text-orange-600 transition-colors line-clamp-2">
                {item.title}
              </h3>
              
              {item.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            
            {/* 토스 스타일: 메타 정보 */}
            {(item.cooking_time_minutes || item.servings) && (
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {item.cooking_time_minutes && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{item.cooking_time_minutes}분</span>
                  </div>
                )}
                {item.servings && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{item.servings}인분</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
      
      {/* 🎨 토스 디자인: 명확한 구분선 */}
      <div className="border-t border-gray-100" />
      
      {/* 🚀 토스 스타일: 독립적인 액션 영역 */}
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          
          {/* 좌측: 소셜 액션들 */}
          <div className="flex items-center gap-1">
            
            {/* 토스 표준: 44px 최소 터치 타겟 */}
            <div className="flex items-center">
              <SimplifiedLikeButton 
                itemId={stableItemId} 
                itemType={item.item_type}
                authorId={item.user_id}
                currentUserId={session?.id}
                initialLikesCount={cachedItem.likes_count || 0}
                initialHasLiked={cachedItem.is_liked || false}
                cachedItem={cachedItem}
              />
            </div>
            
            {/* 토스 디자인: 댓글 버튼 (명확한 라벨링) */}
            <Button 
              variant="ghost" 
              onClick={handleCommentClick}
              className="min-h-[44px] px-3 py-2 rounded-xl hover:bg-blue-50 transition-all duration-200 group/comment"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500 transition-transform duration-200 group-hover/comment:scale-110" />
                <span className="font-semibold text-gray-700 text-sm">
                  {cachedItem.comments_count || 0}
                </span>
              </div>
            </Button>
          </div>
          
          {/* 우측: 북마크 */}
          <BookmarkButton
            itemId={stableItemId}
            itemType={item.item_type}
            currentUserId={session?.id}
            initialBookmarksCount={cachedItem.bookmarks_count || 0}
            initialIsBookmarked={cachedItem.is_bookmarked || false}
            cachedItem={cachedItem}
            size="icon"
            className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-orange-50 transition-all duration-200"
          />
        </div>
      </CardContent>
    </Card>
  )
}