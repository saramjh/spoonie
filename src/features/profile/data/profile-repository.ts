import type { SupabaseClient } from "@supabase/supabase-js"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"

/** 누구나 읽을 수 있는 프로필 컬럼. email, role은 포함하지 않는다. */
export const PUBLIC_PROFILE_COLUMNS =
	"id, username, display_name, avatar_url, entity_type, bio, profile_message, created_at, updated_at, public_id, is_profile_public, show_follower_count, show_join_date, username_changed_count"

/**
 * 프로필 화면 데이터 조회. 서버 컴포넌트(공개 데이터 초기 렌더링)와
 * ProfilePageClient(로그인 사용자 기준 갱신)가 함께 사용한다. supabase를 넘기지 않으면 브라우저 클라이언트를 쓴다.
 */

export interface UserProfile {
	id: string
	username: string
	display_name: string | null
	avatar_url: string | null
	entity_type?: "person" | "organization"
	profile_message: string | null // bio → profile_message로 변경
	created_at?: string
	public_id?: string | null
	show_follower_count?: boolean | null
	show_join_date?: boolean | null
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

	// 본인만 비공개 글을 볼 수 있으므로 조회 경로를 분리한다.
	let query
	
	if (currentUserId === userId) {
		// 본인은 비공개 글도 포함한다.
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
		// 타인은 공개 view만 조회한다.
		query = supabase
			.from("optimized_feed_view")
			.select("*")
			.eq("user_id", userId)
			.in("item_type", ["recipe", "post"])
			.eq("is_public", true)
			.order("created_at", { ascending: false })
	}

	const { data: items, error } = await query
	if (error) throw new Error(error.message)
	if (!items || items.length === 0) return []

	const commentCountsMap = new Map<string, number>()
	const userLikesMap = new Map<string, boolean>()
	const userFollowsMap = new Map<string, boolean>()

	if (currentUserId && currentUserId !== "guest") {
		if (currentUserId === userId) {
			const itemIds = items.map((item) => item.id)
			const [{ data: commentCounts, error: commentCountsError }, { data: userLikes, error: userLikesError }] = await Promise.all([
				supabase.rpc("get_comment_counts_for_items", { item_ids_param: itemIds }),
				supabase.from("likes").select("item_id").eq("user_id", currentUserId).in("item_id", itemIds),
			])

			if (commentCountsError) console.error("Error fetching profile comment counts:", commentCountsError)
			commentCounts?.forEach((row: { item_id: string; comments_count: number | string }) => {
				commentCountsMap.set(row.item_id, Number(row.comments_count) || 0)
			})
			if (userLikesError) console.error("Error fetching profile like states:", userLikesError)
			userLikes?.forEach((like) => {
				userLikesMap.set(like.item_id, true)
			})
		} else {
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

	// 홈화면과 동일한 Item 형태로 변환
	return items.map((item) => {
		const profileData = currentUserId === userId
			? (Array.isArray(item.profiles) ? item.profiles[0] : item.profiles)
			: {
				display_name: item.display_name,
				username: item.username,
				avatar_url: item.avatar_url,
				public_id: item.user_public_id,
			}
		const isLikedValue = !currentUserId || currentUserId === "guest"
			? false
			: currentUserId === userId
				? userLikesMap.get(item.id) === true
				: Boolean(item.is_liked)

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
			thumbnail_index: item.thumbnail_index ?? 0, // 썸네일 인덱스 추가
			tags: item.tags,
			color_label: item.color_label,
			servings: item.servings,
			cooking_time_minutes: item.cooking_time_minutes,
			recipe_id: item.recipe_id,
			cited_recipe_ids: item.cited_recipe_ids,
			creation_origin: item.creation_origin ?? null, // 작성 경로 (출처 쪽지의 "만들었어요"/"참고한")
			made_count: Number(item.made_count) || 0, // 다른 사람이 만든 기록 수
			continued_count: Number(item.continued_count) || 0,
			made_thumbs: item.made_thumbs || [],
			ingredient_count: item.ingredient_count || 0,
			key_ingredients: item.key_ingredients || [],
		likes_count: currentUserId === userId 
			? (item.likes_count?.[0]?.count ?? 0)   // 본인 프로필: items 테이블 집계 결과
			: (item.likes_count || 0),              // 타인 프로필: optimized_feed_view 결과
		comments_count: currentUserId === userId
			? (commentCountsMap.get(item.id) || 0)
			: (item.comments_count || 0),
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
export interface LineageCounts {
	recipes: number
	cooked: number
	adapted: number
	referenced: number
}

// 프로필 지표: 공개 레시피 수와, 다른 사람이 그 레시피로 만든·이어 쓴·참고한 공개 글 수 (DB 함수 한 번)
export const fetchLineageCounts = async (userId: string): Promise<LineageCounts> => {
	const supabase = createSupabaseBrowserClient()
	const { data, error } = await supabase.rpc("get_profile_lineage_counts", { profile_user_id: userId })
	const row = Array.isArray(data) ? data[0] : data
	if (error || !row) {
		if (error) console.error("Error fetching lineage counts:", error)
		return { recipes: 0, cooked: 0, adapted: 0, referenced: 0 }
	}
	return {
		recipes: Number(row.recipes_count) || 0,
		cooked: Number(row.cooked_count) || 0,
		adapted: Number(row.adapted_count) || 0,
		referenced: Number(row.referenced_count) || 0,
	}
}

// ── 프로필 수정 화면 (ProfileEditor.tsx에서 순서·오류 처리를 바꾸지 않고 옮김) ──

// 수정 화면이 쓰는 내 프로필 값. 오류는 그대로 돌려준다 (없는 프로필 PGRST116을 화면이 따로 다룬다)
export const fetchEditableProfile = async (supabase: SupabaseClient, userId: string) =>
	supabase.from("profiles").select("username, avatar_url, profile_message, username_changed_count").eq("id", userId).single()

// 프로필 사진: 320px JPEG로 줄인 파일을 {userId}.jpg에 덮어쓰고, 캐시를 피하려 시각을 붙인 주소를 돌려준다
export const uploadAvatar = async (supabase: SupabaseClient, userId: string, resizedFile: File): Promise<string> => {
	const filePath = `${userId}.jpg`
	const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, resizedFile, { upsert: true, contentType: "image/jpeg" })
	if (uploadError) throw uploadError
	const {
		data: { publicUrl },
	} = supabase.storage.from("avatars").getPublicUrl(filePath)
	return `${publicUrl}?t=${new Date().getTime()}`
}

export const updateProfileRow = async (supabase: SupabaseClient, userId: string, updateData: Record<string, string | number | null>) => {
	const { error } = await supabase.from("profiles").update(updateData).eq("id", userId)
	if (error) throw error
}

// 로그인한 사람의 프로필 요약 (화면 머리·세션 상태용). 없으면 null
export const fetchProfileSummary = async (supabase: SupabaseClient, userId: string) => {
	const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_url, public_id").eq("id", userId).maybeSingle()
	return data
}
