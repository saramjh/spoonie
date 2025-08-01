import { createSupabaseBrowserClient } from "@/lib/supabase-client"

/**
 * 동시성 안전한 좋아요 토글 함수
 * UPSERT와 ON CONFLICT를 사용하여 Race Condition 방지
 */
export async function toggleLikeConcurrencySafe(
	itemId: string, 
	userId: string, 
	currentlyLiked: boolean
): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
	const supabase = createSupabaseBrowserClient()

	try {
		if (currentlyLiked) {
			// 좋아요 제거 - DELETE는 동시성 안전
			const { error } = await supabase
				.from("likes")
				.delete()
				.eq("user_id", userId)
				.eq("item_id", itemId)

			if (error) throw error
			return { success: true, isLiked: false }
		} else {
			// 좋아요 추가 - UPSERT로 중복 방지
			const { error } = await supabase
				.from("likes")
				.upsert(
					{ user_id: userId, item_id: itemId, created_at: new Date().toISOString() },
					{ 
						onConflict: "user_id,item_id",
						ignoreDuplicates: true 
					}
				)

			if (error) throw error
			return { success: true, isLiked: true }
		}
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error"
		console.error("❌ Like toggle failed:", error)
		return { 
			success: false, 
			isLiked: currentlyLiked, 
			error: errorMessage 
		}
	}
}

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

/**
 * 동시성 안전한 좋아요 수 조회 (서버 사이드 집계)
 */
export async function getLikeCountConcurrencySafe(itemId: string): Promise<number> {
	// itemId 유효성 검사
	if (!itemId || itemId === 'undefined' || itemId === 'null') {
		console.warn(`⚠️ getLikeCountConcurrencySafe: Invalid itemId: ${itemId}`)
		return 0
	}

	const supabase = createSupabaseBrowserClient()

	try {
		// console.log(`📊 getLikeCountConcurrencySafe: Fetching likes for item ${itemId}`)
		const { count, error } = await supabase
			.from("likes")
			.select("*", { count: "exact", head: true })
			.eq("item_id", itemId)

		if (error) {
			console.error(`❌ getLikeCountConcurrencySafe: Supabase error for item ${itemId}:`, error)
			throw error
		}
		
		// console.log(`✅ getLikeCountConcurrencySafe: Item ${itemId} has ${count || 0} likes`)
		return count || 0
	} catch (error) {
		console.error(`❌ getLikeCountConcurrencySafe: Error for item ${itemId}:`, error)
		return 0
	}
}

/**
 * SWR 캐시 충돌 방지를 위한 조건부 업데이트
 */
export function safeOptimisticUpdate<T>(
	currentData: T | undefined,
	updateFn: (data: T) => T,
	timestamp: number
): T | undefined {
	if (!currentData) return currentData

	// 타임스탬프 기반 충돌 감지
	const dataWithTimestamp = currentData as T & { _lastUpdate?: number }
	const lastUpdate = dataWithTimestamp._lastUpdate || 0

	if (timestamp < lastUpdate) {
		// console.log("⚠️ Optimistic update ignored due to newer data")
		return currentData
	}

	const updatedData = updateFn(currentData)
	return {
		...updatedData,
		_lastUpdate: timestamp
	} as T & { _lastUpdate: number }
}

/**
 * 재시도 로직이 포함된 트랜잭션 실행
 */
export async function executeWithRetry<T>(
	operation: () => Promise<T>,
	maxRetries: number = 3,
	delayMs: number = 100
): Promise<T> {
	let lastError: Error

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation()
		} catch (error: unknown) {
			lastError = error as Error
			
			// PostgreSQL 직렬화 오류인 경우만 재시도
			const pgError = error as { code?: string }
			if (pgError.code === "40001" || pgError.code === "40P01") {
				if (attempt < maxRetries) {
					// console.log(`🔄 Retrying operation (attempt ${attempt}/${maxRetries})`)
					await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
					continue
				}
			}
			throw error
		}
	}

	throw lastError!
}

/**
 * 동시성 안전한 복합 연산 (좋아요 + 알림)
 */
export async function toggleLikeWithNotification(
	itemId: string,
	userId: string,
	authorId: string,
	currentlyLiked: boolean
): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
	// itemId 유효성 검사
	if (!itemId || itemId === 'undefined' || itemId === 'null') {
		console.error(`❌ toggleLikeWithNotification: Invalid itemId: ${itemId}`)
		return { 
			success: false, 
			isLiked: currentlyLiked,
			error: "Invalid item ID" 
		}
	}

	// userId 유효성 검사
	if (!userId || userId === 'undefined' || userId === 'null') {
		console.error(`❌ toggleLikeWithNotification: Invalid userId: ${userId}`)
		return { 
			success: false, 
			isLiked: currentlyLiked,
			error: "Invalid user ID" 
		}
	}

	// console.log(`🔄 toggleLikeWithNotification: Item ${itemId}, User ${userId}, Currently liked: ${currentlyLiked}`)

	const supabase = createSupabaseBrowserClient()

	return executeWithRetry(async () => {
		// 좋아요 토글
		const likeResult = await toggleLikeConcurrencySafe(itemId, userId, currentlyLiked)
		
		if (!likeResult.success) {
			return likeResult
		}

		// 좋아요 추가된 경우에만 알림 생성 (작성자가 아닌 경우)
		if (likeResult.isLiked && userId !== authorId) {
			try {
				await supabase.from("notifications").insert({
					user_id: authorId,
					from_user_id: userId,
					item_id: itemId,
					type: "like"
					// content 필드 제거 - 테이블에 해당 컬럼이 없음
				})
			} catch (notificationError) {
				// 알림 생성 실패는 치명적이지 않으므로 로그만 남김
				console.warn("⚠️ Notification creation failed:", notificationError)
			}
		}

		return likeResult
	})
} 