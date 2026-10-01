"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "@/lib/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { timeAgo, formatCount } from "@/lib/utils"
import clsx from "clsx"
import { getColorClass } from "@/lib/color-options"
import { MessageCircle, ChefHat } from "lucide-react"
import { SimplifiedLikeButton } from "@/components/items/SimplifiedLikeButton"
import { BookmarkButton } from "@/components/items/BookmarkButton"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import { useNavigation } from "@/hooks/useNavigation"
import { useSessionStore } from "@/store/sessionStore"
import type { Item } from "@/types/item"

interface RecipeCardProps {
  	item: Item;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onSelect?: () => void;
  showAuthor?: boolean;
  priority?: boolean; // LCP 최적화를 위한 이미지 우선순위
}

export default function RecipeCard({ item, isSelectable, isSelected, onSelectChange, onSelect, showAuthor, priority = false }: RecipeCardProps) {
  const { session } = useSessionStore()
  const router = useRouter()
  const { createLinkWithOrigin } = useNavigation()
  
  // 🚀 SSA 기반 캐시 연동 (이미지 포함)
  const fallbackItem = {
    ...item,
    likes_count: item.likes_count || 0,
    comments_count: item.comments_count || 0,
    is_liked: item.is_liked || false,
    is_bookmarked: (item as Item & { is_bookmarked?: boolean }).is_bookmarked || false,
    image_urls: item.image_urls || null, // 🖼️ 섬네일 실시간 업데이트 지원
    thumbnail_index: item.thumbnail_index || 0
  }
  const cachedItem = useSSAItemCache(item.item_id, fallbackItem)
  const stableItemId = item.item_id || item.id
  // 표시용 값: 수정 직후 즉시 갱신되는 개별 항목 캐시를 우선하고, 캐시에 없는 값만 목록 데이터를 쓴다.
  // (목록 캐시는 새로고침 전까지 갱신되지 않아 제목, 색상 라벨 등이 이전 값으로 남던 문제 방지)
  const displayItem: Item = { ...item, ...cachedItem }
  
  const handleSelectChange = (checked: boolean) => {
    if (onSelectChange) {
      onSelectChange(checked);
    } else if (onSelect) {
      onSelect();
    }
  };

  const baseUrl = `${item.item_type === 'recipe' ? '/recipes' : '/posts'}/${item.item_id}`;
  const detailUrl = createLinkWithOrigin(baseUrl);

  return (
    <div className="relative">
      {/* 체크박스 - 링크 완전 분리 (토스 스타일 배치) */}
      {isSelectable && (
        <div 
          className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-30"
          onClick={() => handleSelectChange(!isSelected)}
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/95 backdrop-blur-sm shadow-lg border border-white/50 flex items-center justify-center hover:bg-orange-50 transition-colors">
            <Checkbox 
              checked={isSelected} 
              className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 rounded-sm pointer-events-none" 
            />
          </div>
        </div>
      )}
      
      {/* 🎨 전체 카드를 링크로 감싸기 */}
      <Link href={detailUrl} className="block">
        <Card className="relative group overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
        {/* 🖼️ 토스 스타일: 대형 이미지 영역 (황금비율 적용) */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
        {cachedItem.image_urls && cachedItem.image_urls.length > 0 ? (
          <Image 
            src={cachedItem.image_urls[cachedItem.thumbnail_index || 0]} 
            alt={displayItem.title || "Recipe Image"} 
            fill 
            className="object-cover"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-gray-400" aria-hidden="true" />
          </div>
        )}
        
        {/* 🎯 토스 스타일: 선택적 오버레이 요소들 */}
        
        {/* 색상 라벨 - 나의 레시피 전용 */}
        {!showAuthor && displayItem.color_label && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-20">
            <div className={clsx(
              "w-4 h-4 sm:w-5 sm:h-5 rounded-full ring-2 ring-white", 
              getColorClass(displayItem.color_label, "color")
            )} />
          </div>
        )}
        
        {/* 작성자 정보 - 모두의 레시피 전용 */}
        {showAuthor && item.username && (
          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-20">
            <span className="block bg-black/70 text-white text-[11px] sm:text-xs px-1.5 py-0.5 rounded truncate max-w-[6rem]">
              {item.username}
            </span>
          </div>
        )}
        
        {/* 비공개 표시 - 업계표준 Privacy UX (우측 하단, 충돌 방지) */}
        {!displayItem.is_public && (
          <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 z-25">
            <div className="bg-black/75 text-white text-[11px] sm:text-xs px-1.5 py-0.5 rounded">
              비공개
            </div>
          </div>
        )}
        
      </div>
      
      {/* 📝 토스 스타일: 최소한의 텍스트 정보 */}
      <CardContent className="pt-0 px-2 pb-2 sm:pt-0 sm:px-3 sm:pb-3 space-y-1.5 sm:space-y-2">
        {/* 제목 - 토스 타이포그래피 */}
        <h3 className="font-bold text-sm text-gray-900 leading-tight truncate mt-2">
          {displayItem.title}
        </h3>
        
        {/* 서브 정보 - 핵심만 */}
        <div className="flex items-center justify-between mt-1 sm:mt-1.5">
          <p className="text-xs text-gray-500 min-w-0 flex-1 truncate">
            {[
              displayItem.cooking_time_minutes ? `${displayItem.cooking_time_minutes}분` : null,
              displayItem.servings ? `${displayItem.servings}인분` : null,
              timeAgo(item.created_at),
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
        
        {/* 🚀 SSA 기반 상호작용 가능한 소셜 메트릭스 */}
        <div className="flex items-center justify-between mt-1.5 sm:mt-2">
          <div className="flex items-center gap-1">
            {/* SSA 기반 좋아요 버튼 */}
            <div className="scale-75 sm:scale-90">
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
            
            {/* 댓글 수 표시 (클릭시 상세페이지로) */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.preventDefault()
                router.push(detailUrl)
              }}
              className="h-auto p-0.5"
              aria-label="댓글 보기"
            >
              <div className="flex items-center gap-0.5">
                <MessageCircle className="w-3.5 h-3.5 text-gray-500" />
                <span className="font-medium text-gray-700 text-xs min-w-[1rem]">
                  {formatCount(cachedItem.comments_count || 0)}
                </span>
              </div>
            </Button>
          </div>
          
          {/* SSA 기반 북마크 버튼 */}
          <BookmarkButton
            itemId={stableItemId}
            itemType={item.item_type}
            currentUserId={session?.id}
            initialBookmarksCount={cachedItem.bookmarks_count || 0}
            initialIsBookmarked={cachedItem.is_bookmarked || false}
            cachedItem={cachedItem}
            size="icon"
            className="h-5 w-5 sm:h-6 sm:w-6 p-0.5 hover:bg-orange-100 transition-colors"
          />
        </div>
      </CardContent>
        </Card>
      </Link>
    </div>
  )
}