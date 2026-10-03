/**
 * 레시피북 목록 저장소 (나의 레시피 / 모두의 레시피, 검색·분류·색 라벨·정렬, 페이지 단위).
 * app/recipes/page.tsx의 SWR fetcher를 내용 그대로 옮겼다. 키 모양: recipes||탭||페이지||정렬||순서||검색어||분류||색||사용자
 */

import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import type { Item, Profile } from "@/types/item"

export const RECIPE_BOOK_PAGE_SIZE = 12
const PAGE_SIZE = RECIPE_BOOK_PAGE_SIZE

export const fetchRecipeBookPage = async (key: string): Promise<Item[]> => {
	try {
		const supabase = createSupabaseBrowserClient()
		const [, tab, pageIndex, sortBy, sortOrder, searchTerm, filterCategory, filterColorLabel, userId] = key.split("||")

		const from = parseInt(pageIndex) * PAGE_SIZE
		const to = from + PAGE_SIZE - 1

		// SSA 원칙: 모든 곳에서 정확한 댓글 수 계산
		let query
		if (tab === "my_recipes") {
			// 나의 레시피: 정확한 댓글 수 계산 RPC 함수 사용 (optimized_feed_view와 동일한 로직)
			query = supabase.rpc('get_user_recipes_with_accurate_stats', {
				target_user_id: userId
			})
		} else {
			// 모두의 레시피: 홈 피드와 완전히 동일한 방식
			query = supabase.from("optimized_feed_view").select(`
				*,
				profiles!user_id(display_name, username, avatar_url, public_id)
			`).eq("item_type", "recipe")
		}

	if (tab === "my_recipes") {
		if (!userId) return []
		// RPC 함수는 이미 사용자 필터링 포함

		if (searchTerm) {
			// 재료명과 레시피명 통합 검색
			try {
				// 1. ingredients 테이블에서 재료명 검색
				const { data: ingredientMatches } = await supabase
					.from("ingredients")
					.select("item_id")
					.ilike("name", `%${searchTerm}%`)
				
				const recipeIdsFromIngredients = ingredientMatches?.map(ing => ing.item_id) || []
				
				// 2. 레시피명 OR 재료명이 포함된 레시피 검색
				if (recipeIdsFromIngredients.length > 0) {
					// 레시피명 또는 재료명이 매치되는 경우
					query = query.or(`title.ilike.%${searchTerm}%,id.in.(${recipeIdsFromIngredients.join(",")})`)
				} else {
					// 재료 매치가 없으면 레시피명만 검색
					query = query.ilike("title", `%${searchTerm}%`)
				}
				
				
				
			} catch (error) {
				console.error("Search error, falling back to title search:", error)
				// 에러 시 기본 제목 검색으로 폴백
				query = query.ilike("title", `%${searchTerm}%`)
			}
		}

		if (filterCategory) {
			query = query.contains("tags", [filterCategory])
		}
		if (filterColorLabel) {
			query = query.eq("color_label", filterColorLabel)
		}
	} else {
		// all_recipes
		if (!userId) return []

		// all_recipes에서는 공개 레시피만 표시
		query = query.eq("is_public", true)

		// 팔로우한 사용자들의 ID 조회
		const { data: followingData } = await supabase.from("follows").select("following_id").eq("follower_id", userId)
		const followingIds = followingData?.map((f) => f.following_id) || []
		if (followingIds.length === 0) return []
		
		query = query.in("user_id", followingIds)
		
		if (searchTerm) {
			// 종합 검색: 레시피명, 사용자명, 재료명, 태그 검색
			try {
				// 1. 사용자명으로 검색
				const { data: userMatches } = await supabase
					.from("profiles")
					.select("id")
					        .ilike('username', `%${searchTerm}%`)
					.in("id", followingIds)
				
				// 2. 재료명으로 검색
				const { data: ingredientMatches } = await supabase
					.from("ingredients")
					.select("item_id")
					.ilike("name", `%${searchTerm}%`)
				
				const matchingUserIds = userMatches?.map(u => u.id) || []
				const recipeIdsFromIngredients = ingredientMatches?.map(ing => ing.item_id) || []
				
				// 3. 복합 검색: 제목, 사용자, 재료, 태그
				const conditions = [`title.ilike.%${searchTerm}%`]
				if (matchingUserIds.length > 0) {
					conditions.push(`user_id.in.(${matchingUserIds.join(",")})`)
				}
				if (recipeIdsFromIngredients.length > 0) {
					conditions.push(`id.in.(${recipeIdsFromIngredients.join(",")})`)
				}
				conditions.push(`tags.cs.{${searchTerm}}`)
				
				query = query.or(conditions.join(","))
				
				
				
			} catch (error) {
				console.error("Search error, falling back to title search:", error)
				// 에러 시 기본 제목 검색으로 폴백
				query = query.ilike("title", `%${searchTerm}%`)
			}
		}
		query = query.neq("user_id", userId)
	}

	query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to)

	const { data, error } = await query
	if (error) throw error

	if (!data || data.length === 0) {
		return []
	}

	// SSA 기반: 사용자별 좋아요/팔로우 상태 조회 (프로필 페이지와 동일한 방식)
	// SSA 원칙: 홈 피드와 동일한 사용자 상호작용 데이터 처리
	const itemIds = data.map((item: Item) => item.id)
	const userLikesMap = new Map<string, boolean>()
	const userFollowsMap = new Map<string, boolean>()

	if (userId && userId !== "guest") {
		// 좋아요 상태 확인
		const { data: userLikes } = await supabase
			.from("likes")
			.select("item_id")
			.eq("user_id", userId)
			.in("item_id", itemIds)

		userLikes?.forEach((like) => {
			userLikesMap.set(like.item_id, true)
		})

		// 팔로우 상태 확인 (작성자들에 대한)
		const authorIds = Array.from(new Set(data.map((item: Item) => item.user_id)))
		const { data: userFollows } = await supabase
			.from("follows")
			.select("following_id")
			.eq("follower_id", userId)
			.in("following_id", authorIds)

		userFollows?.forEach((follow) => {
			userFollowsMap.set(follow.following_id, true)
		})
	}

	// SSA 기반: 홈 피드와 동일한 데이터 변환 로직 적용
	return data.map((item: Item & { profiles?: Profile | Profile[] | null }) => {
		// 나의 레시피(RPC)는 이미 평면화된 데이터, 모두의 레시피는 profiles 관계 데이터
		const profileData: Partial<Profile> | null | undefined = tab === "my_recipes"
			? { display_name: item.display_name, username: item.username ?? undefined, avatar_url: item.avatar_url, public_id: item.user_public_id ?? undefined } // RPC가 이미 평면화해 준다
			: (Array.isArray(item.profiles) ? item.profiles[0] : item.profiles)
		
		const userLikeStatus = userLikesMap.get(item.id)
		const isLikedValue = userId && userId !== "guest" 
			? (userLikeStatus !== undefined ? userLikeStatus : false)
			: false
		
		return {
			id: item.id,
			item_id: item.id,
			user_id: item.user_id,
			item_type: item.item_type as "post" | "recipe",
			created_at: item.created_at,
			is_public: item.is_public,
			// 작성자 정보 처리 - 데이터 소스에 따라 다른 방식
			display_name: profileData?.display_name || item.display_name || null,
			username: profileData?.username || item.username || null,
			avatar_url: profileData?.avatar_url || item.avatar_url || null,
			user_public_id: profileData?.public_id || item.user_public_id || null,
			user_email: null,
			title: item.title,
			content: item.content,
			description: item.description,
			image_urls: item.image_urls,
			thumbnail_index: item.thumbnail_index || null,
			tags: item.tags,
			color_label: item.color_label,
			servings: item.servings,
			cooking_time_minutes: item.cooking_time_minutes,
			recipe_id: item.recipe_id,
			cited_recipe_ids: item.cited_recipe_ids,
			// SSA 원칙: 모든 곳에서 정확한 좋아요/댓글 수 사용
			likes_count: item.likes_count || 0,
			comments_count: item.comments_count || 0,  // 이제 삭제된 댓글 제외된 정확한 값
			is_liked: tab === "my_recipes" 
				? (item.is_liked || false)  // RPC 함수에서 이미 계산됨
				: isLikedValue,             // 별도 계산 필요
			is_following: userFollowsMap.get(item.user_id) || false,
			bookmarks_count: 0,
			is_bookmarked: false,
			// 호환성을 위한 author 필드
			author: profileData
		}
	}) as Item[]
	
	} catch (error) {
		console.error("❌ Fetcher error:", error)
		// 에러 발생 시 빈 배열 반환 (무한 에러 루프 방지)
		return []
	}
}
