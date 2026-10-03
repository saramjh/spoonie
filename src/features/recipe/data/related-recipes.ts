/**
 * 레시피 사이의 관계 조회: 참고 레시피 카드, 이 레시피에서 나온 글, 작성자의 다른 레시피.
 * hooks/useCitedRecipes.ts에서 쿼리·변환을 바꾸지 않고 옮겨 왔다 (훅은 SWR만 맡는다).
 */

import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import type { Item, Profile } from "@/types/item"

// 참고 레시피 fetcher - SWR용
export const fetchCitedRecipeCards = async (citedRecipeIds: string[]): Promise<Item[]> => {
	if (!citedRecipeIds || citedRecipeIds.length === 0) {
		return []
	}

	const supabase = createSupabaseBrowserClient()


	const { data, error } = await supabase
		.from("items")
		.select(
			`
			id, 
			title, 
			item_type, 
			image_urls, 
			user_id, 
			created_at,
			profiles!items_user_id_fkey(
				display_name, 
				username, 
				public_id, 
				avatar_url
			)
		`
		)
		.in("id", citedRecipeIds)
		.eq("item_type", "recipe")

	if (error) {
		console.error("❌ useCitedRecipes: Error fetching cited recipes:", error)
		throw error
	}



	// FeedItem 형태로 매핑
	const mappedData = (data || []).map((recipe: Record<string, unknown>) => {
		const authorProfile = Array.isArray(recipe.profiles) ? recipe.profiles[0] : recipe.profiles

		// 실제 사용되는 필드만 정확하게 매핑 (id, title, created_at, author)
		const mappedRecipe: Item = {
			// UI에서 실제 사용되는 핵심 필드들
			id: String(recipe.id),
			item_id: String(recipe.id), 
			user_id: String(recipe.user_id),
			item_type: 'recipe',
			created_at: String(recipe.created_at),
			title: String(recipe.title || "제목 없음"),
			
			// 작성자 정보 (UI에서 사용)
			author: authorProfile ? {
				id: String(recipe.user_id),
				public_id: authorProfile.public_id || String(recipe.user_id),
				username: authorProfile.username || "익명",
				display_name: authorProfile.display_name,
				avatar_url: authorProfile.avatar_url,
			} as Profile : undefined,
			
			// Item 타입 호환성을 위한 필수 필드들 (안전한 기본값)
			content: null,
			description: null,
			image_urls: Array.isArray(recipe.image_urls) ? recipe.image_urls as string[] : null,
			thumbnail_index: null,
			tags: null,
			is_public: true,
			color_label: null,
			servings: null,
			cooking_time_minutes: null,
			recipe_id: null,
			cited_recipe_ids: null,
			
			// 통계/상호작용 정보 (실제 사용되지 않으므로 안전한 기본값)
			username: authorProfile?.username,
			display_name: authorProfile?.display_name,
			avatar_url: authorProfile?.avatar_url,
			user_public_id: authorProfile?.public_id,
			comments_count: 0,
			likes_count: 0,
			is_liked: false,
			is_following: false,
			bookmarks_count: 0,
			is_bookmarked: false,
		}

		// 데이터 매핑 완료

		return mappedRecipe
	})

	return mappedData
}

export interface RelatedItem {
	id: string
	title: string | null
	item_type: "recipe" | "post"
	username: string
	user_id: string
	image_url: string | null
	relation_type: "cooked" | "adapted" | "referenced"
}

// 이 레시피에서 나온 공개 글: 만들어 본 기록(레시피드)과 이어진 레시피(레시피)
export const fetchRecipeRelations = async (recipeId: string): Promise<RelatedItem[]> => {
	const supabase = createSupabaseBrowserClient()
	const { data, error } = await supabase
		.from("content_relations")
		.select(
			"relation_type, item:items!content_relations_from_item_id_fkey(id, user_id, title, item_type, image_urls, thumbnail_index, author:profiles!user_id(username))"
		)
		.eq("to_recipe_id", recipeId)
		.order("created_at", { ascending: false })
		.limit(30)
	if (error) throw error
	return (data || []).flatMap((row) => {
		const item = (Array.isArray(row.item) ? row.item[0] : row.item) as Record<string, unknown> | null
		// 공개 여부는 RLS가 판단한다 (작성자는 자기 비공개 글도 본다)
		if (!item) return []
		const author = Array.isArray(item.author) ? item.author[0] : item.author
		const images = (item.image_urls as string[] | null) || []
		return [
			{
				id: String(item.id),
				title: (item.title as string | null) ?? null,
				item_type: item.item_type === "recipe" ? "recipe" : "post",
				username: (author as { username?: string } | null)?.username || "익명",
				user_id: String(item.user_id),
				image_url: images[(item.thumbnail_index as number) || 0] || images[0] || null,
				relation_type: row.relation_type as RelatedItem["relation_type"],
			},
		]
	})
}

// 작성자의 다른 공개 레시피 최근 5개 (상세 화면의 "이 사람의 다른 레시피")
export const fetchAuthorPublicRecipes = async (authorId: string): Promise<Item[]> => {
	const supabase = createSupabaseBrowserClient()
	const { data, error } = await supabase
		.from("items")
		.select("id, title, image_urls, thumbnail_index, servings, cooking_time_minutes, created_at, item_type, user_id, is_public")
		.eq("user_id", authorId)
		.eq("item_type", "recipe")
		.eq("is_public", true)
		.order("created_at", { ascending: false })
		.limit(5)
	if (error) throw error
	return (data || []) as Item[]
}
