import type { SupabaseClient } from "@supabase/supabase-js"
import type { Ingredient, Instruction, Comment, ItemDetail, RecipeStep } from "@/types/item"

/**
 * 레시피/레시피드 상세 데이터 조회.
 * 서버 컴포넌트(초기 HTML 렌더링용)와 클라이언트 훅(useItemDetail)이 함께 사용한다.
 */

export class ItemNotFoundError extends Error {
	code = "PGRST116"
	constructor() {
		super("Item not found or access denied")
		this.name = "ItemNotFoundError"
	}
}

// withViewer=false: 로그인 사용자 기준 값(내 좋아요)을 계산하지 않는다. 미리 만드는 공개 페이지용.
export async function fetchItemDetail(supabase: SupabaseClient, itemId: string, { withViewer = true }: { withViewer?: boolean } = {}): Promise<ItemDetail> {


	if (!itemId) {
		console.error("❌ ItemDetail: Invalid item ID")
		throw new Error("Invalid item ID")
	}

	try {
		// 서로 의존하지 않는 조회를 한 번에 병렬로 보낸다 (DB 왕복을 1회로 줄임).
		// 재료/조리법은 게시물이면 빈 결과가 돌아오므로 종류와 무관하게 함께 조회한다.
		const [
			{ data: { user } },
			{ data: itemData, error: itemError },
			likesResult,
			ingredientsResult,
			instructionsResult,
			{ data: commentsData, error: commentsError },
		] = await Promise.all([
			withViewer ? supabase.auth.getUser() : Promise.resolve({ data: { user: null } }),
			supabase
				.from("items")
				.select(`
					*,
					cited_recipe_ids,
					author:profiles!user_id(public_id, display_name, avatar_url, username)
				`)
				.eq("id", itemId)
				.single(),
			supabase.from("likes").select("user_id", { count: "exact" }).eq("item_id", itemId),
			supabase.from("ingredients").select("*").eq("item_id", itemId).order("order_index"),
			supabase.from("instructions").select("*").eq("item_id", itemId).order("step_number"),
			supabase
				.from("comments")
				.select(`
				id, content, created_at, user_id, parent_comment_id, is_deleted,
				user:profiles!user_id(public_id, display_name, avatar_url, username)
			`)
				.eq("item_id", itemId)
				.order("created_at", { ascending: true }),
		])
		const currentUserId = user?.id

		if (itemError) {
			console.error(`❌ ItemDetail: Error fetching item ${itemId}:`, itemError)
			// PGRST116: 결과 없음(또는 RLS로 접근 불가), 22P02: 잘못된 UUID 형식
			if (itemError.code === 'PGRST116' || itemError.code === '22P02') {
				throw new ItemNotFoundError()
			}
			throw itemError
		}

		if (!itemData) {
			console.error(`❌ ItemDetail: No data returned for item ${itemId}`)
			throw new ItemNotFoundError()
		}

		// 좋아요 수와 내 좋아요 여부: 좋아요 목록에서 함께 계산한다.
		// 목록이 응답 한도(기본 1000행)에 잘린 경우에만 내 좋아요를 따로 확인한다.
		const likeRows = (likesResult.data || []) as { user_id: string }[]
		const likesCount = likesResult.count || 0
		let isLiked = !!currentUserId && likeRows.some(like => like.user_id === currentUserId)
		if (currentUserId && !isLiked && likesCount > likeRows.length) {
			const { data: myLike } = await supabase
				.from("likes")
				.select("user_id")
				.eq("item_id", itemId)
				.eq("user_id", currentUserId)
				.maybeSingle()
			isLiked = !!myLike
		}

		// 내가 저장한 글인지 (로그인 사용자만, 저장 목록은 본인만 읽을 수 있다)
		let isBookmarked = false
		if (currentUserId) {
			const { data: myBookmark } = await supabase
				.from("bookmarks")
				.select("item_id")
				.eq("item_id", itemId)
				.eq("user_id", currentUserId)
				.maybeSingle()
			isBookmarked = !!myBookmark
		}

		const isRecipeItem = itemData.item_type === "recipe"
		const ingredients: Ingredient[] = isRecipeItem ? ingredientsResult.data || [] : []
		const instructions: Instruction[] = isRecipeItem ? instructionsResult.data || [] : []

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
			is_bookmarked: isBookmarked,
			// 기타 호환성 필드들
			author: Array.isArray(itemData.author) ? itemData.author[0] : itemData.author,
			display_name: itemData.author?.display_name || itemData.author?.username,
			username: itemData.author?.username,
			avatar_url: itemData.author?.avatar_url,
			user_public_id: itemData.author?.public_id,
			is_following: false, // 업계 표준: 글로벌 상태에서 관리, 초기값만 제공
			comments: transformedComments, // 별칭
		}


		return itemDetail
	} catch (error) {
		console.error("❌ ItemDetail: Error in itemDetailFetcher:", error)
		throw error
	}
}
