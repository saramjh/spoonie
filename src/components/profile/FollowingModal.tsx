"use client"

import { useState, useEffect } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { UserPlus, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import FollowButton from "@/components/items/FollowButton"
import { useFollowStore } from "@/store/followStore"
import { IntentLink } from "@/components/kit"

interface FollowingProfile {
	id: string
	username: string
	display_name: string | null
	avatar_url: string | null
	public_id: string | null
	followed_at: string
	is_still_following: boolean
}

interface FollowingModalProps {
	isOpen: boolean
	onClose: () => void
	userId: string
	currentUserId?: string | null
}

export default function FollowingModal({ isOpen, onClose, userId, currentUserId }: FollowingModalProps) {
	const [following, setFollowing] = useState<FollowingProfile[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const supabase = createSupabaseBrowserClient()
	
	// 글로벌 팔로우 상태 연동
	const { isFollowing: getIsFollowing } = useFollowStore()

	useEffect(() => {
		if (isOpen && userId) {
			fetchFollowing()
		}
		// fetchFollowing은 컴포넌트 생명주기와 무관하게 
		// userId 변경 시에만 호출되어야 함
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, userId])

	const fetchFollowing = async () => {
		setLoading(true)
		setError(null)

		try {
			

			// 팔로잉 목록 가져오기 (이 사용자가 팔로우하는 사람들)
			const { data, error } = await supabase
				.from("follows")
				.select(`
					following_id,
					created_at,
					following:profiles!follows_following_id_fkey (
						id,
						username,
						display_name,
						avatar_url,
						public_id
					)
				`)
				.eq("follower_id", userId)
				.order("created_at", { ascending: false })

			if (error) {
				throw new Error(error.message)
			}

			if (!data) {
				setFollowing([])
				return
			}

			// 팔로잉 상태 확인 (현재 사용자가 각 팔로잉 대상을 팔로우하고 있는지)
			let followingWithStatus = data.map((follow: Record<string, unknown>) => ({
				id: (follow.following as Record<string, unknown>)?.id as string,
				username: (follow.following as Record<string, unknown>)?.username as string,
				display_name: (follow.following as Record<string, unknown>)?.display_name as string | null,
				avatar_url: (follow.following as Record<string, unknown>)?.avatar_url as string | null,
				public_id: (follow.following as Record<string, unknown>)?.public_id as string | null,
				followed_at: follow.created_at as string,
				is_still_following: true, // 기본값 (현재 팔로잉 목록에서 가져온 것이므로)
			}))

			// 현재 사용자가 로그인된 경우, 각 팔로잉 대상에 대한 팔로우 상태 확인
			if (currentUserId && currentUserId !== userId) {
				const followingIds = followingWithStatus.map(f => f.id)
				
				const { data: currentUserFollowing } = await supabase
					.from("follows")
					.select("following_id")
					.eq("follower_id", currentUserId)
					.in("following_id", followingIds)

				const currentUserFollowingIds = new Set(currentUserFollowing?.map(f => f.following_id) || [])
				
				followingWithStatus = followingWithStatus.map(followingUser => ({
					...followingUser,
					is_still_following: currentUserFollowingIds.has(followingUser.id)
				}))
			}

			setFollowing(followingWithStatus)
			

		} catch (error) {
			console.error("❌ Error fetching following:", error)
			setError(error instanceof Error ? error.message : "팔로잉 목록을 불러오는데 실패했습니다.")
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						팔로잉
					</DialogTitle>
					<DialogDescription>
						이 사용자가 팔로우하고 있는 사람들의 목록을 확인할 수 있습니다.
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto">
					{loading ? (
						<div className="space-y-4">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="flex items-center space-x-3 animate-pulse">
									<div className="w-12 h-12 bg-border rounded-full"></div>
									<div className="flex-1 space-y-2">
										<div className="h-4 bg-border rounded w-24"></div>
										<div className="h-3 bg-border rounded w-16"></div>
									</div>
									<div className="w-20 h-8 bg-border rounded"></div>
								</div>
							))}
						</div>
					) : error ? (
						<div className="text-center py-8">
							<UserPlus className="w-12 h-12 text-ink-soft/60 mx-auto mb-4" />
							<p className="text-destructive text-sm">{error}</p>
							<Button
								variant="outline"
								size="sm"
								onClick={fetchFollowing}
								className="mt-4"
							>
								다시 시도
							</Button>
						</div>
					) : following.length === 0 ? (
						<div className="text-center py-8">
							<UserPlus className="w-12 h-12 text-ink-soft/60 mx-auto mb-4" />
							<p className="text-ink-soft text-sm">아직 팔로잉하는 사용자가 없습니다.</p>
						</div>
					) : (
						<div className="space-y-3">
							{following.map((followingUser) => (
								<div key={followingUser.id} className="flex items-center justify-between py-2">
									<IntentLink 
										href={`/profile/${followingUser.public_id || followingUser.id}`}
										className="flex items-center space-x-3 flex-1 hover:bg-door rounded-lg p-2 transition-colors"
									>
										<Avatar className="w-12 h-12 border">
											<AvatarImage src={followingUser.avatar_url || undefined} />
											<AvatarFallback className="bg-border text-ink-soft">
												                {followingUser.username?.charAt(0) || "U"}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p className="font-semibold text-sm text-ink truncate">
													{followingUser.username}
												</p>
											</div>

											<div className="flex items-center gap-1 text-[13px] text-ink-soft">
												<Clock className="w-3 h-3" />
												<span>
													{formatDistanceToNow(new Date(followingUser.followed_at), {
														addSuffix: true,
														locale: ko,
													})}
												</span>
											</div>
										</div>
									</IntentLink>
									
									{/* 자기 자신이 아닌 경우에만 팔로우 버튼 표시 */}
									{currentUserId && followingUser.id !== currentUserId && (
										<div className="ml-3">
											<FollowButton 
												userId={followingUser.id} 
												initialIsFollowing={getIsFollowing(followingUser.id)}
											/>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
} 