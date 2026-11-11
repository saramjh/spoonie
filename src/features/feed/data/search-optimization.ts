import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"

export interface SearchResult {
	id: string
	title: string
	content?: string
	item_type: 'recipe' | 'post'
	created_at: string
	display_name?: string
	username?: string
	avatar_url?: string
	image_urls?: string[]
	likes_count?: number
	comments_count?: number
	user_id?: string
	is_following?: boolean
	is_liked?: boolean
	tags?: string[]
	cooking_time_minutes?: number
	servings?: number
	color_label?: string
	ingredients?: { name: string; amount: number; unit: string }[]
	instructions?: { step_number: number; description: string; image_url?: string }[]
}

/** SWR owns client-side caching; fetchers only fetch. */
export async function fetchPopularKeywords(): Promise<Array<{ keyword: string; count: number }>> {
  const { data, error } = await createSupabaseBrowserClient().rpc("get_popular_tags", { limit_count: 10 })
  if (error) throw error
  return data ?? []
}

export const SEARCH_PAGE_SIZE = 20

export async function searchItems(query: string, itemType: "recipe" | "post", offset: number): Promise<SearchResult[]> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.rpc("search_items_optimized", {
    search_term: query,
    max_results: SEARCH_PAGE_SIZE + 1,
    current_user_id: user?.id ?? null,
    result_offset: offset,
    item_type_filter: itemType,
  })
  if (error) throw error
  return data ?? []
}

export interface UserSearchResult {
	user_id: string;
	username: string;
	display_name: string | null;
	avatar_url: string | null;
	items_count: number;
	is_following: boolean;
}

/**
 * 유저네임 기반 사용자 검색 (콘텐츠 검색과 완전 분리)
 */
export async function searchUsers(query: string): Promise<UserSearchResult[]> {
	if (!query || query.trim().length === 0) {
		return []
	}

	const supabase = createSupabaseBrowserClient()

	// 현재 사용자 정보 가져오기
	const { data: { user } } = await supabase.auth.getUser()
	const currentUserId = user?.id || null

	    // [UserSearch] Searching for users: { currentUserId, trimmedQuery }

	// 유저네임 전용 RPC 함수 호출
	const { data, error } = await supabase
		.rpc('search_users', {
			search_term: query.trim(),
			max_results: 20,
			current_user_id: currentUserId
		})

	if (error) {
		console.error("User search failed:", error)
		throw error
	}

	
	return data || []
} 