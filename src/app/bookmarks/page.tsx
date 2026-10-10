"use client"

// React hooks removed - not used in this component
import { useRouter } from "@/shared/lib/navigation"
import { Button } from "@/components/ui/button"
import PostCard from "@/components/items/PostCard"
import PostCardSkeleton from "@/components/items/PostCardSkeleton"
import { fetchBookmarks } from "@/features/social/data/bookmark-repository"
import { useSessionStore } from "@/store/sessionStore"
import useSWR from "swr"
import Link from "next/link"
import { PageHeader, Sheet, StateSheet } from "@/components/kit"

export default function BookmarksPage() {
  const router = useRouter()
  const { session } = useSessionStore()

  // SWR로 실시간 북마크 데이터 관리
  const { data: bookmarkedItems, error, isLoading, mutate } = useSWR(
    session ? `bookmarks_${session.id}` : null,
    () => fetchBookmarks(session!.id),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  if (!session) {
    return (
      <div>
        <PageHeader title="저장한 글" />
        <div className="px-3 pt-3">
          <StateSheet
            headingLevel="h2"
            title="마음에 드는 요리를 나중에 다시 꺼내 보세요."
            body="레시피와 레시피드를 저장해 두면 ‘저장한 글’에서 모아 볼 수 있어요. 로그인한 뒤 원하는 글에서 저장 버튼을 눌러 주세요."
            action={
              <div className="w-full">
                <Button asChild className="w-full"><Link href="/login?next=%2Fbookmarks">로그인하고 저장한 글 보기</Link></Button>
                <p className="mt-3 text-center text-label text-ink-soft">
                  처음이라면 <Link href="/signup?next=%2Fbookmarks" className="font-semibold text-ink underline underline-offset-4">계정 만들기</Link>
                </p>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <PageHeader title="저장한 글" />

      {/* 콘텐츠 */}
      <div className="px-3 py-3">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <Sheet className="px-5 py-6">
            <p className="text-heading text-ink">저장한 글을 불러오지 못했어요</p>
            <p className="mt-1 text-label text-ink-soft">연결 상태를 확인하고 다시 시도해 주세요.</p>
            <Button className="mt-4" onClick={() => mutate()}>다시 시도</Button>
          </Sheet>
        ) : !bookmarkedItems || bookmarkedItems.length === 0 ? (
          <Sheet className="px-5 py-6">
            <p className="text-heading text-ink">아직 저장한 글이 없어요</p>
            <p className="mt-1 text-label text-ink-soft">레시피나 레시피드의 저장 버튼을 누르면 여기에 모여요.</p>
            <Button className="mt-4" onClick={() => router.push("/")}>홈으로</Button>
          </Sheet>
        ) : (
          <div className="space-y-4">
            {bookmarkedItems.map((item) => (
              <PostCard
                key={item.id}
                item={item}
                currentUser={session}
                surface="bookmarks"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}