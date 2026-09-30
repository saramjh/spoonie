import { createSupabaseServerClient } from "@/lib/supabase-server"
import type { Item } from "@/types/item"
import type { User } from "@supabase/supabase-js"

/**
 * 🚀 서버 사이드 초기 피드 데이터 페칭
 * SSR 성능 최적화를 위한 서버 전용 함수
 */

const PAGE_SIZE = 12

export interface ServerFeedData {
  items: Item[]
  hasNextPage: boolean
  totalCount: number
  userLikes: Map<string, boolean>
  userFollows: Map<string, boolean>
  currentUser: User | null
}

/**
 * 홈 피드 초기 데이터를 서버에서 미리 가져옴
 * 클라이언트의 3번 요청을 1번의 서버 작업으로 통합
 */
export async function getInitialFeedData(): Promise<ServerFeedData> {

  // const startTime = Date.now() // Performance tracking not used
  
  const supabase = createSupabaseServerClient()
  
  try {
    // 1. 현재 사용자 확인 (읽기 전용, 토큰 갱신 없음)
    let user: User | null = null
    try {
      const { data: authData, error: userError } = await supabase.auth.getUser()
      user = authData?.user || null
      
      if (userError && !userError.message?.includes('Auth session missing')) {
        console.warn("⚠️ Server: User auth error:", userError.message)
      }
    } catch (authError) {
      // 인증 에러는 무시하고 게스트로 처리
      if (process.env.NODE_ENV === 'development') {
        console.log("🔍 Server: Auth session not available, proceeding as guest")
      }
      user = null
    }

    // 2. 최적화된 뷰에서 피드 아이템 조회 + 작성자 정보 확실히 포함
    const { data: items, error: itemsError, count } = await supabase
      .from("optimized_feed_view")
      .select(`
        *,
        profiles!user_id (
          username,
          display_name,
          avatar_url,
          public_id
        )
      `, { count: "exact" })
      .range(0, PAGE_SIZE - 1)
      .order("created_at", { ascending: false })

    if (itemsError) {
      console.error("❌ Server: Error fetching items:", itemsError)
      throw itemsError
    }

    const feedItems = items || []
    const totalCount = count || 0
    const hasNextPage = totalCount > PAGE_SIZE

    // 3. 사용자별 상호작용 데이터 (로그인 시에만)
    const userLikes = new Map<string, boolean>()
    const userFollows = new Map<string, boolean>()

    if (user && feedItems.length > 0) {
      const itemIds = feedItems.map(item => item.id)
      const authorIds = Array.from(new Set(feedItems.map(item => item.user_id)))

      try {
        // 좋아요와 팔로우 상태 병렬 조회
        const [likesResult, followsResult] = await Promise.all([
          supabase.rpc('get_user_likes_for_items', {
            user_id_param: user.id,
            item_ids_param: itemIds
          }),
          supabase.rpc('get_user_follows_for_authors', {
            user_id_param: user.id,
            author_ids_param: authorIds
          })
        ])

        // 좋아요 맵 구성
        if (likesResult.data) {
          likesResult.data.forEach((like: { item_id: string; is_liked: boolean }) => {
            userLikes.set(like.item_id, like.is_liked)
          })
        }

        // 팔로우 맵 구성  
        if (followsResult.data) {
          followsResult.data.forEach((follow: { author_id: string; is_following: boolean }) => {
            userFollows.set(follow.author_id, follow.is_following)
          })
        }
      } catch (error) {
        console.warn("⚠️ Server: Error fetching user interactions:", error)
        // 에러가 있어도 기본 피드는 제공
      }
    }

    // 아이템에 사용자 상호작용 정보 + 작성자 정보 병합
    const enrichedItems: Item[] = feedItems.map(item => {
      // profiles 데이터 평면화 - 배열이면 첫 번째 요소, 객체면 그대로 사용
      const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      
      return {
        ...item,
        // 🔧 호환성을 위한 item_id 별칭 명시적 설정
        item_id: item.id,
        // 사용자 상호작용 정보
        user_has_liked: userLikes.get(item.id) || false,
        is_following_author: userFollows.get(item.user_id) || false,
        // 🔧 작성자 정보 확실히 포함 - profiles에서 가져온 데이터 우선 사용
        display_name: profileData?.display_name || item.display_name || null,
        username: profileData?.username || item.username || null,
        avatar_url: profileData?.avatar_url || item.avatar_url || null,
        user_public_id: profileData?.public_id || item.user_public_id || null,
        // profiles 필드는 제거 (중복 방지)
        profiles: undefined
      }
    })

    // const endTime = Date.now() // Performance tracking not used
    // Server: Initial feed data fetched: { itemsCount, hasNextPage, totalCount, userInteractions }

    return {
      items: enrichedItems,
      hasNextPage,
      totalCount,
      userLikes,
      userFollows,
      currentUser: user
    }

  } catch (error) {
    console.error("❌ Server: Failed to fetch initial feed data:", error)
    
    // 실패 시 빈 데이터 반환 (클라이언트에서 재시도 가능)
    return {
      items: [],
      hasNextPage: false,
      totalCount: 0,
      userLikes: new Map(),
      userFollows: new Map(),
      currentUser: null
    }
  }
} 