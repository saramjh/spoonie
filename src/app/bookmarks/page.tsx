"use client"

// React hooks removed - not used in this component
import { useRouter } from "@/shared/lib/navigation"
import { Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import PostCard from "@/components/items/PostCard"
import PostCardSkeleton from "@/components/items/PostCardSkeleton"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { useSessionStore } from "@/store/sessionStore"
import type { Item, Profile } from "@/types/item"
import useSWR from "swr"
import { PageHeader, Sheet } from "@/components/kit"

// 북마크 데이터 fetcher (SWR용)
const fetchBookmarks = async (userId: string): Promise<Item[]> => {
  const supabase = createSupabaseBrowserClient()
  
  // 북마크된 아이템들을 가져오기 (items + profiles 조인)
  const { data: bookmarksData, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select(`
      created_at,
      items (
        *,
        profiles!user_id (
          username,
          display_name,
          avatar_url,
          public_id
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (bookmarksError) throw bookmarksError
  if (!bookmarksData || bookmarksData.length === 0) return []

  // Supabase 관계 조회는 한 건이어도 배열로 올 수 있다
  type BookmarkedItem = Item & { profiles?: Profile | Profile[] | null }
  const itemOf = (bookmark: { items: unknown }) => (Array.isArray(bookmark.items) ? bookmark.items[0] : bookmark.items) as BookmarkedItem

  // 북마크된 아이템들의 현재 좋아요/팔로우 상태 확인
  const itemIds = bookmarksData.map(bookmark => itemOf(bookmark).id)
  const userLikesMap = new Map<string, boolean>()
  const userFollowsMap = new Map<string, boolean>()

  if (itemIds.length > 0) {
    // 좋아요 상태 확인
    const { data: likesData } = await supabase
      .from('likes')
      .select('item_id')
      .eq('user_id', userId)
      .in('item_id', itemIds)

    likesData?.forEach(like => {
      userLikesMap.set(like.item_id, true)
    })

    // 팔로우 상태 확인
    const authorIds = bookmarksData
      .map(bookmark => itemOf(bookmark).user_id)
      .filter(authorUserId => authorUserId !== userId)
    
    if (authorIds.length > 0) {
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .in('following_id', authorIds)

      followsData?.forEach(follow => {
        userFollowsMap.set(follow.following_id, true)
      })
    }
  }

  // 데이터 변환 (기존 피드와 동일한 형식)
  const transformedItems: Item[] = bookmarksData.map(bookmark => {
    const item = itemOf(bookmark)
    const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles

    return {
      id: item.id,
      item_id: item.id,
      user_id: item.user_id,
      item_type: item.item_type as "post" | "recipe",
      created_at: item.created_at,
      is_public: item.is_public,
      display_name: profileData?.display_name || null,
      username: profileData?.username || null,
      avatar_url: profileData?.avatar_url || null,
      user_public_id: profileData?.public_id || null,
      title: item.title,
      content: item.content,
      description: item.description,
      image_urls: item.image_urls,
      thumbnail_index: item.thumbnail_index,
      tags: item.tags,
      color_label: item.color_label,
      servings: item.servings,
      cooking_time_minutes: item.cooking_time_minutes,
      recipe_id: item.recipe_id,
      cited_recipe_ids: item.cited_recipe_ids,
      likes_count: 0, // TODO: 집계 쿼리로 가져올 예정
      comments_count: 0, // TODO: 집계 쿼리로 가져올 예정
      is_liked: userLikesMap.get(item.id) || false,
      is_following: userFollowsMap.get(item.user_id) || false,
      is_bookmarked: true, // 북마크 페이지이므로 항상 true
      bookmarks_count: 0, // TODO: 집계 쿼리로 가져올 예정
      author: profileData
    } as Item
  })

  return transformedItems
}

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
      refreshInterval: 30000, // 30초마다 자동 새로고침
    }
  )

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bookmark className="w-16 h-16 text-ink-soft/60 mx-auto mb-4" />
          <h2 className="text-title text-ink mb-2">로그인이 필요합니다</h2>
          <p className="text-ink-soft mb-4">북마크 기능을 사용하려면 로그인해주세요.</p>
          <Button onClick={() => router.push("/login")}>로그인하기</Button>
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