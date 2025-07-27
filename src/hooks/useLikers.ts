"use client"

import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"

export interface LikerProfile {
	user_id: string
	username: string
	display_name: string | null
	avatar_url: string | null
	public_id: string
	created_at: string // 좋아요한 시간
}

interface UseLikersResult {
	likers: LikerProfile[]
	isLoading: boolean
	error: Error | null
	likersCount: number
	mutate: () => void
}

const fetcher = async (key: string): Promise<LikerProfile[]> => {
	const supabase = createSupabaseBrowserClient()
	const [, itemId] = key.split("|")

	if (!itemId) return []

	// likes 테이블과 profiles 테이블을 조인하여 좋아요한 사용자 정보 가져오기
	const { data, error } = await supabase
		.from("likes")
		.select(
			`
			user_id,
			created_at,
			profiles:user_id (
				username,
				display_name,
				avatar_url,
				public_id
			)
		`
		)
		.eq("item_id", itemId)
		.order("created_at", { ascending: false }) // 최신 좋아요 순으로 정렬

	if (error) {
		console.error("❌ Error fetching likers:", error)
		throw error
	}

	if (!data) return []

	// 데이터 변환: 프로필 정보를 플래튼하여 반환
	const formattedLikers: LikerProfile[] = data.map((like) => {
		const profile = Array.isArray(like.profiles) ? like.profiles[0] : like.profiles
		return {
			user_id: like.user_id,
			username: profile?.username || "unknown",
			display_name: profile?.display_name || null,
			avatar_url: profile?.avatar_url || null,
			public_id: profile?.public_id || "unknown",
			created_at: like.created_at,
		}
	})

	console.log(`👥 Fetched ${formattedLikers.length} likers for item ${itemId}`)
	return formattedLikers
}

export function useLikers(itemId: string | null): UseLikersResult {
	const swrKey = itemId ? `likers|${itemId}` : null

	const { data, error, mutate, isValidating } = useSWR(swrKey, fetcher, {
		revalidateOnFocus: false,
		dedupingInterval: 30000, // 30초 동안 중복 요청 방지
	})

	return {
		likers: data || [],
		isLoading: isValidating && !data,
		error,
		likersCount: data?.length || 0,
		mutate,
	}
}
 