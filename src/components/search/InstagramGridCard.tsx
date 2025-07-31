"use client"

import Link from "next/link"
import Image from "next/image"
import { Heart, MessageCircle, ChefHat, MessageSquare, Camera } from "lucide-react"
import { formatCount } from "@/lib/utils"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import type { Item } from "@/types/item"

interface InstagramGridCardProps {
  item: Item
}

export default function InstagramGridCard({ item }: InstagramGridCardProps) {
  // ID 안전성 체크
  const itemId = item.item_id || item.id;
  if (!itemId) {
    console.warn('InstagramGridCard: Missing item ID', item);
    return null;
  }
  
  // 🚀 SSA 기반 캐시 연동 (프로필 그리드와 동일한 방식)
  const fallbackItem = {
    ...item,
    likes_count: item.likes_count || 0,
    comments_count: item.comments_count || 0,
    is_liked: item.is_liked || false // 🔧 프로필 그리드와 동일
  }
  const cachedItem = useSSAItemCache(itemId, fallbackItem)
  
  // 🔧 프로필 그리드와 동일한 방식: cachedItem에서 직접 사용
  const likesCount = cachedItem.likes_count
  const hasLiked = cachedItem.is_liked
  const commentsCount = cachedItem.comments_count
  
  // 🔍 CRITICAL DEBUG: InstagramGridCard 하트 상태 확인
  console.log(`✅ [InstagramGridCard ${itemId}] Like status:`, {
    originalIsLiked: item.is_liked,
    fallbackIsLiked: fallbackItem.is_liked,
    cachedIsLiked: cachedItem.is_liked,
    finalHasLiked: hasLiked,
    likesCount: likesCount,
    title: item.title?.substring(0, 20)
  })
  
  // 🚀 SSA 캐시 연동 완료
  
  const detailUrl = `${item.item_type === 'recipe' ? '/recipes' : '/posts'}/${itemId}`
  
  return (
    <Link href={detailUrl} className="block group">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 rounded-sm">
        {/* 🖼️ 이미지 */}
        {item.image_urls && item.image_urls.length > 0 ? (
          <Image 
            src={cachedItem.image_urls[cachedItem.thumbnail_index || 0]} 
            alt={item.title || "Post Image"} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            {item.item_type === 'recipe' ? (
              <ChefHat className="w-8 h-8 text-orange-500" />
            ) : (
              <Camera className="w-8 h-8 text-orange-500" />
            )}
          </div>
        )}
        
        {/* 🎬 타입 인디케이터 */}
        <div className="absolute top-2 right-2">
          {item.item_type === 'recipe' ? (
            <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
              <ChefHat className="w-3 h-3 text-white" />
            </div>
          ) : (
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <MessageSquare className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        
        {/* 🚀 SSA 기반 정보 표시 호버 오버레이 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-4 text-white">
            {/* 좋아요 상태 및 수 (정적 표시) - 프로필 그리드와 동일한 방식 */}
            <div className="flex items-center gap-1">
              <Heart 
                className={`w-5 h-5 transition-all duration-200 ${
                  hasLiked 
                    ? 'fill-red-500 text-red-500' 
                    : 'text-white'
                }`}
                data-debug={`item-${itemId}-liked-${hasLiked}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(`🔍 Heart clicked for item ${itemId}:`, {
                    title: item.title?.substring(0, 20),
                    hasLiked,
                    likesCount,
                    currentClassName: e.currentTarget.className
                  });
                }}
              />
              <span className="font-semibold text-sm">{formatCount(likesCount || 0)}</span>
            </div>
            
            {/* 댓글 수 (정적 표시) */}
            <div className="flex items-center gap-1">
              <MessageCircle className="w-5 h-5 text-white" />
              <span className="font-semibold text-sm">{formatCount(commentsCount || 0)}</span>
            </div>
          </div>
        </div>
        
        {/* 📸 다중 이미지 인디케이터 */}
        {item.image_urls && item.image_urls.length > 1 && (
          <div className="absolute top-2 left-2">
            <div className="w-5 h-5 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
              <div className="text-white text-xs font-bold">{item.image_urls.length}</div>
            </div>
          </div>
        )}
        
        {/* 📝 제목 표시 (검색 결과에서 매칭 정보 제공) */}
        {item.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2">
            <h3 className="text-white text-xs font-medium line-clamp-2 leading-tight">
              {item.title}
            </h3>
          </div>
        )}
      </div>
    </Link>
  )
} 