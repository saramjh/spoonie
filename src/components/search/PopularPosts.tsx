'use client'

import PostCard from '@/components/items/PostCard'
import PostCardSkeleton from '@/components/items/PostCardSkeleton'
import { Item } from '@/types/item'

interface PopularPostsProps {
  	posts: Item[] | undefined;
  isLoading: boolean;
}

export default function PopularPosts({ posts, isLoading }: PopularPostsProps) {
  if (isLoading) {
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

  if (!posts || posts.length === 0) {
    return null; // 또는 "인기 게시물이 없습니다." 메시지 표시
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">인기 레시피드</h2>
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={`popular-${post.item_id}`} item={post} />
        ))}
      </div>
    </div>
  )
}
