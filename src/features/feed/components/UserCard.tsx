"use client"
import { IntentLink } from "@/components/kit"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { User } from "lucide-react"
import { useNavigation } from "@/hooks/useNavigation"
import type { UserSearchResult } from "@/features/feed/data/search-optimization"
import { Sheet } from "@/components/kit"

interface UserCardProps {
  user: UserSearchResult
}

export default function UserCard({ user }: UserCardProps) {
  const { createLinkWithOrigin } = useNavigation()
  const profileUrl = createLinkWithOrigin(`/profile/${user.user_id}`)
  
  return (
    <IntentLink href={profileUrl} className="block">
      <Sheet className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          {/* 유저 아바타 */}
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.avatar_url ?? undefined} alt={user.display_name || user.username} />
            <AvatarFallback>
              <User className="w-6 h-6 text-ink-soft" />
            </AvatarFallback>
          </Avatar>
          
          {/* 유저 정보 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-ink truncate">
              {user.display_name || user.username}
            </h3>
            {(!user.display_name || user.display_name !== user.username) && <p className="text-meta text-ink-soft truncate">@{user.username}</p>}
            <p className="text-meta text-ink-soft">
              {user.items_count}개의 레시피 & 레시피드
            </p>
          </div>
        </div>
        
      </Sheet>
    </IntentLink>
  )
} 