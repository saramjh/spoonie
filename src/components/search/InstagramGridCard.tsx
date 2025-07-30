"use client"

import Link from "next/link"
import Image from "next/image"
import { Heart, MessageCircle, ChefHat, MessageSquare, Camera } from "lucide-react"
import { formatCount } from "@/lib/utils"
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
  
  const detailUrl = `${item.item_type === 'recipe' ? '/recipes' : '/posts'}/${itemId}`
  
  return (
    <Link href={detailUrl} className="block group">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 rounded-sm">
        {/* 🖼️ 이미지 */}
        {item.image_urls && item.image_urls.length > 0 ? (
          <Image 
            src={item.image_urls[0]} 
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
        
        {/* 🎯 Instagram 스타일 호버 오버레이 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-4 text-white">
            <div className="flex items-center gap-1">
              <Heart className="w-5 h-5 fill-current" />
              <span className="font-semibold text-sm">{formatCount(item.likes_count || 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-5 h-5 fill-current" />
              <span className="font-semibold text-sm">{formatCount(item.comments_count || 0)}</span>
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
      </div>
    </Link>
  )
} 