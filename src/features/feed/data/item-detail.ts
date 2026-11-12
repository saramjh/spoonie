import type { SupabaseClient } from "@supabase/supabase-js"
import type { Ingredient, Instruction, ItemDetail, RecipeStep } from "@/types/item"

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
			{ count: commentsCount, error: commentsError },
		] = await Promise.all([
			withViewer ? supabase.auth.getUser() : Promise.resolve({ data: { user: null } }),
			supabase
				.from("items")
				.select(`
					*,
					cited_recipe_ids,
					author:profiles!user_id(public_id, display_name, avatar_url, username, entity_type)
				`)
				.eq("id", itemId)
				.single(),
			supabase.from("likes").select("user_id", { count: "exact", head: true }).eq("item_id", itemId),
			supabase.from("ingredients").select("*").eq("item_id", itemId).order("order_index"),
			supabase.from("instructions").select("*").eq("item_id", itemId).order("step_number"),
			// CommentsSection owns the comment list. Count without sending duplicate content/profiles.
			supabase.from("comments").select("id", { count: "exact", head: true })
				.eq("item_id", itemId)
				.eq("is_deleted", false),
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

		const likesCount = likesResult.count ?? 0
		let isLiked = false
		let isBookmarked = false
		if (currentUserId) {
			// Per-viewer states come from RLS queries; query concurrently instead of
			// downloading all liker IDs (which was truncated at the API row limit).
			const [{ data: myLike, error: myLikeError }, { data: myBookmark, error: myBookmarkError }] = await Promise.all([
				supabase.from("likes").select("user_id").eq("item_id", itemId)
					.eq("user_id", currentUserId).maybeSingle(),
				supabase.from("bookmarks").select("item_id").eq("item_id", itemId)
					.eq("user_id", currentUserId).maybeSingle(),
			])
			// Personal badges are optional. A failed lookup must not turn an
			// otherwise accessible public recipe into a full-page network error.
			// RLS for the actual item is still enforced by the items query above.
			if (myLikeError) console.warn("Detail like status unavailable:", myLikeError)
			else isLiked = !!myLike
			if (myBookmarkError) console.warn("Detail bookmark status unavailable:", myBookmarkError)
			else isBookmarked = !!myBookmark
		}
		const isRecipeItem = itemData.item_type === "recipe"
		// Ingredients and instructions are essential Recipe data. A failed query is
		// not an empty list: keep existing content or show a retryable error instead.
		if (isRecipeItem && ingredientsResult.error) throw ingredientsResult.error
		if (isRecipeItem && instructionsResult.error) throw instructionsResult.error
		const ingredients: Ingredient[] = isRecipeItem ? ingredientsResult.data || [] : []
		const instructions: Instruction[] = isRecipeItem ? instructionsResult.data || [] : []

		if (commentsError) {
			console.error("❌ ItemDetail: Error fetching comments:", commentsError)
		}

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
			likes_count: likesCount, // 실제 DB에서 가져온 좋아요 개수
			comments_count: commentsCount ?? 0,
			is_liked: isLiked, // 실제 DB에서 가져온 좋아요 상태
			is_bookmarked: isBookmarked,
			// 기타 호환성 필드들
			author: Array.isArray(itemData.author) ? itemData.author[0] : itemData.author,
			display_name: itemData.author?.display_name || itemData.author?.username,
			username: itemData.author?.username,
			avatar_url: itemData.author?.avatar_url,
			user_public_id: itemData.author?.public_id,
			is_following: false, // 업계 표준: 글로벌 상태에서 관리, 초기값만 제공
		}


		return itemDetail
	} catch (error) {
		console.error("❌ ItemDetail: Error in itemDetailFetcher:", error)
		throw error
	}
}

// ── 글 지우기 (레시피북 선택 삭제, 상세 화면 삭제에서 옮김. 사진 정리·캐시는 부르는 쪽) ──

type BrowserDb = ReturnType<typeof import("@/shared/infra/supabase-client").createSupabaseBrowserClient>

// 여러 글을 한 번에 지운다 (레시피북 선택 삭제)
export async function deleteItemsByIds(supabase: BrowserDb, ids: string[]) {
	const { error } = await supabase.from("items").delete().in("id", ids)
	return { error }
}

// 내 글 하나를 지운다 (작성자 확인을 쿼리에도 건다)
export async function deleteOwnItem(supabase: BrowserDb, itemId: string, userId: string) {
	const { error } = await supabase.from("items").delete().eq("id", itemId).eq("user_id", userId)
	return { error }
}
