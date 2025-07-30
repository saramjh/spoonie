"use client"

import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { Ingredient, Instruction, Comment, ItemDetail, RecipeStep } from "@/types/item"

// 통합 아이템 상세 fetcher - 레시피/레시피드 공통 사용
const itemDetailFetcher = async (key: string): Promise<ItemDetail> => {
	const supabase = createSupabaseBrowserClient()
	const itemId = key.replace('item_details_', '')

	console.log(`🔍 ItemDetail: Fetching data for item ${itemId}`)

	if (!itemId) {
		console.error("❌ ItemDetail: Invalid item ID")
		throw new Error("Invalid item ID")
	}

	try {
		// 현재 사용자 정보 가져오기
		const { data: { user } } = await supabase.auth.getUser()
		const currentUserId = user?.id

		// 1. 메인 아이템 정보 조회 (작성자 프로필 포함)
		console.log(`📡 ItemDetail: Fetching main item data for ${itemId}`)
		const { data: itemData, error: itemError } = await supabase
			.from("items")
			.select(`
				*,
				cited_recipe_ids,
				author:profiles!user_id(public_id, display_name, avatar_url, username)
			`)
			.eq("id", itemId)
			.single()

		if (itemError) {
			console.error(`❌ ItemDetail: Error fetching item ${itemId}:`, itemError)
			if (itemError.code === 'PGRST116') {
				throw new Error("Item not found or access denied")
			}
			throw itemError
		}

		if (!itemData) {
			console.error(`❌ ItemDetail: No data returned for item ${itemId}`)
			throw new Error("Item not found")
		}

		console.log(`✅ ItemDetail: Successfully fetched ${itemData.item_type} item:`, itemData.title)

		// 2. 좋아요 상태 조회 (팔로우 상태는 글로벌 상태에서 관리)
		const [likesCountResult, userLikeResult] = await Promise.all([
			// 전체 좋아요 개수
			supabase
				.from("likes")
				.select("user_id", { count: "exact" })
				.eq("item_id", itemId),
			// 현재 사용자의 좋아요 상태 (로그인한 경우만)
			currentUserId ? supabase
				.from("likes")
				.select("user_id")
				.eq("item_id", itemId)
				.eq("user_id", currentUserId)
				.maybeSingle() : Promise.resolve({ data: null, error: null })
		])

		const likesCount = likesCountResult.count || 0
		const isLiked = !!userLikeResult.data && !userLikeResult.error

		console.log(`💖 ItemDetail: Like status for ${itemId} - count: ${likesCount}, isLiked: ${isLiked} (user: ${currentUserId || 'anonymous'})`)
		// 🚀 업계 표준: 팔로우 상태는 글로벌 상태에서 관리, DB 재조회 불필요

		// 3. 레시피인 경우 재료/조리법 조회 (병렬 처리)
		let ingredients: Ingredient[] = []
		let instructions: Instruction[] = []
		
		if (itemData.item_type === "recipe") {
			console.log("🍳 ItemDetail: Fetching recipe details for ID:", itemId)
			
			const [ingredientsResult, instructionsResult] = await Promise.all([
				supabase.from("ingredients").select("*").eq("item_id", itemId),
				supabase.from("instructions").select("*").eq("item_id", itemId).order("step_number")
			])

			ingredients = ingredientsResult.data || []
			instructions = instructionsResult.data || []
			
			console.log(`📊 ItemDetail: Loaded ${ingredients.length} ingredients, ${instructions.length} instructions`)
		}

		// 4. 댓글 정보 조회 (삭제된 댓글도 포함)
		const { data: commentsData, error: commentsError } = await supabase
			.from("comments")
			.select(`
				id, content, created_at, user_id, parent_comment_id, is_deleted,
				user:profiles!user_id(public_id, display_name, avatar_url, username)
			`)
			.eq("item_id", itemId)
			.order("created_at", { ascending: true })

		if (commentsError) {
			console.error("❌ ItemDetail: Error fetching comments:", commentsError)
		}

		// 댓글 데이터 변환
		const transformedComments: Comment[] = (commentsData || []).map(comment => {
			const userProfile = Array.isArray(comment.user) ? comment.user[0] : comment.user
			return {
				id: comment.id,
				content: comment.content,
				created_at: comment.created_at,
				user_id: comment.user_id,
				parent_comment_id: comment.parent_comment_id,
				is_deleted: comment.is_deleted,
				user: {
					id: comment.user_id,
					public_id: userProfile?.public_id || '',
					username: userProfile?.username || '',
					display_name: userProfile?.display_name || '',
					avatar_url: userProfile?.avatar_url || null,
				},
			}
		})

		// 5. 레시피인 경우 steps 필드 생성 (RecipeContentView 호환성)
		const steps: RecipeStep[] = itemData.item_type === "recipe" 
			? instructions.map(inst => ({
				step_number: inst.step_number,
				description: inst.description,
				image_url: inst.image_url,
				order: inst.step_number,
			}))
			: []

		// 6. 통합 ItemDetail 객체 생성
		const itemDetail: ItemDetail = {
			...itemData,
			item_id: itemData.id, // 호환성을 위한 별칭
			ingredients,
			instructions,
			steps, // RecipeContentView 호환성
			comments_data: transformedComments,
			likes_count: likesCount, // 실제 DB에서 가져온 좋아요 개수
			comments_count: transformedComments.filter(c => !c.is_deleted).length,
			is_liked: isLiked, // 실제 DB에서 가져온 좋아요 상태
			// 기타 호환성 필드들
			author: Array.isArray(itemData.author) ? itemData.author[0] : itemData.author,
			display_name: itemData.author?.display_name || itemData.author?.username,
			username: itemData.author?.username,
			avatar_url: itemData.author?.avatar_url,
			user_public_id: itemData.author?.public_id,
			is_following: false, // 🚀 업계 표준: 글로벌 상태에서 관리, 초기값만 제공
			comments: transformedComments, // 별칭
		}

		console.log(`✅ ItemDetail: Successfully loaded ${itemData.item_type} with ${transformedComments.length} comments, ${likesCount} likes, liked: ${isLiked}`)
		return itemDetail
	} catch (error) {
		console.error("❌ ItemDetail: Error in itemDetailFetcher:", error)
		throw error
	}
}

// 통합 아이템 상세 훅
export function useItemDetail(itemId: string | null) {
	const swrKey = itemId ? `item_details_${itemId}` : null

	const { data, error, mutate, isLoading } = useSWR(
		swrKey,
		itemDetailFetcher,
		{
			revalidateOnFocus: false,
			dedupingInterval: 30000, // 30초 중복 방지
			errorRetryCount: 3,
			errorRetryInterval: 5000, // 5초 간격으로 재시도
		}
	)

	// 디버깅 로그 추가
	if (error) {
		console.error(`❌ useItemDetail: SWR error for item ${itemId}:`, error)
	}

	return {
		item: data,
		isLoading,
		error,
		mutate, // 캐시 수동 업데이트용
		refresh: () => mutate(), // 새로고침용
	}
}