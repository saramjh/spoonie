import PostCardSkeleton from "@/components/items/PostCardSkeleton"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * 서버 응답을 기다리는 동안 보여주는 경로별 로딩 화면. 각 경로의 loading.tsx에서 사용한다.
 * 각 화면의 기존 로딩 스켈레톤과 같은 모양을 써서 전환 중 레이아웃이 튀지 않게 한다.
 */
export function FeedLoading() {
  return (
    <div className="space-y-4 p-4" aria-busy="true">
      <span className="sr-only">불러오는 중</span>
      {Array.from({ length: 3 }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function DetailLoading() {
  return (
    <div className="p-4" aria-busy="true">
      <span className="sr-only">불러오는 중</span>
      <PostCardSkeleton />
    </div>
  )
}

export function ProfileLoading() {
  return (
    <div className="max-w-md mx-auto p-4 space-y-6" aria-busy="true">
      <span className="sr-only">불러오는 중</span>
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  )
}
