"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UserCheck, UserPlus } from "lucide-react"
import { useFollowStore } from "@/features/social/store/followStore"
import { useToast } from "@/hooks/use-toast"
import { useSessionStore } from "@/store/sessionStore"
import LoginPromptSheet from "@/components/auth/LoginPromptSheet"
import { logEvent } from "@/shared/infra/events"

interface FollowButtonProps {
	userId: string
	initialIsFollowing?: boolean // store 초기화 전 표시할 fallback
	className?: string
	// icon: 카드·목록 머리의 아이콘 버튼(사람+ / 사람✓, 상태는 aria-label로). primary: 프로필처럼 그 화면의 주요 동작일 때(아이콘 + 글자)
	appearance?: "icon" | "primary"
	eventOrigin?: string
}

export default function FollowButton({ userId, initialIsFollowing, className, appearance = "icon", eventOrigin = "unknown" }: FollowButtonProps) {
	const { toast } = useToast()
	const { session } = useSessionStore()
	
	const { isFollowing: globalIsFollowing, follow, unfollow, isLoading: storeLoading } = useFollowStore()
	const [isProcessing, setIsProcessing] = useState(false)
	const [showLoginPrompt, setShowLoginPrompt] = useState(false)
	
	// store 초기화 전에는 서버에서 받은 값을 사용한다.
	const globalFollowState = globalIsFollowing(userId)
	const isFollowing = storeLoading ? (initialIsFollowing || false) : globalFollowState
	
	const handleFollowToggle = async () => {
		if (isProcessing) return
		
		if (!session?.id) {
			setShowLoginPrompt(true)
			return
		}

		setIsProcessing(true)
		
		try {
			let success: boolean
			
			if (isFollowing) {
				success = await unfollow(userId)
				
				if (success) {
					logEvent("unfollow", null, eventOrigin)
					toast({
						title: "언팔로우 완료",
						description: "더 이상 이 사용자의 게시물을 받아보지 않습니다.",
					})
				}
			} else {
				success = await follow(userId)
				
				if (success) {
					logEvent("follow", null, eventOrigin)
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
			{appearance === "icon" ? (
				<Button
					variant="ghost"
					size="icon"
					onClick={handleFollowToggle}
					disabled={isProcessing}
					aria-pressed={isFollowing}
					aria-label={isFollowing ? "팔로잉 중, 누르면 팔로우 취소" : "팔로우"}
					title={isFollowing ? "팔로잉" : "팔로우"}
					className={cn(isFollowing ? "text-ink-soft" : "text-orange-ink hover:text-orange-ink", className)}
				>
					{isFollowing ? <UserCheck className="!size-5" aria-hidden /> : <UserPlus className="!size-5" aria-hidden />}
				</Button>
			) : (
				<Button
					variant={isFollowing ? "outline" : "default"}
					onClick={handleFollowToggle}
					disabled={isProcessing}
					aria-pressed={isFollowing}
					className={className}
				>
					{isFollowing ? <UserCheck aria-hidden /> : <UserPlus aria-hidden />}
					{isFollowing ? "팔로잉" : "팔로우"}
				</Button>
			)}

			<LoginPromptSheet
				isOpen={showLoginPrompt}
				onClose={() => setShowLoginPrompt(false)}
				action="follow"
			/>
		</>
	)
}
