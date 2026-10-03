import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"

/**
 * 동시성 안전한 댓글 카운트 조회
 * 실시간 계산 대신 집계 쿼리 사용
 */
export async function getCommentCountConcurrencySafe(itemId: string): Promise<number> {
	const supabase = createSupabaseBrowserClient()

	try {
		const { count, error } = await supabase
			.from("comments")
			.select("*", { count: "exact", head: true })
			.eq("item_id", itemId)
			.eq("is_deleted", false)

		if (error) throw error
		return count || 0
	} catch (error) {
		console.error("❌ Comment count failed:", error)
		return 0
	}
} 