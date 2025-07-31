'use client'

import PostCard from '@/components/items/PostCard'
import PostCardSkeleton from '@/components/items/PostCardSkeleton'
import { Item } from '@/types/item'

interface PopularPostsProps {
  	posts: Item[] | undefined;
  isLoading: boolean;
}

export default function PopularPosts({ posts, isLoading }: PopularPostsProps) {

  // 🔧 로딩 중이고 기존 데이터가 없을 때만 스켈레톤 표시
  if (isLoading && (!posts || posts.length === 0)) {
    return (
      <div>
        <h2 className="text-lg font-bold mb-4">인기 레시피드</h2>
        <div className="space-y-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      </div>
    )
  }

  // 🔧 데이터가 없으면 표시하지 않음 (깜빡임 방지)
  if (!posts || posts.length === 0) {
    return null
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">인기 레시피드</h2>
      {/* 🔧 로딩 중일 때 투명도 약간 줄여서 새로고침 중임을 표시 */}
      <div className={`space-y-4 transition-opacity duration-200 ${isLoading ? 'opacity-70' : 'opacity-100'}`}>
        {posts.map((post) => (
          <PostCard key={`popular-${post.item_id}`} item={post} />
        ))}
      </div>
    </div>
  )
}
