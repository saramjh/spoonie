"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useFollowStore } from "@/store/followStore"
import { useToast } from "@/hooks/use-toast"
import { notificationService } from "@/lib/notification-service"
import { useSessionStore } from "@/store/sessionStore"

interface FollowButtonProps {
	userId: string
	initialIsFollowing?: boolean // 🔧 업계 표준: 초기값으로만 사용, 이후 글로벌 상태 우선
	className?: string
}

export default function FollowButton({ userId, initialIsFollowing, className }: FollowButtonProps) {
	const { toast } = useToast()
	const { session } = useSessionStore()
	
	// 🚀 업계 표준: 글로벌 상태에서 팔로우 상태 참조 (Single Source of Truth)
	const { isFollowing: globalIsFollowing, follow, unfollow } = useFollowStore()
	const [isProcessing, setIsProcessing] = useState(false)
	
	// 🎯 업계 표준: 글로벌 상태 우선, 없으면 초기값 사용
	const isFollowing = globalIsFollowing(userId) || initialIsFollowing || false
	
	// 🚀 업계 표준: Optimistic Updates (Instagram/Twitter 방식)
	const handleFollowToggle = async () => {
		if (isProcessing) return
		
		setIsProcessing(true)
		
		try {
			let success: boolean
			
			if (isFollowing) {
				// Unfollow with optimistic update
				success = await unfollow(userId)
				if (success) {
					toast({
						title: "언팔로우 완료",
						description: "더 이상 이 사용자의 게시물을 받아보지 않습니다.",
					})
				}
			} else {
				// Follow with optimistic update  
				success = await follow(userId)
				if (success) {
					toast({
						title: "팔로우 완료", 
						description: "이제 이 사용자의 게시물을 받아볼 수 있습니다.",
					})
					
					// 🔔 팔로우 알림 발송
					if (session?.id) {
						notificationService.notifyFollow(userId, session.id)
							.catch(error => console.error('❌ 팔로우 알림 발송 실패:', error))
					}
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
		<Button
			variant={isFollowing ? "outline" : "default"}
			size="sm"
			onClick={handleFollowToggle}
			disabled={isProcessing}
			className={className}
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
	)
}
