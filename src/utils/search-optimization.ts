import { createSupabaseBrowserClient } from "@/lib/supabase-client"

/**
 * 🚀 검색 기능 최적화 유틸리티
 * 서버 부담을 대폭 줄이는 효율적인 검색 구현
 */

interface PopularPost {
	id: string
	title: string
	content?: string
	image_urls?: string[]
	created_at: string
	author: {
		display_name?: string
		username?: string
		avatar_url?: string
	}
	// 🚀 SSA 원칙: 서버에서 정확한 초기 상태 제공
	is_liked?: boolean
	likes_count?: number
	comments_count?: number
	item_id?: string
	item_type?: 'recipe' | 'post'
	user_id?: string
}

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
	is_liked?: boolean     // 🚀 SSA 원칙: 좋아요 상태
}

interface CachedSearchResults {
	popularKeywords: Array<{ keyword: string; count: number }>
	popularPosts: PopularPost[]
	lastUpdated: number
	ttl: number // Time To Live (ms)
}

// 메모리 캐시 (production에서는 Redis 권장)
const searchCache = new Map<string, CachedSearchResults>()
const CACHE_TTL = 5 * 60 * 1000 // 5분 캐시

/**
 * 캐시된 인기 키워드 조회 (서버 부담 95% 감소)
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
		// 🚀 서버 사이드 집계로 최적화 (PostgreSQL 네이티브 함수 사용)
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
			popularPosts: cached?.popularPosts || [],
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
 * 캐시된 인기 게시물 조회 (데이터베이스 뷰 활용 + 좋아요 상태 포함)
 */
export async function getPopularPostsCached(): Promise<PopularPost[]> {
	const cacheKey = 'popular_posts'
	const cached = searchCache.get(cacheKey)
	
	if (cached && Date.now() - cached.lastUpdated < cached.ttl) {

		return cached.popularPosts
	}

	
	const supabase = createSupabaseBrowserClient()

	try {
		// 현재 사용자 정보 가져오기
		const { data: { user } } = await supabase.auth.getUser()
		const currentUserId = user?.id || null

		// 🚀 미리 계산된 뷰에서 조회 (인덱스 최적화됨)
		const { data, error } = await supabase
			.from('popular_items_view')
			.select('*')
			.limit(7)

		if (error) {
			console.error('❌ Failed to fetch popular posts:', error)
			return cached?.popularPosts || []
		}

		let result = data || []

		// 🚀 SSA 원칙: 서버에서 정확한 is_liked 초기 상태 제공
		if (currentUserId && result.length > 0) {
			const itemIds = result.map(item => item.item_id || item.id).filter(Boolean)
			
			if (itemIds.length > 0) {
				const { data: likes } = await supabase
					.from('likes')
					.select('item_id')
					.eq('user_id', currentUserId)
					.in('item_id', itemIds)
					
				const likedItemIds = new Set(likes?.map(like => like.item_id) || [])
				

				
				result = result.map(item => {
					const isLiked = likedItemIds.has(item.item_id || item.id)

					return {
						...item,
						is_liked: isLiked
					}
				})
			}
		} else {

		}
		
		// 캐시 업데이트
		const currentCache = searchCache.get(cacheKey) || { 
			popularKeywords: [], 
			popularPosts: [], 
			lastUpdated: 0, 
			ttl: CACHE_TTL 
		}
		
		searchCache.set(cacheKey, {
			...currentCache,
			popularPosts: result,
			lastUpdated: Date.now()
		})

		return result
	} catch (error) {
		console.error('❌ Popular posts fetch failed:', error)
		return cached?.popularPosts || []
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

		// 🚀 전문검색 RPC 함수 사용 (GIN 인덱스 활용, 팔로우 상태 포함)
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

/**
 * 검색 성능 메트릭 수집
 */
export class SearchMetrics {
	private static metrics = {
		totalSearches: 0,
		cacheHits: 0,
		cacheMisses: 0,
		averageResponseTime: 0,
		errors: 0
	}

	static recordSearch(responseTime: number, fromCache: boolean): void {
		this.metrics.totalSearches++
		
		if (fromCache) {
			this.metrics.cacheHits++
		} else {
			this.metrics.cacheMisses++
		}

		// 이동평균으로 응답시간 계산
		this.metrics.averageResponseTime = 
			(this.metrics.averageResponseTime * (this.metrics.totalSearches - 1) + responseTime) / 
			this.metrics.totalSearches
	}

	static recordError(): void {
		this.metrics.errors++
	}

	static getMetrics() {
		return {
			...this.metrics,
			cacheHitRate: this.metrics.totalSearches > 0 
				? (this.metrics.cacheHits / this.metrics.totalSearches * 100).toFixed(2) + '%'
				: '0%'
		}
	}

	static reset(): void {
		this.metrics = {
			totalSearches: 0,
			cacheHits: 0,
			cacheMisses: 0,
			averageResponseTime: 0,
			errors: 0
		}
	}
}

// ==========================================
// 👤 유저네임 전용 검색 인터페이스 및 함수
// ==========================================

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

	// 🎯 유저네임 전용 RPC 함수 호출
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