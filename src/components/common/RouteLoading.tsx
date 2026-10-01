import PostCardSkeleton from "@/components/items/PostCardSkeleton"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * 서버 응답을 기다리는 동안 보여주는 경로별 로딩 화면. 각 경로의 loading.tsx에서 사용한다.
 * 각 화면의 기존 로딩 스켈레톤과 같은 모양을 써서 전환 중 레이아웃이 튀지 않게 한다.
 */
export function FeedLoading() {
  return (
    <div className="space-y-3 px-3 py-3" aria-busy="true">
      <span className="sr-only">불러오는 중</span>
      {Array.from({ length: 3 }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function DetailLoading() {
  return (
    <div className="px-3 pt-3" aria-busy="true">
      <span className="sr-only">불러오는 중</span>
      <PostCardSkeleton />
    </div>
  )
}

export function ProfileLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">불러오는 중</span>
      <div className="flex items-start gap-4 border-b border-border bg-paper px-4 pb-4 pt-5">
        <Skeleton className="h-[72px] w-[72px] rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-44" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-3 py-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] w-full" />
        ))}
      </div>
    </div>
  )
}
