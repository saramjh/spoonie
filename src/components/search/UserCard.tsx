"use client"
import Link from "next/link"
import Image from "next/image"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { User } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import type { Item } from "@/types/item"

// 👤 유저 검색 결과 타입 (search/page.tsx와 동일)
interface UserResult {
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  items_count: number;
  latest_items: Item[];
}

interface UserCardProps {
  user: UserResult
}

export default function UserCard({ user }: UserCardProps) {
  const { createLinkWithOrigin } = useNavigation()
  const profileUrl = createLinkWithOrigin(`/profile/${user.user_id}`)
  
  return (
    <Link href={profileUrl} className="block">
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center space-x-3 mb-3">
          {/* 👤 유저 아바타 */}
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.avatar_url} alt={user.username} />
            <AvatarFallback>
              <User className="w-6 h-6 text-gray-500" />
            </AvatarFallback>
          </Avatar>
          
          {/* 👤 유저 정보 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              			{user.username}
            </h3>
            <p className="text-sm text-gray-500 truncate">@{user.username}</p>
            <p className="text-xs text-gray-400">
              {user.items_count}개의 레시피 & 레시피드
            </p>
          </div>
        </div>
        
        {/* 📱 최근 아이템 미리보기 */}
        {user.latest_items.length > 0 && (
          <div className="grid grid-cols-3 gap-1">
            {user.latest_items.slice(0, 3).map((item, index) => (
              <div key={`${user.user_id}-${index}`} className="aspect-square relative rounded overflow-hidden bg-gray-100">
                {item.image_urls && item.image_urls.length > 0 ? (
                  <Image 
                    src={item.image_urls[item.thumbnail_index || 0]} 
                    alt={item.title || "Preview"} 
                    fill 
                    className="object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
} 