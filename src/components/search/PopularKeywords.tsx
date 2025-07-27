'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface PopularKeywordsProps {
  keywords: { keyword: string }[] | undefined;
  isLoading: boolean;
  onKeywordClick: (keyword: string) => void;
}

export default function PopularKeywords({ keywords, isLoading, onKeywordClick }: PopularKeywordsProps) {
  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-bold mb-4">인기 검색어</h2>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!keywords || keywords.length === 0) {
    return null; // 또는 "인기 검색어가 없습니다." 메시지 표시
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">인기 검색어</h2>
      <div className="flex flex-wrap gap-2">
        {keywords.map(({ keyword }) => (
          <button 
            key={keyword} 
            onClick={() => onKeywordClick(keyword)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {keyword}
          </button>
        ))}
      </div>
    </div>
  )
}
