"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, Heart, MessageCircle, Users, ChefHat, Flame, TrendingUp } from "lucide-react"
import { getColorClass } from "@/lib/color-options"
import { formatCount, formatCompactTime } from "@/lib/utils"
import type { Item } from "@/types/item"

interface RecipeListCardProps {
  	item: Item;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onSelect?: () => void;
  showAuthor?: boolean;
}

export default function RecipeListCard({ 
  item, 
  isSelectable = false, 
  isSelected = false, 
  onSelectChange, 
  onSelect,
  showAuthor = false
}: RecipeListCardProps) {
  const handleSelectChange = (checked: boolean) => {
    if (onSelectChange) {
      onSelectChange(checked);
    } else if (onSelect) {
      onSelect();
    }
  };

  // 토스 스타일: 퀄리티 스코어 계산
  const getQualityScore = () => {
    const likes = item.likes_count || 0;
    const comments = item.comments_count || 0;
    return likes + (comments * 2); // 댓글을 더 높게 평가
  };

  const qualityScore = getQualityScore();
  const isHighQuality = qualityScore > 20;
  const isTrending = qualityScore > 10;

  const detailUrl = `${item.item_type === 'recipe' ? '/recipes' : '/posts'}/${item.item_id}`;

  return (
    <div className="relative">
      {/* 체크박스 - 링크 완전 분리 (업계 표준) */}
      {isSelectable && (
        <div 
          className="absolute top-1 left-1 sm:top-2 sm:left-2 z-30"
          onClick={() => handleSelectChange(!isSelected)}
        >
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/95 backdrop-blur-sm shadow-lg border border-white/50 flex items-center justify-center hover:bg-orange-50 transition-colors">
            <Checkbox 
              checked={isSelected} 
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 pointer-events-none" 
            />
          </div>
        </div>
      )}
      
      {/* 링크 영역 - 체크박스 완전 분리 */}
      <Link href={detailUrl} className="block">
        <Card className="group bg-white border-0 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          {/* 🖼️ 토스 스타일: 좌측 이미지 영역 - 브랜드 일관성 */}
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex-shrink-0 bg-gradient-to-br from-orange-50 to-orange-100 overflow-hidden">
            {item.image_urls && item.image_urls.length > 0 ? (
              <Image 
                src={item.image_urls[0]} 
                alt={item.title || "Recipe Image"} 
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                <ChefHat className="w-4 h-4 sm:w-6 sm:h-6 text-orange-500" />
              </div>
            )}
            
            {/* 비공개 표시 - 업계표준 Privacy UX */}
            {!item.is_public && (
              <div className="absolute top-1 right-1 sm:top-2 sm:right-2 z-20">
                <div className="bg-black/80 text-white text-[8px] sm:text-[10px] px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded-full font-medium backdrop-blur-sm shadow-lg">
                  비공개
                </div>
              </div>
            )}
            
            {/* 퀄리티 배지 - 토스 스타일 브랜딩 */}
            {isHighQuality && (
              <div className="absolute top-1 left-1 sm:top-2 sm:left-2">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                  <Flame className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                </div>
              </div>
            )}
            
            {/* 트렌딩 표시 */}
            {isTrending && !isHighQuality && (
              <div className="absolute top-1 left-1 sm:top-2 sm:left-2">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* 📝 Instagram 스타일: 메인 콘텐츠 영역 (2행 구조) */}
          <div className="flex-1 min-w-0 py-0 px-2.5 sm:py-0 sm:px-4">
            {/* 🎯 상단: 제목 + 메타 정보 */}
            <div className="flex items-start justify-between mb-2 sm:mb-3">
              {/* 제목 + 작성자 그룹 */}
              <div className="flex-1 min-w-0 mr-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight truncate group-hover:text-orange-600 transition-colors">
                  {item.title}
                </h3>
                
                {/* 작성자 정보 - 모두의 레시피 전용 */}
                {showAuthor && (item.display_name || item.username) && (
                  <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-600" />
                    <span className="text-xs sm:text-sm font-medium text-orange-600 truncate">
                      {item.display_name || item.username}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 우상단 액션 그룹 - 색상 라벨 배치 */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* 색상 라벨 - 나의 레시피 전용 (그리드와 일관성) */}
                {!showAuthor && item.color_label && (
                  <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full shadow-sm ${getColorClass(item.color_label, "color")}`} />
                )}
              </div>
            </div>
            
            {/* 설명 - 간결하게 */}
            {item.description && (
              <p className="text-xs sm:text-sm text-gray-600 truncate mb-2 sm:mb-3">
                {item.description}
              </p>
            )}

            {/* 🚀 하단: 메트릭스 그룹 (Instagram 스타일 2행 구조) */}
            <div className="space-y-1.5 sm:space-y-2">
              {/* 첫 번째 행: 실용 정보 (조리시간, 인분) - 항상 표시 */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* 조리 시간 - 최우선 정보 */}
                {item.cooking_time_minutes && (
                  <div className="flex items-center gap-0.5 sm:gap-1 bg-orange-50 text-orange-700 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[9px] sm:text-xs font-medium flex-shrink-0">
                    <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                    <span>{item.cooking_time_minutes}분</span>
                  </div>
                )}
                
                {/* 인분 - 두 번째 우선순위 */}
                {item.servings && (
                  <div className="flex items-center gap-0.5 sm:gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[9px] sm:text-xs font-medium flex-shrink-0">
                    <Users className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                    <span>{item.servings}인분</span>
                  </div>
                )}
                
                {/* 복잡도 표시 - 공간 있을 때만 */}
                {item.ingredients && item.ingredients.length > 0 && (
                  <div className="flex items-center gap-0.5 text-[9px] sm:text-xs text-gray-500 flex-shrink-0">
                    <span className="bg-gray-100 px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded text-[8px] sm:text-[9px]">
                      재료 {item.ingredients.length}
                    </span>
                  </div>
                )}
              </div>
              
              {/* 두 번째 행: 소셜 메트릭스 + 시간 (Instagram 스타일) */}
              <div className="flex items-center justify-between">
                {/* 소셜 증명 - 축약된 숫자로 안전하게 */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* 좋아요 - 축약 표시 */}
                  <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs">
                    <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500 fill-current" />
                    <span className="font-medium text-gray-700 min-w-[1rem]">
                      {formatCount(item.likes_count || 0)}
                    </span>
                  </div>
                  
                  {/* 댓글 - 축약 표시 */}
                  <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs">
                    <MessageCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-500" />
                    <span className="font-medium text-gray-700 min-w-[1rem]">
                      {formatCount(item.comments_count || 0)}
                    </span>
                  </div>
                </div>
                
                {/* 시간 - 축약 형태 */}
                <span className="text-[9px] sm:text-xs text-gray-400 flex-shrink-0">
                  {formatCompactTime(item.created_at)}
                </span>
              </div>
            </div>
            
            {/* 태그 영역 - 여유 공간 있을 때만 */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 sm:mt-3">
                {item.tags.slice(0, 2).map((tag: string) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="text-[8px] sm:text-[9px] px-1 py-0 sm:px-1.5 sm:py-0 bg-gray-100 text-gray-600 border-0 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                  >
                    #{tag}
                  </Badge>
                ))}
                {item.tags.length > 2 && (
                  <Badge 
                    variant="outline" 
                    className="text-[8px] sm:text-[9px] px-1 py-0 sm:px-1.5 sm:py-0 text-gray-400 border-gray-200"
                  >
                    +{item.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
      </Link>
    </div>
  )
}