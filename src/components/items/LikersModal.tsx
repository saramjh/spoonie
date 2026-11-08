"use client"

import useSWR from "swr"
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Heart, X } from "lucide-react"
import { IntentLink } from "@/components/kit"
import { fetchLikers } from "@/features/social/data/social-repository"
import FollowButton from "@/components/items/FollowButton"


interface LikersModalProps {
	isOpen: boolean
	onClose: () => void
	itemId: string
	itemType: "recipe" | "post"
	currentUserId?: string | null
}


export default function LikersModal({ isOpen, onClose, itemId, itemType, currentUserId }: LikersModalProps) {
	// 창이 열렸을 때만 받는다
	const { data: likers = [], error: fetchError, isLoading: loading, mutate } = useSWR(isOpen && itemId ? `likers|${itemId}|${currentUserId ?? "guest"}` : null, () => fetchLikers(itemId, currentUserId ?? null), {
		revalidateOnFocus: false,
	})
	const error = fetchError ? "좋아요한 사용자 목록을 불러오는데 실패했습니다." : null
	const retry = () => mutate()

	return (
		<Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground={false}>
			<DrawerContent className="mx-auto max-h-[80dvh] max-w-md px-4 pb-5">
				<div className="flex items-center justify-between pt-4">
					<DrawerTitle className="text-title font-semibold text-ink">좋아요 누른 사람</DrawerTitle>
					<Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="닫기"><X aria-hidden className="h-5 w-5" /></Button>
				</div>
				<DrawerDescription className="sr-only">이 {itemType === 'recipe' ? '레시피' : '레시피드'}에 좋아요를 누른 사용자</DrawerDescription>

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
						<div className="divide-y divide-border">
							{likers.map((liker) => (
								<div key={liker.id} className="flex min-h-16 items-center gap-2">
								<IntentLink href={`/profile/${liker.public_id || liker.id}`} onClick={() => onClose()} className="min-w-0 flex-1">
									<div className="flex items-center gap-3 py-3 hover:bg-muted transition-colors">
										<Avatar className="w-10 h-10">
											<AvatarImage src={liker.avatar_url || undefined} />
											                <AvatarFallback className="bg-muted text-orange-ink">{liker.username[0]}</AvatarFallback>
										</Avatar>

										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p className="font-medium text-label truncate">{liker.username}</p>
												{liker.id === currentUserId && <span className="text-meta text-ink-soft">(나)</span>}
											</div>
											<p className="text-meta text-ink-soft">@{liker.public_id || liker.username}</p>
										</div>
									</div>
								</IntentLink>
								{currentUserId && liker.id !== currentUserId && <FollowButton appearance="compact" userId={liker.id} initialIsFollowing={liker.viewer_follows} eventOrigin="likers_modal" />}
								</div>
							))}
						</div>
					)}
				</div>

				{likers.length >= 50 && <div className="text-center text-meta text-ink-soft pt-2 border-t">최근 50명까지 표시됩니다</div>}
			</DrawerContent>
		</Drawer>
	)
}
