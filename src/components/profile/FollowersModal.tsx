"use client"

import { useState, useEffect } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Users, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import Link from "next/link"
import FollowButton from "@/components/items/FollowButton"

interface FollowerProfile {
	id: string
	username: string
	display_name: string | null
	avatar_url: string | null
	public_id: string | null
	followed_at: string
	is_following_back?: boolean
}

interface FollowersModalProps {
	isOpen: boolean
	onClose: () => void
	userId: string
	currentUserId?: string | null
}

export default function FollowersModal({ isOpen, onClose, userId, currentUserId }: FollowersModalProps) {
	const [followers, setFollowers] = useState<FollowerProfile[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const supabase = createSupabaseBrowserClient()

	useEffect(() => {
		if (isOpen && userId) {
			fetchFollowers()
		}
	}, [isOpen, userId])

	const fetchFollowers = async () => {
		setLoading(true)
		setError(null)

		try {
			console.log(`🔍 Fetching followers for user ${userId}`)

			// 팔로워 목록 가져오기 (이 사용자를 팔로우하는 사람들)
			const { data, error } = await supabase
				.from("follows")
				.select(`
					follower_id,
					created_at,
					follower:profiles!follows_follower_id_fkey (
						id,
						username,
						display_name,
						avatar_url,
						public_id
					)
				`)
				.eq("following_id", userId)
				.order("created_at", { ascending: false })

			if (error) {
				throw new Error(error.message)
			}

			if (!data) {
				setFollowers([])
				return
			}

			// 현재 사용자가 각 팔로워를 팔로잉하고 있는지 확인
			let followersWithStatus = data.map((follow: Record<string, unknown>) => ({
				id: (follow.follower as Record<string, unknown>)?.id as string,
				username: (follow.follower as Record<string, unknown>)?.username as string,
				display_name: (follow.follower as Record<string, unknown>)?.display_name as string | null,
				avatar_url: (follow.follower as Record<string, unknown>)?.avatar_url as string | null,
				public_id: (follow.follower as Record<string, unknown>)?.public_id as string | null,
				followed_at: follow.created_at as string,
				is_following_back: false, // 기본값
			}))

			// 현재 사용자가 로그인된 경우, 맞팔로우 상태 확인
			if (currentUserId) {
				const followerIds = followersWithStatus.map(f => f.id)
				
				const { data: followingData } = await supabase
					.from("follows")
					.select("following_id")
					.eq("follower_id", currentUserId)
					.in("following_id", followerIds)

				const followingIds = new Set(followingData?.map(f => f.following_id) || [])
				
				followersWithStatus = followersWithStatus.map(follower => ({
					...follower,
					is_following_back: followingIds.has(follower.id)
				}))
			}

			setFollowers(followersWithStatus)
			console.log(`✅ Successfully fetched ${followersWithStatus.length} followers`)

		} catch (error) {
			console.error("❌ Error fetching followers:", error)
			setError(error instanceof Error ? error.message : "팔로워 목록을 불러오는데 실패했습니다.")
		} finally {
			setLoading(false)
		}
	}



	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md max-h-[80vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Users className="w-5 h-5 text-blue-600" />
						팔로워
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto">
					{loading ? (
						<div className="space-y-4">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="flex items-center space-x-3 animate-pulse">
									<div className="w-12 h-12 bg-gray-200 rounded-full"></div>
									<div className="flex-1 space-y-2">
										<div className="h-4 bg-gray-200 rounded w-24"></div>
										<div className="h-3 bg-gray-200 rounded w-16"></div>
									</div>
									<div className="w-20 h-8 bg-gray-200 rounded"></div>
								</div>
							))}
						</div>
					) : error ? (
						<div className="text-center py-8">
							<Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
							<p className="text-red-500 text-sm">{error}</p>
							<Button
								variant="outline"
								size="sm"
								onClick={fetchFollowers}
								className="mt-4"
							>
								다시 시도
							</Button>
						</div>
					) : followers.length === 0 ? (
						<div className="text-center py-8">
							<Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
							<p className="text-gray-500 text-sm">아직 팔로워가 없습니다.</p>
						</div>
					) : (
						<div className="space-y-3">
							{followers.map((follower) => (
								<div key={follower.id} className="flex items-center justify-between py-2">
									<Link 
										href={`/profile/${follower.public_id || follower.id}`}
										className="flex items-center space-x-3 flex-1 hover:bg-gray-50 rounded-lg p-2 transition-colors"
									>
										<Avatar className="w-12 h-12 border">
											<AvatarImage src={follower.avatar_url || undefined} />
											<AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
												{follower.display_name?.charAt(0) || follower.username?.charAt(0) || "U"}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p className="font-semibold text-sm text-gray-900 truncate">
													{follower.username}
												</p>
											</div>
											{follower.display_name && (
												<p className="text-xs text-gray-500 truncate">{follower.display_name}</p>
											)}
											<div className="flex items-center gap-1 text-xs text-gray-400">
												<Clock className="w-3 h-3" />
												<span>
													{formatDistanceToNow(new Date(follower.followed_at), {
														addSuffix: true,
														locale: ko,
													})}
												</span>
											</div>
										</div>
									</Link>
									
									{/* 자기 자신이 아닌 경우에만 팔로우 버튼 표시 */}
									{currentUserId && follower.id !== currentUserId && (
										<div className="ml-3">
											<FollowButton 
												userId={follower.id} 
												initialIsFollowing={follower.is_following_back || false}
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