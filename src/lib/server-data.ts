import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Item } from "@/types/item"
import type { User } from "@supabase/supabase-js"

/**
 * 서버 사이드 초기 피드 데이터 페칭
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
 * 로그인 정보 없이 공개 피드만 조회한다.
 * 쿠키를 읽지 않으므로 홈 HTML을 정적으로 만들어 CDN에서 바로 보낼 수 있다.
 * 로그인 사용자의 좋아요/팔로우 상태는 클라이언트가 이어서 채운다.
 */
export async function getPublicFeedData(): Promise<ServerFeedData> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return loadFeed(supabase)
}

async function loadFeed(supabase: SupabaseClient): Promise<ServerFeedData> {

  try {
    const itemsPromise = supabase
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

    const { data: items, error: itemsError, count } = await itemsPromise

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

    // 아이템에 사용자 상호작용 정보 + 작성자 정보 병합
    const enrichedItems: Item[] = feedItems.map(item => {
      // profiles 데이터 평면화 - 배열이면 첫 번째 요소, 객체면 그대로 사용
      const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      
      return {
        ...item,
        // 호환성을 위한 item_id 별칭 명시적 설정
        item_id: item.id,
        // 사용자 상호작용 정보
        user_has_liked: userLikes.get(item.id) || false,
        is_following_author: userFollows.get(item.user_id) || false,
        // 작성자 정보 확실히 포함 - profiles에서 가져온 데이터 우선 사용
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
      currentUser: null
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