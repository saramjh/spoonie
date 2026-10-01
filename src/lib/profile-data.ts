import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { getCommentCountConcurrencySafe } from "@/utils/concurrency-helpers"

/** 누구나 읽을 수 있는 프로필 컬럼. email, role은 포함하지 않는다. */
export const PUBLIC_PROFILE_COLUMNS =
	"id, username, display_name, avatar_url, bio, profile_message, created_at, updated_at, public_id, is_profile_public, show_follower_count, show_join_date, username_changed_count"

/**
 * 프로필 화면 데이터 조회. 서버 컴포넌트(공개 데이터 초기 렌더링)와
 * ProfilePageClient(로그인 사용자 기준 갱신)가 함께 사용한다. supabase를 넘기지 않으면 브라우저 클라이언트를 쓴다.
 */

export interface UserProfile {
	id: string
	username: string
	display_name: string | null
	avatar_url: string | null
	profile_message: string | null // bio → profile_message로 변경
	created_at?: string
	public_id?: string | null
}

export const fetchProfile = async (identifier: string, supabase: SupabaseClient = createSupabaseBrowserClient()) => {
	if (!identifier) {
		throw new Error("Profile identifier is required.")
	}
	// Check if identifier is a UUID
	const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)

	const column = isUUID ? "id" : "public_id"

	// 공개 컬럼만 조회한다 (email 등 개인정보 컬럼은 조회 권한이 없다)
	const { data, error } = await supabase.from("profiles").select(PUBLIC_PROFILE_COLUMNS).eq(column, identifier).single()

	if (error) {
		// If it was a UUID and it failed, maybe it's a public_id that looks like a UUID? Unlikely.
		// For now, just throw the error.
		throw new Error(error.message)
	}
	if (!data) {
		throw new Error("Profile not found")
	}
	return data as UserProfile
}

export const fetchUserItems = async (userId: string, currentUserId?: string, supabase: SupabaseClient = createSupabaseBrowserClient()) => {

	// 🚀 업계표준 Privacy Logic: 본인/타인 구분하여 다른 데이터 소스 사용
	let query
	
	if (currentUserId === userId) {
		// 🔒 본인 프로필: items 테이블 직접 사용하여 비공개 게시물도 포함
		// 🚀 홈 피드와 동일한 정확한 댓글 수 계산 방식 사용
		query = supabase
			.from("items")
			.select(`
				*,
				profiles!user_id (
					username,
					display_name,
					avatar_url,
					public_id
				),
				likes_count:likes(count)
			`)
			.eq("user_id", userId)
			.in("item_type", ["recipe", "post"])
			.order("created_at", { ascending: false })
	} else {
		// 🌍 타인 프로필: optimized_feed_view 사용 (공개 게시물만)
		query = supabase
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
			.eq("user_id", userId)
			.in("item_type", ["recipe", "post"])
			.eq("is_public", true) // 타인에게는 공개 게시물만
			.order("created_at", { ascending: false })
	}

	const { data: items, error } = await query
	if (error) throw new Error(error.message)
	if (!items || items.length === 0) return []

	// 🚀 정확한 댓글 수 계산 (본인 프로필의 경우에만)
	const itemsWithAccurateComments = currentUserId === userId 
		? await Promise.all(items.map(async (item) => {
			const accurateCommentsCount = await getCommentCountConcurrencySafe(item.id)
			return { ...item, accurate_comments_count: accurateCommentsCount }
		}))
		: items

	// 🔄 홈화면과 동일한 좋아요/팔로우 상태 확인
	const itemIds = itemsWithAccurateComments.map((item) => item.id)
	const userLikesMap = new Map<string, boolean>()
	const userFollowsMap = new Map<string, boolean>()

	if (currentUserId && currentUserId !== "guest") {
		// 좋아요 상태 확인
		const { data: userLikes } = await supabase
			.from("likes")
			.select("item_id")
			.eq("user_id", currentUserId)
			.in("item_id", itemIds)

		userLikes?.forEach((like) => {
			userLikesMap.set(like.item_id, true)
		})

		// 팔로우 상태 확인 (프로필 주인과 현재 사용자가 다른 경우에만)
		if (currentUserId !== userId) {
			const { data: followStatus } = await supabase
				.from("follows")
				.select("following_id")
				.eq("follower_id", currentUserId)
				.eq("following_id", userId)
				.single()

			if (followStatus) {
				userFollowsMap.set(userId, true)
			}
		}
	}

	// 🎯 홈화면과 동일한 Item 형태로 변환
	return itemsWithAccurateComments.map((item) => {
		const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
		const userLikeStatus = userLikesMap.get(item.id)
		const isLikedValue = currentUserId && currentUserId !== "guest" 
			? (userLikeStatus !== undefined ? userLikeStatus : false)
			: false

		return {
			id: item.id,
			item_id: item.id,
			user_id: item.user_id,
			item_type: item.item_type as "post" | "recipe",
			created_at: item.created_at,
			is_public: item.is_public,
			display_name: profileData?.display_name || item.display_name || null,
			username: profileData?.username || item.username || null,
			avatar_url: profileData?.avatar_url || item.avatar_url || null,
			user_public_id: profileData?.public_id || item.user_public_id || null,
			user_email: null,
			title: item.title,
			content: item.content,
			description: item.description,
			image_urls: item.image_urls,
			thumbnail_index: item.thumbnail_index ?? 0, // 🖼️ 썸네일 인덱스 추가
			tags: item.tags,
			color_label: item.color_label,
			servings: item.servings,
			cooking_time_minutes: item.cooking_time_minutes,
			recipe_id: item.recipe_id,
			cited_recipe_ids: item.cited_recipe_ids,
					// 🚀 홈 피드와 동일한 정확한 좋아요/댓글 수 처리
		likes_count: currentUserId === userId 
			? (item.likes_count?.[0]?.count ?? 0)   // 본인 프로필: items 테이블 집계 결과
			: (item.likes_count || 0),              // 타인 프로필: optimized_feed_view 결과
		comments_count: currentUserId === userId 
			? ('accurate_comments_count' in item ? (item as { accurate_comments_count: number }).accurate_comments_count : 0)  // 본인 프로필: 정확한 댓글 수 (삭제된 댓글 제외)
			: (item.comments_count || 0),                   // 타인 프로필: optimized_feed_view 결과 (이미 삭제된 댓글 제외)
			view_count: 0,
			is_liked: isLikedValue,
			is_following: userFollowsMap.get(userId) || false,
		}
	})
}

