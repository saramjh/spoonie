"use client"

// React hooks removed - not used in this component
import { Button } from "@/components/ui/button"
import PostCard from "@/components/items/PostCard"
import PostCardSkeleton from "@/components/items/PostCardSkeleton"
import RecipeListCard from "@/features/recipe/components/RecipeListCard"
import { BookmarkButton } from "@/components/items/BookmarkButton"
import { fetchBookmarks } from "@/features/social/data/bookmark-repository"
import { useSessionStore } from "@/store/sessionStore"
import useSWR from "swr"
import Link from "@/components/kit/NavigationLink"
import { StateSheet } from "@/components/kit"

export default function BookmarksPage() {
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

  return (
    <section className="min-h-screen bg-paper">
      <div className="px-3.5 pt-4">
        <h1 className="text-display font-semibold text-ink">저장한 글</h1>
      </div>
      <div className="px-3.5">
        {!session ? (
          <StateSheet variant="locked" headingLevel="h2"
            title="로그인하고 이어서 볼 수 있어요"
            body="내 레시피와 저장한 글을 한곳에서 관리해 보세요."
            action={<Button asChild className="min-h-12 px-5"><Link href="/login?next=%2Fbookmarks">로그인</Link></Button>}
          />
        ) : isLoading ? (
          <div aria-label="저장한 글 불러오는 중" aria-busy="true" className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => <PostCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <StateSheet title="저장한 글을 불러오지 못했어요" body="연결 상태를 확인하고 다시 시도해 주세요."
            action={<Button type="button" onClick={() => void mutate()}>다시 시도</Button>} />
        ) : !bookmarkedItems?.length ? (
          <StateSheet title="아직 저장한 글이 없어요" body="레시피나 레시피드의 저장 버튼을 누르면 여기에 모여요."
            action={<Button asChild><Link href="/">둘러보기</Link></Button>} />
        ) : (
          <div className="space-y-6">
            {bookmarkedItems.some(item => item.item_type === "recipe") && (
              <section aria-label="저장한 레시피">
                <div className="divide-y divide-border">
                  {bookmarkedItems.filter(item => item.item_type === "recipe").map(item => (
                    <div key={item.id} className="py-2">
                      <RecipeListCard item={item} showAuthor className="rounded-none p-0 shadow-none" />
                      <div className="mt-1 flex items-center justify-between text-meta text-ink-soft">
                        <span>레시피</span>
                        <BookmarkButton itemId={item.item_id || item.id} itemType="recipe"
                          currentUserId={session.id} initialIsBookmarked
                          cachedItem={item} size="sm" label="저장 해제" className="h-11 gap-1 px-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {bookmarkedItems.some(item => item.item_type === "post") && (
              <section aria-labelledby="saved-posts-title">
                <h2 id="saved-posts-title" className="mb-3 text-heading font-semibold text-ink">저장한 레시피드</h2>
                <div className="space-y-5">
                  {bookmarkedItems.filter(item => item.item_type === "post").map(item => (
                    <PostCard key={item.id} item={item} currentUser={session} surface="bookmarks" />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
