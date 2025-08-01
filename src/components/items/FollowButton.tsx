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
	
	// 🎯 업계 표준: 글로벌 상태 우선, Store가 로딩중이면 초기값 사용
	// isFollowing은 항상 boolean을 반환하므로 Store가 초기화되었는지 확인 필요
	const { isLoading: storeLoading } = useFollowStore()
	const globalFollowState = globalIsFollowing(userId)
	const isFollowing = storeLoading ? (initialIsFollowing || false) : globalFollowState
	
	// 🚀 SSA 표준: 모든 상태 관리를 cacheManager에 위임
	const handleFollowToggle = async () => {
		if (isProcessing) return
		
		console.log(`🔄 [FollowButton] Starting ${isFollowing ? 'unfollow' : 'follow'} operation:`, {
			targetUserId: userId,
			currentIsFollowing: isFollowing,
			sessionId: session?.id
		})
		
		setIsProcessing(true)
		
		try {
			let success: boolean
			
			if (isFollowing) {
				// SSA 표준: Unfollow
				console.log(`🔄 [FollowButton] Calling unfollow for userId: ${userId}`)
				success = await unfollow(userId)
				console.log(`📊 [FollowButton] Unfollow result:`, { success, userId })
				
				if (success) {
					toast({
						title: "언팔로우 완료",
						description: "더 이상 이 사용자의 게시물을 받아보지 않습니다.",
					})
				}
			} else {
				// SSA 표준: Follow
				console.log(`🔄 [FollowButton] Calling follow for userId: ${userId}`)
				success = await follow(userId)
				console.log(`📊 [FollowButton] Follow result:`, { success, userId })
				
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
				console.error(`❌ [FollowButton] ${isFollowing ? 'Unfollow' : 'Follow'} failed for userId: ${userId}`)
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
			console.log(`✅ [FollowButton] ${isFollowing ? 'Unfollow' : 'Follow'} operation finished`)
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
