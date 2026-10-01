"use client"

import Link from "next/link"
import Image from "next/image"
import { ChefHat, MessageSquare, Camera } from "lucide-react"

import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import { useNavigation } from "@/hooks/useNavigation"
import type { Item } from "@/types/item"

interface InstagramGridCardProps {
  item: Item
}

export default function InstagramGridCard({ item }: InstagramGridCardProps) {
  // 🚀 SSA 기반 캐시 연동 (React Hook을 먼저 호출)
  const itemId = item.item_id || item.id;
  const { createLinkWithOrigin } = useNavigation()
  const fallbackItem = {
    ...item,
    likes_count: item.likes_count || 0,
    comments_count: item.comments_count || 0,
    is_liked: item.is_liked || false
  }
  const cachedItem = useSSAItemCache(itemId, fallbackItem)
  
  // ID 안전성 체크 (Hook 호출 후에 early return)
  if (!itemId) {
    console.warn('InstagramGridCard: Missing item ID', item);
    return null;
  }
  
  // 🚀 SSA 캐시 연동 완료 (통계 정보는 상세페이지에서만)
  
  const baseUrl = `${item.item_type === 'recipe' ? '/recipes' : '/posts'}/${itemId}`
  const detailUrl = createLinkWithOrigin(baseUrl)
  
  return (
    <Link href={detailUrl} className="block group">
      <div className="relative aspect-square overflow-hidden bg-gray-100 rounded-sm">
        {/* 🖼️ 이미지 */}
        {item.image_urls && item.image_urls.length > 0 ? (
          <Image 
            src={cachedItem.image_urls[cachedItem.thumbnail_index || 0]} 
            alt={item.title || "Post Image"} 
            fill 
            className="object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
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
        

        
        {/* 📝 토스식 미니멀 제목 (검색 매칭 확인용만) */}
        {item.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <h3 className="text-white text-xs line-clamp-1">
              {item.title}
            </h3>
          </div>
        )}
      </div>
    </Link>
  )
} 