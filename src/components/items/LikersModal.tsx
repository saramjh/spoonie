"use client"

import useSWR from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Heart, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import type { Profile } from "@/types/item"
import { IntentLink } from "@/components/kit"

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

// 좋아요한 사람 최근 50명
async function fetchLikers(itemId: string): Promise<LikerProfile[]> {
	const { data, error } = await createSupabaseBrowserClient()
		.from("likes")
		.select("user_id, created_at, profiles!user_id (id, username, display_name, avatar_url, public_id)")
		.eq("item_id", itemId)
		.order("created_at", { ascending: false })
		.limit(50)
	if (error) throw error
	return (data || []).map((like: { user_id: string; created_at: string; profiles: Profile | Profile[] }) => {
		const profile = Array.isArray(like.profiles) ? like.profiles[0] : like.profiles
		return {
			id: profile?.id || like.user_id,
			username: profile?.username || "익명",
			display_name: profile?.username ?? null,
			avatar_url: profile?.avatar_url ?? null,
			public_id: profile?.public_id ?? null,
			liked_at: like.created_at,
		}
	})
}

export default function LikersModal({ isOpen, onClose, itemId, itemType, currentUserId }: LikersModalProps) {
	// 창이 열렸을 때만 받는다
	const { data: likers = [], error: fetchError, isLoading: loading, mutate } = useSWR(isOpen && itemId ? `likers|${itemId}` : null, () => fetchLikers(itemId), {
		revalidateOnFocus: false,
	})
	const error = fetchError ? "좋아요한 사용자 목록을 불러오는데 실패했습니다." : null
	const retry = () => mutate()

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md mx-auto max-h-[80vh]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Heart className="w-5 h-5 text-orange-ink" />
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
									<div className="w-10 h-10 bg-border rounded-full animate-pulse" />
									<div className="flex-1">
										<div className="h-4 bg-border rounded w-24 mb-1 animate-pulse" />
										<div className="h-3 bg-border rounded w-16 animate-pulse" />
									</div>
								</div>
							))}
						</div>
					)}

					{error && (
						<div className="text-center py-8 text-ink-soft">
							<p>{error}</p>
							<Button variant="outline" onClick={retry} className="mt-2">
								다시 시도
							</Button>
						</div>
					)}

					{!loading && !error && likers.length === 0 && (
						<div className="text-center py-8 text-ink-soft">
							<Heart className="w-8 h-8 mx-auto mb-2 text-ink-soft/60" />
							<p>아직 좋아요가 없습니다.</p>
						</div>
					)}

					{!loading && !error && likers.length > 0 && (
						<div className="space-y-1">
							{likers.map((liker) => (
								<IntentLink key={liker.id} href={`/profile/${liker.public_id || liker.id}`} onClick={() => onClose()} className="block">
									<div className="flex items-center gap-3 p-3 rounded-lg hover:bg-door transition-colors cursor-pointer">
										<Avatar className="w-10 h-10">
											<AvatarImage src={liker.avatar_url || undefined} />
											                <AvatarFallback className="bg-muted text-orange-ink">{liker.username[0]}</AvatarFallback>
										</Avatar>

										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p className="font-medium text-label truncate">{liker.username}</p>
												{liker.id === currentUserId && <span className="text-meta text-ink-soft">(나)</span>}
											</div>
											<div className="flex items-center gap-1 text-meta text-ink-soft">
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
								</IntentLink>
							))}
						</div>
					)}
				</div>

				{likers.length >= 50 && <div className="text-center text-meta text-ink-soft pt-2 border-t">최근 50명까지 표시됩니다</div>}
			</DialogContent>
		</Dialog>
	)
}
