"use client"

import { useState, useEffect, forwardRef, useCallback, useRef } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { useRefresh } from "@/contexts/RefreshContext"
import { useSWRConfig } from "swr"
import LikersModal from "./LikersModal"
import { toggleLikeWithNotification, getLikeCountConcurrencySafe } from "@/utils/concurrency-helpers"
import { syncAllCaches } from "@/utils/feed-cache-sync"

interface LikeButtonProps {
	itemId: string
	itemType: "recipe" | "post"
	authorId: string
	currentUserId?: string | null
}

export const LikeButton = forwardRef<HTMLButtonElement, LikeButtonProps>(({ itemId, itemType, authorId, currentUserId }, ref) => {
	const [likes, setLikes] = useState(0)
	const [hasLiked, setHasLiked] = useState(false)
	const [loading, setLoading] = useState(false)
	const [showLikersModal, setShowLikersModal] = useState(false)
	const { toast } = useToast()
	const supabase = createSupabaseBrowserClient()
	const { publishItemUpdate } = useRefresh()
	const { mutate } = useSWRConfig()
	
	// 연속 클릭 방지를 위한 디바운싱
	const lastClickTime = useRef<number>(0)
	const CLICK_DEBOUNCE_MS = 1000 // 1초간 중복 클릭 방지

	useEffect(() => {
		fetchLikeData()
	}, [itemId, currentUserId])

	const fetchLikeData = async () => {
		try {
			// 🔧 동시성 안전한 좋아요 수 조회
			const likesCount = await getLikeCountConcurrencySafe(itemId)
			setLikes(likesCount)

			// 현재 사용자 좋아요 상태 조회 (로그인한 경우만)
			if (currentUserId) {
				const { data, error: userLikeError } = await supabase.from("likes").select("user_id").eq("item_id", itemId).eq("user_id", currentUserId).maybeSingle()

				if (userLikeError) throw userLikeError
				setHasLiked(!!data)
			}
		} catch (error) {
			console.error("Error fetching like data:", error)
		}
	}

	const handleLike = useCallback(async () => {
		const now = Date.now()
		
		// 연속 클릭 방지 강화 - 로딩 중이거나 너무 빠른 클릭 차단
		if (loading) {
			console.log("⚠️ LikeButton: Already processing, ignoring click")
			return
		}
		
		if (now - lastClickTime.current < CLICK_DEBOUNCE_MS) {
			console.log("⚠️ LikeButton: Too fast clicking, debouncing")
			return
		}
		
		lastClickTime.current = now

		const {
			data: { user },
		} = await supabase.auth.getUser()

		if (!user) {
			toast({
				title: "로그인 필요",
				description: "좋아요를 누르려면 로그인이 필요합니다.",
				variant: "destructive",
			})
			return
		}

		setLoading(true)
		const newHasLiked = !hasLiked
		const delta = newHasLiked ? 1 : -1

		// 낙관적 업데이트
		setHasLiked(newHasLiked)
		setLikes((prev) => Math.max(0, prev + delta))

		// 실시간 업데이트 발행
		publishItemUpdate({
			itemId,
			itemType,
			updateType: newHasLiked ? "like_add" : "like_remove",
			delta,
		})

				// 🚀 통합 캐시 동기화 시스템 적용
		syncAllCaches({
			itemId,
			updateType: newHasLiked ? 'like_add' : 'like_remove',
			delta
		})

		// 좋아요한 사용자 목록 캐시도 즉시 갱신
		console.log(`👥 LikeButton: Invalidating likers cache for item ${itemId}`)
		mutate(`likers|${itemId}`, undefined, { revalidate: false })

		try {
			console.log(`❤️ LikeButton: Starting concurrency-safe operation - ${newHasLiked ? "INSERT" : "DELETE"} for ${itemType} ${itemId}`)

			// 🚀 동시성 안전한 좋아요 토글 + 알림 처리
			const result = await toggleLikeWithNotification(itemId, user.id, authorId, hasLiked)

			if (!result.success) {
				throw new Error(result.error || "좋아요 처리에 실패했습니다.")
			}

			// 햅틱 피드백 (모바일)
			if (result.isLiked && "vibrate" in navigator) {
				navigator.vibrate(50) // 50ms 진동
			}

			console.log(`✅ LikeButton: Successfully ${result.isLiked ? "added" : "removed"} like`)
			// 알림 처리는 toggleLikeWithNotification에서 자동으로 처리됨
		} catch (error) {
			console.error(`❌ LikeButton: Database operation failed:`, error)

			// 에러 시 롤백
			setHasLiked(!newHasLiked)
			setLikes((prev) => Math.max(0, prev - delta))

			// 실시간 업데이트 롤백
			publishItemUpdate({
				itemId,
				itemType,
				updateType: !newHasLiked ? "like_add" : "like_remove",
				delta: -delta,
			})

			toast({
				title: "오류 발생",
				description: "좋아요 처리 중 오류가 발생했습니다.",
				variant: "destructive",
			})
		} finally {
			setLoading(false)
		}
	}, [loading, hasLiked, itemId, itemType, authorId, currentUserId, supabase, toast, publishItemUpdate, mutate, lastClickTime, CLICK_DEBOUNCE_MS])

	return (
		<>
			<div className="flex items-center gap-1">
				<Button 
					ref={ref} 
					variant="ghost" 
					size="sm" 
					onClick={handleLike} 
					disabled={loading} 
					className={`flex items-center gap-1 hover:bg-orange-50 transition-all duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
				>
					<Heart 
						fill={hasLiked ? "#ea580c" : "none"} 
						stroke={hasLiked ? "#ea580c" : "currentColor"} 
						size={18}
						className={loading ? 'animate-pulse' : ''}
					/>
				</Button>
				{likes > 0 && (
					<button
						onClick={(e) => {
							e.stopPropagation()
							setShowLikersModal(true)
						}}
						className="text-sm text-gray-600 hover:text-orange-600 hover:underline transition-colors"
						disabled={loading}>
			{likes}
					</button>
				)}
				{likes === 0 && <span className="text-sm text-gray-400">0</span>}
			</div>

			{/* 좋아요한 사용자 목록 모달 */}
			<LikersModal isOpen={showLikersModal} onClose={() => setShowLikersModal(false)} itemId={itemId} itemType={itemType} currentUserId={currentUserId} />
		</>
	)
})

LikeButton.displayName = "LikeButton"
