/** 저장한 글의 데이터 소유자. 비공개 항목은 기존 RLS 접근을 유지한다. */
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import type { Item, Profile } from "@/types/item"

// 북마크 데이터 fetcher (SWR용)
export const fetchBookmarks = async (userId: string): Promise<Item[]> => {
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
  const publicStats = new Map<string, { likes_count: number; comments_count: number; is_liked: boolean }>()
  const userFollowsMap = new Map<string, boolean>()

  if (itemIds.length > 0) {
    // 공개 글 반응 집계는 홈 피드와 같은 DB 뷰에서 한 번에 가져온다.
    const publicIds = bookmarksData.map(itemOf).filter(item => item.is_public).map(item => item.id)
    if (publicIds.length) {
      const { data: stats, error: statsError } = await supabase
        .from('optimized_feed_view')
        .select('id,likes_count,comments_count,is_liked')
        .in('id', publicIds)
      if (statsError) throw statsError
      for (const row of stats || []) {
        publicStats.set(row.id, {
          likes_count: Number(row.likes_count) || 0,
          comments_count: Number(row.comments_count) || 0,
          is_liked: Boolean(row.is_liked),
        })
      }
      if (publicStats.size !== new Set(publicIds).size) throw new Error("저장한 글의 반응 집계를 불러오지 못했습니다.")
    }

    // 공개 피드 뷰에서 제외된 비공개 글의 본인 좋아요 상태는 기존 조회로 보존한다.
    const privateIds = bookmarksData.map(itemOf).filter(item => !item.is_public).map(item => item.id)
    if (privateIds.length) {
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('item_id')
        .eq('user_id', userId)
        .in('item_id', privateIds)
      if (likesError) throw likesError
      likesData?.forEach(like => userLikesMap.set(like.item_id, true))
    }

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
      likes_count: publicStats.get(item.id)?.likes_count ?? 0,
      comments_count: publicStats.get(item.id)?.comments_count ?? 0,
      is_liked: publicStats.get(item.id)?.is_liked ?? userLikesMap.get(item.id) ?? false,
      is_following: userFollowsMap.get(item.user_id) || false,
      is_bookmarked: true, // 북마크 페이지이므로 항상 true
      bookmarks_count: 0, // TODO: 집계 쿼리로 가져올 예정
      author: profileData
    } as Item
  })

  return transformedItems
}
