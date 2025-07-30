'use client'

import PostCard from '@/components/items/PostCard'
import PostCardSkeleton from '@/components/items/PostCardSkeleton'
import { Item } from '@/types/item'

interface SearchResultsProps {
  	results: Item[] | undefined;
  isLoading: boolean;
}

export default function SearchResults({ results, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    )
  }

  if (!results || results.length === 0) {
    return <div className="text-center p-8 text-gray-500">검색 결과가 없습니다.</div>
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">검색 결과</h2>
      <div className="space-y-4">
        {results.map((item) => (
          <PostCard key={`search-${item.item_id}`} item={item} />
        ))}
      </div>
    </div>
  )
}
