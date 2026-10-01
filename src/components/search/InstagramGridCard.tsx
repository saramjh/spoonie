"use client"

import Image from "next/image"
import { ChefHat, Camera } from "lucide-react"

import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import { useNavigation } from "@/hooks/useNavigation"
import type { Item } from "@/types/item"
import { IntentLink } from "@/components/kit"

interface InstagramGridCardProps {
  item: Item
}

export default function InstagramGridCard({ item }: InstagramGridCardProps) {
  // SSA 기반 캐시 연동 (React Hook을 먼저 호출)
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
  
  // SSA 캐시 연동 완료 (통계 정보는 상세페이지에서만)
  
  const baseUrl = `${item.item_type === 'recipe' ? '/recipes' : '/posts'}/${itemId}`
  const detailUrl = createLinkWithOrigin(baseUrl)
  
  return (
    <IntentLink href={detailUrl} className="block group">
      <div className="relative aspect-square overflow-hidden rounded-[2px] bg-muted">
        {/* 이미지 */}
        {item.image_urls && item.image_urls.length > 0 ? (
          <Image 
            src={cachedItem.image_urls[cachedItem.thumbnail_index || 0]} 
            alt={item.title || "Post Image"} 
            fill 
            className="object-cover" 
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            {item.item_type === 'recipe' ? (
              <ChefHat className="w-8 h-8 text-ink-soft" aria-hidden />
            ) : (
              <Camera className="w-8 h-8 text-ink-soft" aria-hidden />
            )}
          </div>
        )}
        
        {/* 토스식 미니멀 제목 (검색 매칭 확인용만) */}
        {item.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6">
            <h3 className="line-clamp-1 text-[13px] font-medium text-white">
              {item.title}
            </h3>
          </div>
        )}
      </div>
    </IntentLink>
  )
} 