import PostCardSkeleton from "@/components/items/PostCardSkeleton"
import RecipeCardSkeleton from "@/features/recipe/components/RecipeCardSkeleton"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * 서버 응답을 기다리는 동안 보여주는 경로별 로딩 화면. 각 경로의 loading.tsx에서 사용한다.
 * 각 화면의 기존 로딩 스켈레톤과 같은 모양을 써서 전환 중 레이아웃이 튀지 않게 한다.
 */
export function DetailLoading() {
  return (
    <div role="status" aria-label="글을 불러오는 중" aria-busy="true" className="min-h-[70vh] bg-paper">
      <span className="sr-only">불러오는 중…</span>
      <div className="flex h-14 items-center gap-3 border-b border-border px-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="mx-3 mt-3 aspect-[3/2] w-[calc(100%-24px)] rounded-xl" />
      <div className="space-y-3 px-4 pt-5">
        <Skeleton className="h-7 w-4/5" />
        <Skeleton className="h-4 w-1/3" />
        <div className="space-y-2 pt-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
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

/** Keep the destination's real layout visible while its server/client data is pending. */
export function FeedLoading() {
  return (
    <div role="status" aria-label="피드를 불러오는 중" aria-busy="true" className="space-y-4 bg-paper py-3">
      <span className="sr-only">피드를 불러오는 중…</span>
      {Array.from({ length: 2 }, (_, index) => <PostCardSkeleton key={index} />)}
    </div>
  )
}

export function SearchLoading() {
  return (
    <div role="status" aria-label="검색 화면을 불러오는 중" aria-busy="true" className="space-y-5 px-3 pb-20 pt-3">
      <span className="sr-only">검색 화면을 불러오는 중…</span>
      <div className="flex gap-2">
        <Skeleton className="h-12 min-w-0 flex-1" />
        <Skeleton className="h-12 w-11" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="mb-3 h-6 w-24" />
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[88px] w-full rounded-[3px]" />)}
      </div>
    </div>
  )
}

export function BookmarksLoading() {
  return (
    <div role="status" aria-label="저장한 글을 불러오는 중" aria-busy="true" className="space-y-4 bg-paper px-3.5 pt-4">
      <span className="sr-only">저장한 글을 불러오는 중…</span>
      <Skeleton className="h-8 w-28" />
      {Array.from({ length: 2 }, (_, index) => <PostCardSkeleton key={index} />)}
    </div>
  )
}

export function NotificationsLoading() {
  return (
    <div role="status" aria-label="알림을 불러오는 중" aria-busy="true" className="space-y-3 bg-paper px-4 pt-5">
      <span className="sr-only">알림을 불러오는 중…</span>
      <Skeleton className="mb-5 h-7 w-16" />
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-border py-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-3 w-24" /></div>
        </div>
      ))}
    </div>
  )
}

/** One fallback for non-feed routes that do not have a dedicated skeleton. */
export function RouteTransitionLoading({ pathname }: { pathname: string }) {
  if (/^\/(?:recipes|posts)\/[0-9a-f-]{36}$/i.test(pathname)) return <DetailLoading />
  if (/^\/profile\/[^/]+$/.test(pathname)) return <ProfileLoading />
  if (pathname === "/recipes") return <RecipeBookLoading />
  if (pathname === "/search") return <SearchLoading />
  if (pathname === "/bookmarks") return <BookmarksLoading />
  if (pathname === "/notifications") return <NotificationsLoading />
  if (pathname === "/" || pathname.startsWith("/topics/")) return <FeedLoading />
  return (
    <div role="status" aria-label="화면을 불러오는 중" aria-busy="true" className="space-y-4 px-4 pt-6">
      <span className="sr-only">화면을 불러오는 중…</span>
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
