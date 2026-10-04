/**
 * 홈 피드 저장소. hooks/usePosts.ts의 SWR fetcher를 내용 그대로 옮겼다. 키 모양: items|페이지|사용자
 */

import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import type { Item } from "@/types/item"
import { HOME_FEED_PAGE_SIZE } from "@/features/feed/domain/feed-order"

const PAGE_SIZE = HOME_FEED_PAGE_SIZE

/**
 * 홈 피드 데이터 페칭 함수
 * 레시피(recipe)와 레시피드(post) 모두 포함한 통합 피드를 가져옵니다
 * 
 * @param key - SWR 키 (페이지 인덱스와 사용자 ID 포함)
 * @returns 레시피와 레시피드가 포함된 FeedItem 배열
 */
export const fetchHomeFeedPage = async (key: string): Promise<Item[]> => {
  const supabase = createSupabaseBrowserClient()
  const [, pageIndexStr, userId] = key.split("|")
  const pageIndex = parseInt(pageIndexStr, 10)
  const offset = pageIndex * PAGE_SIZE

  // 공개 범위는 view/RLS가 결정하므로 클라이언트에서 별도 필터를 복제하지 않는다.
  const { data: items, error } = await supabase
    .from("optimized_feed_view")
    .select(`
      *,
      profiles!user_id (
        username,
        display_name,
        avatar_url,
        public_id
      )
    `)
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    throw error
  }
  
  if (!items || items.length === 0) {
    return []
  }

  const itemIds = items.map((item) => item.id)
  const authorIds = Array.from(new Set(items.map((item) => item.user_id))) // 중복 제거
  const userLikesMap = new Map<string, boolean>()
  const userFollowsMap = new Map<string, boolean>()

  // 사용자별 좋아요 상태와 팔로우 상태 조회 (로그인 시에만)
  if (userId && userId !== "guest") {
    try {
      // 좋아요 상태 조회
      const { data: userLikes, error: likesError } = await supabase
        .rpc('get_user_likes_for_items', {
          user_id_param: userId,
          item_ids_param: itemIds
        })

      if (!likesError && userLikes) {
        userLikes.forEach((like: { item_id: string; is_liked: boolean }) => {
          userLikesMap.set(like.item_id, like.is_liked)
        })
      }

      // 팔로우 상태 조회
      const { data: userFollows, error: followsError } = await supabase
        .rpc('get_user_follows_for_authors', {
          user_id_param: userId,
          author_ids_param: authorIds
        })

      if (!followsError && userFollows) {
        userFollows.forEach((follow: { author_id: string; is_following: boolean }) => {
          userFollowsMap.set(follow.author_id, follow.is_following)
        })
      }
    } catch {
      // 에러 발생 시 조용히 무시하고 기본값 사용
    }
  }

  // 레시피(recipe)와 레시피드(post)를 통합한 FeedItem 배열 생성
  	const feedItems: Item[] = items.map((item) => {
    // profiles 데이터 평면화 - 서버와 동일한 방식
    const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
    
    // 좋아요 상태를 정확히 구분: undefined(불확실) vs false(확실히 안함) vs true(확실히 함)
    const userLikeStatus = userLikesMap.get(item.id)
    const isLikedValue = userId && userId !== "guest" 
      ? (userLikeStatus !== undefined ? userLikeStatus : false) // 로그인 시: 정확한 상태 또는 false(임시, LikeButton에서 DB 확인)
      : false // 비로그인 시: 항상 false
    
    return {
			id: item.id,
      item_id: item.id,
      user_id: item.user_id,
			item_type: item.item_type as "post" | "recipe", // "recipe": 요리법, "post": 일반 피드
      created_at: item.created_at,
      is_public: item.is_public,
      // relation으로 받은 profile 값을 view의 평면 필드보다 우선한다.
      display_name: profileData?.display_name || item.display_name || null,
      username: profileData?.username || item.username || null,
      avatar_url: profileData?.avatar_url || item.avatar_url || null,
      user_public_id: profileData?.public_id || item.user_public_id || null,
      user_email: null,
      title: item.title,
      content: item.content,
      description: item.description,
      image_urls: item.image_urls,
      thumbnail_index: item.thumbnail_index ?? 0, // 썸네일 인덱스 (기본값 0)
      tags: item.tags,
      color_label: item.color_label,
      servings: item.servings,
      cooking_time_minutes: item.cooking_time_minutes,
      recipe_id: item.recipe_id,
			cited_recipe_ids: item.cited_recipe_ids, // 참고 레시피 ID 목록
      creation_origin: item.creation_origin ?? null, // 작성 경로 (출처 쪽지의 "만들었어요"/"참고한")
      made_count: Number(item.made_count) || 0, // 다른 사람이 만든 기록 수
      continued_count: Number(item.continued_count) || 0,
      made_thumbs: item.made_thumbs || [],
      ingredient_count: item.ingredient_count || 0,
      key_ingredients: item.key_ingredients || [],
      likes_count: item.likes_count || 0,
      comments_count: item.comments_count || 0,
      is_liked: isLikedValue, // null 허용으로 불확실한 상태 표현
      is_following: userFollowsMap.get(item.user_id) || false,
    }
  })

  return feedItems
}
