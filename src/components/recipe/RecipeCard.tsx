"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { timeAgo, formatCount } from "@/lib/utils"
import clsx from "clsx"
import { getColorClass } from "@/lib/color-options"
import { Heart, MessageCircle, Clock, Users, ChefHat, Bookmark } from "lucide-react"
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
}

export default function RecipeCard({ item, isSelectable, isSelected, onSelectChange, onSelect, showAuthor }: RecipeCardProps) {
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
        <Card className="relative group overflow-hidden bg-white border-0 rounded-lg sm:rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-1">
        {/* 🖼️ 토스 스타일: 대형 이미지 영역 (황금비율 적용) */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100">
        {cachedItem.image_urls && cachedItem.image_urls.length > 0 ? (
          <Image 
            src={cachedItem.image_urls[cachedItem.thumbnail_index || 0]} 
            alt={item.title || "Recipe Image"} 
            fill 
            className="object-cover group-hover:scale-110 transition-transform duration-700" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center">
              <ChefHat className="w-4 h-4 sm:w-6 sm:h-6 text-orange-500" />
            </div>
          </div>
        )}
        
        {/* 🎯 토스 스타일: 선택적 오버레이 요소들 */}
        
        {/* 색상 라벨 - 나의 레시피 전용 */}
        {!showAuthor && item.color_label && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-20">
            <div className={clsx(
              "w-4 h-4 sm:w-6 sm:h-6 rounded-full shadow-lg ring-1 sm:ring-2 ring-white/50 backdrop-blur-sm", 
              getColorClass(item.color_label, "color")
            )} />
          </div>
        )}
        
        {/* 작성자 정보 - 모두의 레시피 전용 */}
        {showAuthor && (item.display_name || item.username) && (
          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-20">
            <div className="flex items-center gap-1 sm:gap-1.5 bg-black/70 text-white px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full backdrop-blur-sm">
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center">
                <span className="text-[6px] sm:text-[8px] font-bold text-white">
                  {(item.display_name || item.username || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-[8px] sm:text-[10px] font-medium truncate max-w-8 sm:max-w-12">
                {item.display_name || item.username}
              </span>
            </div>
          </div>
        )}
        
        {/* 비공개 표시 - 업계표준 Privacy UX (우측 하단, 충돌 방지) */}
        {!item.is_public && (
          <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 z-25">
            <div className="bg-black/80 text-white text-[8px] sm:text-[10px] px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-medium backdrop-blur-sm shadow-lg">
              비공개
            </div>
          </div>
        )}
        
        {/* 하단 그라데이션 & 소셜 메트릭스 */}
        <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-16 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* 🚀 Instagram 스타일: 실용 정보만 오버레이 */}
        <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2">
          <div className="flex items-center gap-0.5 bg-orange-500 text-white px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded-full text-[8px] sm:text-[10px] font-bold shadow-lg flex-shrink-0">
            <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
            <span>{item.cooking_time_minutes || '?'}분</span>
          </div>
        </div>
      </div>
      
      {/* 📝 토스 스타일: 최소한의 텍스트 정보 */}
      <CardContent className="pt-0 px-2 pb-2 sm:pt-0 sm:px-3 sm:pb-3 space-y-1.5 sm:space-y-2">
        {/* 제목 - 토스 타이포그래피 */}
        <h3 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight truncate group-hover:text-orange-600 transition-colors mt-1.5 sm:mt-2">
          {item.title}
        </h3>
        
        {/* 서브 정보 - 핵심만 */}
        <div className="flex items-center justify-between mt-1 sm:mt-1.5">
          <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[10px] text-gray-500 min-w-0 flex-1">
            {item.servings && (
              <div className="flex items-center gap-0.5 bg-gray-50 px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded-full">
                <Users className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                <span className="font-medium">{item.servings}인분</span>
              </div>
            )}
            <span className="text-gray-400">•</span>
            <span className="truncate">{timeAgo(item.created_at)}</span>
          </div>
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
              className="h-auto p-0.5 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-0.5">
                <MessageCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500" />
                <span className="font-medium text-gray-700 text-[8px] sm:text-[10px] min-w-[1rem]">
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
            initialBookmarksCount={(cachedItem as any).bookmarks_count || 0}
            initialIsBookmarked={(cachedItem as any).is_bookmarked || false}
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