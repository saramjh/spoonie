/**
 * 좋아요·저장·팔로우 저장소. unified-cache-manager.ts, FollowListModal.tsx, LikersModal.tsx에서
 * 쿼리·오류 처리를 바꾸지 않고 옮겨 왔다.
 */

import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import type { Profile } from "@/types/item"
import type { FollowDirection, FollowPerson, LikerProfile, LikeServerState, WriteResult } from "../contracts"

// 좋아요 / 취소 (이미 그 상태여도 오류가 나지 않게 upsert·delete)
export async function writeLike(itemId: string, userId: string, liked: boolean): Promise<WriteResult> {
	const supabase = createSupabaseBrowserClient()
	const { error } = liked
		? await supabase.from("likes").upsert({ item_id: itemId, user_id: userId }, { onConflict: "user_id,item_id" })
		: await supabase.from("likes").delete().eq("item_id", itemId).eq("user_id", userId)
	return { error }
}

// 저장 / 취소
export async function writeBookmark(itemId: string, userId: string, bookmarked: boolean): Promise<WriteResult> {
	const supabase = createSupabaseBrowserClient()
	const { error } = bookmarked
		? await supabase.from("bookmarks").upsert({ item_id: itemId, user_id: userId }, { onConflict: "user_id,item_id" })
		: await supabase.from("bookmarks").delete().eq("item_id", itemId).eq("user_id", userId)
	return { error }
}

// 팔로우 / 취소
export async function writeFollow(currentUserId: string, targetUserId: string, isFollow: boolean): Promise<WriteResult> {
	const supabase = createSupabaseBrowserClient()
	const { error } = isFollow
		? await supabase.from("follows").upsert({ follower_id: currentUserId, following_id: targetUserId }, { onConflict: "follower_id,following_id" })
		: await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", targetUserId)
	return { error }
}

// 서버의 좋아요 수와 내가 눌렀는지. 하나라도 실패하면 null
export async function fetchLikeServerState(itemId: string, userId: string): Promise<LikeServerState | null> {
	const supabase = createSupabaseBrowserClient()
	const [countResult, mineResult] = await Promise.all([
		supabase.from("likes").select("item_id", { count: "exact", head: true }).eq("item_id", itemId),
		supabase.from("likes").select("user_id").eq("item_id", itemId).eq("user_id", userId).maybeSingle(),
	])
	if (countResult.error || mineResult.error) return null
	return { likes_count: countResult.count ?? 0, is_liked: !!mineResult.data }
}

type ProfileRow = { id: string; username: string; avatar_url: string | null; public_id: string | null }

// 팔로워·팔로잉 목록과 보는 사람의 팔로우 상태. 목록 조회가 실패하면 던진다 (SWR이 받는다)
export async function fetchFollowList(direction: FollowDirection, userId: string, viewerId: string | null): Promise<FollowPerson[]> {
	const supabase = createSupabaseBrowserClient()
	// 팔로워: 이 사람을 팔로우하는 쪽(follower), 팔로잉: 이 사람이 팔로우하는 쪽(following)
	const query =
		direction === "followers"
			? supabase.from("follows").select("created_at, person:profiles!follows_follower_id_fkey (id, username, avatar_url, public_id)").eq("following_id", userId)
			: supabase.from("follows").select("created_at, person:profiles!follows_following_id_fkey (id, username, avatar_url, public_id)").eq("follower_id", userId)
	const { data, error } = await query.order("created_at", { ascending: false })
	if (error) throw error

	const people = (data || [])
		.map((row) => ({ person: (Array.isArray(row.person) ? row.person[0] : row.person) as ProfileRow | null, created_at: row.created_at as string }))
		.filter((row): row is { person: ProfileRow; created_at: string } => !!row.person)

	// 보는 사람의 팔로우 상태는 한 번에 확인한다
	let viewerFollows = new Set<string>()
	if (viewerId && people.length > 0) {
		if (direction === "following" && viewerId === userId) {
			viewerFollows = new Set(people.map((p) => p.person.id))
		} else {
			const { data: mine } = await supabase
				.from("follows")
				.select("following_id")
				.eq("follower_id", viewerId)
				.in("following_id", people.map((p) => p.person.id))
			viewerFollows = new Set((mine || []).map((f) => f.following_id as string))
		}
	}

	return people.map(({ person, created_at }) => ({
		id: person.id,
		username: person.username,
		avatar_url: person.avatar_url,
		public_id: person.public_id,
		followed_at: created_at,
		viewer_follows: viewerFollows.has(person.id),
	}))
}

// 좋아요한 사람 최근 50명. 실패하면 던진다
export async function fetchLikers(itemId: string): Promise<LikerProfile[]> {
	const { data, error } = await createSupabaseBrowserClient()
		.from("likes")
		.select("user_id, created_at, profiles!user_id (id, username, display_name, avatar_url, public_id)")
		.eq("item_id", itemId)
		.order("created_at", { ascending: false })
		.limit(50)
	if (error) throw error
	return (data || []).map((like: { user_id: string; created_at: string; profiles: Profile | Profile[] }) => {
		const profile = Array.isArray(like.profiles) ? like.profiles[0] : like.profiles
		return {
			id: profile?.id || like.user_id,
			username: profile?.username || "익명",
			display_name: profile?.username ?? null,
			avatar_url: profile?.avatar_url ?? null,
			public_id: profile?.public_id ?? null,
			liked_at: like.created_at,
		}
	})
}
