"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useFollowStore } from "@/store/followStore"
import { useToast } from "@/hooks/use-toast"
import { useSessionStore } from "@/store/sessionStore"
import LoginPromptSheet from "@/components/auth/LoginPromptSheet"

interface FollowButtonProps {
	userId: string
	initialIsFollowing?: boolean // 업계 표준: 초기값으로만 사용, 이후 글로벌 상태 우선
	className?: string
	// text: 카드·목록 머리의 글자 버튼(테두리 없음). primary: 프로필처럼 그 화면의 주요 동작일 때
	appearance?: "text" | "primary"
}

export default function FollowButton({ userId, initialIsFollowing, className, appearance = "text" }: FollowButtonProps) {
	const { toast } = useToast()
	const { session } = useSessionStore()
	
	// 업계 표준: 글로벌 상태에서 팔로우 상태 참조 (Single Source of Truth)
	const { isFollowing: globalIsFollowing, follow, unfollow, isLoading: storeLoading } = useFollowStore()
	const [isProcessing, setIsProcessing] = useState(false)
	const [showLoginPrompt, setShowLoginPrompt] = useState(false)
	
	// 업계 표준: 글로벌 상태 우선, Store가 로딩중이면 초기값 사용
	const globalFollowState = globalIsFollowing(userId)
	const isFollowing = storeLoading ? (initialIsFollowing || false) : globalFollowState
	
	// SSA 표준: 비로그인 사용자 처리 + 모든 상태 관리를 cacheManager에 위임
	const handleFollowToggle = async () => {
		if (isProcessing) return
		
		// 비로그인 사용자 회원가입 유도 (토스 UX 스타일 - 바텀시트)
		if (!session?.id) {
			setShowLoginPrompt(true)
			return
		}

		setIsProcessing(true)
		
		try {
			let success: boolean
			
			if (isFollowing) {
				// SSA 표준: Unfollow
				success = await unfollow(userId)
				
				if (success) {
					toast({
						title: "언팔로우 완료",
						description: "더 이상 이 사용자의 게시물을 받아보지 않습니다.",
					})
				}
			} else {
				// SSA 표준: Follow
				success = await follow(userId)
				
				if (success) {
					toast({
						title: "팔로우 완료", 
						description: "이제 이 사용자의 게시물을 받아볼 수 있습니다.",
					})
					
					// 팔로우 알림과 푸시는 DB 트리거가 서버에서 처리한다
				}
			}
			
			if (!success) {
				toast({
					title: "오류",
					description: isFollowing ? "언팔로우에 실패했습니다." : "팔로우에 실패했습니다.",
					variant: "destructive",
				})
			}
		} catch (error) {
			console.error("❌ FollowButton: Follow toggle failed:", error)
			toast({
				title: "오류",
				description: "네트워크 오류가 발생했습니다.",
				variant: "destructive",
			})
		} finally {
			setIsProcessing(false)
		}
	}

	return (
		<>
			<Button
				variant={appearance === "primary" ? (isFollowing ? "outline" : "default") : "ghost"}
				size={appearance === "primary" ? "default" : "sm"}
				onClick={handleFollowToggle}
				disabled={isProcessing}
				className={cn(appearance === "text" && (isFollowing ? "px-3 text-ink-soft" : "px-3 font-semibold text-orange-ink hover:text-orange-ink"), className)}
				aria-pressed={isFollowing}
			>
				{isProcessing ? (
					<div className="flex items-center gap-2">
						<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
						<span>{isFollowing ? "언팔로우 중..." : "팔로우 중..."}</span>
					</div>
				) : (
					<span>{isFollowing ? "팔로잉" : "팔로우"}</span>
				)}
			</Button>

			{/* 토스 스타일 로그인 유도 바텀시트 */}
			<LoginPromptSheet
				isOpen={showLoginPrompt}
				onClose={() => setShowLoginPrompt(false)}
				action="follow"
			/>
		</>
	)
}
