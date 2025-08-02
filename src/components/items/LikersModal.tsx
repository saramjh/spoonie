"use client"

import { useState, useEffect } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Heart, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import Link from "next/link"

interface LikerProfile {
	id: string
	username: string
	display_name: string | null
	avatar_url: string | null
	public_id: string | null
	liked_at: string
}

interface LikersModalProps {
	isOpen: boolean
	onClose: () => void
	itemId: string
	itemType: "recipe" | "post"
	currentUserId?: string | null
}

export default function LikersModal({ isOpen, onClose, itemId, itemType, currentUserId }: LikersModalProps) {
	const [likers, setLikers] = useState<LikerProfile[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const supabase = createSupabaseBrowserClient()

	useEffect(() => {
		if (isOpen && itemId) {
			fetchLikers()
		}
	}, [isOpen, itemId])

	const fetchLikers = async () => {
		setLoading(true)
		setError(null)

		try {
			

			const { data, error } = await supabase
				.from("likes")
				.select(
					`
					user_id,
					created_at,
					profiles!user_id (
						id,
						username,
						display_name,
						avatar_url,
						public_id
					)
				`
				)
				.eq("item_id", itemId)
				.order("created_at", { ascending: false })
				.limit(50) // 최대 50명까지 표시

			if (error) {
				throw error
			}

			const formattedLikers: LikerProfile[] = (data || []).map((like: { user_id: string; created_at: string; profiles: any }) => {
				const profile = Array.isArray(like.profiles) ? like.profiles[0] : like.profiles
				return {
					id: profile?.id || like.user_id,
					username: profile?.username || "익명",
					        display_name: profile?.username,
					avatar_url: profile?.avatar_url,
					public_id: profile?.public_id,
					liked_at: like.created_at,
				}
			})

			
			setLikers(formattedLikers)
		} catch (error) {
			console.error("❌ Error fetching likers:", error)
			setError("좋아요한 사용자 목록을 불러오는데 실패했습니다.")
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md mx-auto max-h-[80vh]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Heart className="w-5 h-5 text-orange-500" />
						좋아요 ({likers.length})
					</DialogTitle>
					<DialogDescription>
						이 {itemType === 'recipe' ? '레시피' : '레시피드'}에 좋아요를 누른 사용자들을 확인할 수 있습니다.
					</DialogDescription>
				</DialogHeader>

				<div className="max-h-96 overflow-y-auto">
					{loading && (
						<div className="space-y-3">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="flex items-center gap-3 p-2">
									<div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
									<div className="flex-1">
										<div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse" />
										<div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
									</div>
								</div>
							))}
						</div>
					)}

					{error && (
						<div className="text-center py-8 text-gray-500">
							<p>{error}</p>
							<Button variant="outline" onClick={fetchLikers} className="mt-2">
								다시 시도
							</Button>
						</div>
					)}

					{!loading && !error && likers.length === 0 && (
						<div className="text-center py-8 text-gray-500">
							<Heart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
							<p>아직 좋아요가 없습니다.</p>
						</div>
					)}

					{!loading && !error && likers.length > 0 && (
						<div className="space-y-1">
							{likers.map((liker) => (
								<Link key={liker.id} href={`/profile/${liker.public_id || liker.id}`} onClick={() => onClose()} className="block">
									<div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
										<Avatar className="w-10 h-10">
											<AvatarImage src={liker.avatar_url || undefined} />
											                <AvatarFallback className="bg-orange-100 text-orange-600">{liker.username[0]}</AvatarFallback>
										</Avatar>

										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p className="font-medium text-sm truncate">{liker.username}</p>
												{liker.id === currentUserId && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">나</span>}
											</div>
											<div className="flex items-center gap-1 text-xs text-gray-500">
												<Clock className="w-3 h-3" />
												<span>
													{formatDistanceToNow(new Date(liker.liked_at), {
														addSuffix: true,
														locale: ko,
													})}
												</span>
											</div>
										</div>
									</div>
								</Link>
							))}
						</div>
					)}
				</div>

				{likers.length >= 50 && <div className="text-center text-xs text-gray-500 pt-2 border-t">최근 50명까지 표시됩니다</div>}
			</DialogContent>
		</Dialog>
	)
}
