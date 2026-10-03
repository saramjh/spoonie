import { createSupabaseBrowserClient } from "@/lib/supabase-client"

/**
 * 검색 기능 최적화 유틸리티
 * 서버 부담을 대폭 줄이는 효율적인 검색 구현
 */

interface SearchResult {
	id: string
	title: string
	content?: string
	item_type: 'recipe' | 'post'
	created_at: string
	display_name?: string
	username?: string
	avatar_url?: string
	image_urls?: string[]  // 추가: 썸네일을 위한 이미지 URLs
	likes_count?: number   // 추가: 좋아요 수
	comments_count?: number // 추가: 댓글 수
	user_id?: string       // 추가: 사용자 ID
	is_following?: boolean // 추가: 팔로우 상태
	is_liked?: boolean     // SSA 원칙: 좋아요 상태
}

interface CachedSearchResults {
	popularKeywords: Array<{ keyword: string; count: number }>
	lastUpdated: number
	ttl: number // Time To Live (ms)
}

// 브라우저 메모리 캐시 (탭이 열려 있는 동안)
const searchCache = new Map<string, CachedSearchResults>()
const CACHE_TTL = 5 * 60 * 1000 // 5분 캐시

/**
 * 인기 키워드 (5분 동안 다시 조회하지 않는다)
 */
export async function getPopularKeywordsCached(): Promise<Array<{ keyword: string; count: number }>> {
	const cacheKey = 'popular_keywords'
	const cached = searchCache.get(cacheKey)
	
	// 캐시 히트 체크
	if (cached && Date.now() - cached.lastUpdated < cached.ttl) {

		return cached.popularKeywords
	}

	
	const supabase = createSupabaseBrowserClient()

	try {
		// 서버 사이드 집계로 최적화 (PostgreSQL 네이티브 함수 사용)
		const { data, error } = await supabase.rpc('get_popular_tags', { 
			limit_count: 10 
		})

		if (error) {
			console.error('❌ Failed to fetch popular keywords:', error)
			return cached?.popularKeywords || []
		}

		const result = data || []
		
		// 캐시 업데이트
		searchCache.set(cacheKey, {
			popularKeywords: result,
			lastUpdated: Date.now(),
			ttl: CACHE_TTL
		})

		return result
	} catch (error) {
		console.error('❌ Popular keywords fetch failed:', error)
		return cached?.popularKeywords || []
	}
}

/**
 * 디바운싱된 검색 (불필요한 요청 방지)
 */
class DebouncedSearch {
	private timeout: NodeJS.Timeout | null = null
	private searchCache = new Map<string, { results: SearchResult[], timestamp: number }>()
	private readonly DEBOUNCE_MS = 300
	private readonly SEARCH_CACHE_TTL = 2 * 60 * 1000 // 2분

	async search(query: string): Promise<SearchResult[]> {
		// 캐시 체크
		const cached = this.searchCache.get(query)
		if (cached && Date.now() - cached.timestamp < this.SEARCH_CACHE_TTL) {
		
			return cached.results
		}

		return new Promise((resolve, reject) => {
			// 이전 요청 취소
			if (this.timeout) {
				clearTimeout(this.timeout)
			}

			this.timeout = setTimeout(async () => {
				try {
					
					const results = await this.performSearch(query)
					
					// 결과 캐싱
					this.searchCache.set(query, {
						results,
						timestamp: Date.now()
					})

					resolve(results)
				} catch (error) {
					reject(error)
				}
			}, this.DEBOUNCE_MS)
		})
	}

	private async performSearch(query: string): Promise<SearchResult[]> {
		const supabase = createSupabaseBrowserClient()

		// 현재 사용자 정보 가져오기
		const { data: { user } } = await supabase.auth.getUser()
		const currentUserId = user?.id || null

		// 전문검색 RPC 함수 사용 (GIN 인덱스 활용, 팔로우 상태 포함)
		const { data, error } = await supabase
			.rpc('search_items_optimized', { 
				search_term: query,
				max_results: 20,
				current_user_id: currentUserId
			})

		if (error) {
			console.error('❌ Search failed:', error)
			return []
		}

		return data || []
	}

	// 캐시 정리 (메모리 누수 방지)
	clearCache(): void {
		this.searchCache.clear()
	}
}

/**
 * 싱글톤 검색 인스턴스
 */
export const optimizedSearch = new DebouncedSearch()

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
		console.error('❌ User search failed:', error)
		return []
	}

	
	return data || []
} 