export const fetchFollowCounts = async (userId: string, supabase: SupabaseClient = createSupabaseBrowserClient()) => {
	// 팔로워 수와 팔로잉 수를 병렬로 조회
	const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
		supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
		supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
	])
	return { followers: followersCount || 0, following: followingCount || 0 }
}

// 팔로우 상태 확인
export const fetchFollowStatus = async (currentUserId: string, targetUserId: string) => {
	if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
		return false
	}
	
	const supabase = createSupabaseBrowserClient()
	const { data, error } = await supabase
		.from("follows")
		.select("id")
		.eq("follower_id", currentUserId)
		.eq("following_id", targetUserId)
		.single()
	
	if (error && error.code !== "PGRST116") { // PGRST116 = no rows found
		console.error("Error checking follow status:", error)
		return false
	}
	
	return !!data
}

// 참고레시피로 인용된 횟수 계산
export const fetchCitationCount = async (userId: string) => {
	const supabase = createSupabaseBrowserClient()
	
	// 사용자의 레시피 ID와 인용 목록은 서로 의존하지 않으므로 병렬로 조회
	const [{ data: userRecipes, error: recipesError }, { data: citingItems, error: citingError }] = await Promise.all([
		supabase.from("items").select("id").eq("user_id", userId).eq("item_type", "recipe"),
		supabase.from("items").select("cited_recipe_ids").not("cited_recipe_ids", "is", null),
	])
	
	if (recipesError) {
		console.error("Error fetching user recipes:", recipesError)
		return 0
	}
	
	if (!userRecipes || userRecipes.length === 0) {
		return 0
	}
	
	const userRecipeIds = userRecipes.map(recipe => recipe.id)
	
	if (citingError) {
		console.error("Error fetching citing items:", citingError)
		return 0
	}
	
	// 3. 클라이언트에서 카운트 계산
	let totalCitations = 0
	
	citingItems?.forEach(item => {
		if (item.cited_recipe_ids && Array.isArray(item.cited_recipe_ids)) {
			// 이 아이템의 cited_recipe_ids에 사용자의 레시피 ID가 포함된 개수 계산
			const matchingCount = item.cited_recipe_ids.filter(citedId => 
				userRecipeIds.includes(citedId)
			).length
			totalCitations += matchingCount
		}
	})
	
	return totalCitations
}
