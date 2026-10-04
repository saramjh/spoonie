import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createSupabasePublicClient } from "@/shared/infra/supabase-public"
import type { Item } from "@/types/item"
import { HOME_FEED_PAGE_SIZE } from "@/features/feed/domain/feed-order"

export interface ServerFeedData {
  items: Item[]
  currentUser: User | null
}

/**
 * 로그인 정보 없이 공개 피드 첫 페이지를 조회한다.
 * 쿠키를 읽지 않으므로 홈 HTML을 정적으로 만들어 CDN에서 바로 보낼 수 있다.
 * 로그인 사용자의 좋아요/팔로우 상태는 클라이언트 피드 fetcher가 이어서 채운다.
 */
export async function getPublicFeedData(): Promise<ServerFeedData> {
  return loadFeed(createSupabasePublicClient())
}

async function loadFeed(supabase: SupabaseClient): Promise<ServerFeedData> {
  try {
    const { data: rows, error } = await supabase
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
      .range(0, HOME_FEED_PAGE_SIZE - 1)
      .order("created_at", { ascending: false })

    if (error) throw error

    const items: Item[] = (rows ?? []).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        ...row,
        profiles: undefined,
        id: row.id,
        item_id: row.id,
        item_type: row.item_type as "post" | "recipe",
        display_name: profile?.display_name || row.display_name || null,
        username: profile?.username || row.username || null,
        avatar_url: profile?.avatar_url || row.avatar_url || null,
        user_public_id: profile?.public_id || row.user_public_id || null,
        user_email: null,
        is_liked: false,
        is_following: false,
      } as Item
    })

    return { items, currentUser: null }
  } catch (error) {
    console.error("❌ Server: Failed to fetch initial feed data:", error)
    return { items: [], currentUser: null }
  }
}
