import PostCardSkeleton from "@/components/items/PostCardSkeleton"
import RecipeCardSkeleton from "@/features/recipe/components/RecipeCardSkeleton"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * 서버 응답을 기다리는 동안 보여주는 경로별 로딩 화면. 각 경로의 loading.tsx에서 사용한다.
 * 각 화면의 기존 로딩 스켈레톤과 같은 모양을 써서 전환 중 레이아웃이 튀지 않게 한다.
 */
export function DetailLoading() {
  return (
    <div className="px-3 pt-3" role="status" aria-label="글을 불러오는 중" aria-busy="true">
      <p className="mb-2 text-right text-meta text-ink-soft">불러오는 중…</p>
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

/**
 * 레시피북 목록 전용 대기 UI. React useSearchParams 경계에서도
 * 동일한 카드 스켈레톤을 보여 줘 로고 로딩 → 카드 스켈레톤 전환을 피한다.
 */
export function RecipeBookLoading() {
  return (
    <div role="status" aria-label="레시피북을 불러오는 중" aria-busy="true" className="px-2 py-3">
      <p className="mb-3 text-right text-meta text-ink-soft">불러오는 중…</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-[18px]">
        {Array.from({ length: 6 }, (_, index) => <RecipeCardSkeleton key={index} />)}
      </div>
    </div>
  )
}
