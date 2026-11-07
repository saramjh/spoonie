"use client"

import useSWR from "swr"
import { Users, X } from "lucide-react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import FollowButton from "@/components/items/FollowButton"
import { IntentLink } from "@/components/kit"
import type { FollowDirection } from "@/features/social/contracts"
import { fetchFollowList } from "@/features/social/data/social-repository"

export type { FollowDirection } from "@/features/social/contracts"

const COPY: Record<FollowDirection, { title: string; description: string; empty: string }> = {
	followers: { title: "팔로워", description: "이 사용자를 팔로우하는 사람들", empty: "아직 팔로워가 없어요." },
	following: { title: "팔로잉", description: "이 사용자가 팔로우하는 사람들", empty: "아직 팔로우하는 사람이 없어요." },
}


interface FollowListModalProps {
	direction: FollowDirection
	isOpen: boolean
	onClose: () => void
	userId: string
	currentUserId?: string | null
}

// 프로필의 팔로워 / 팔로잉 목록. 창이 열렸을 때만 받는다
export default function FollowListModal({ direction, isOpen, onClose, userId, currentUserId = null }: FollowListModalProps) {
	const copy = COPY[direction]
	const { data: people = [], error, isLoading, mutate } = useSWR(
		isOpen && userId ? `follow_list|${direction}|${userId}|${currentUserId ?? "guest"}` : null,
		() => fetchFollowList(direction, userId, currentUserId),
		{ revalidateOnFocus: false }
	)

	return (
		<Drawer open={isOpen} onOpenChange={onClose} shouldScaleBackground={false}>
			<DrawerContent className="mx-auto max-h-[80dvh] max-w-md px-4 pb-5">
				<div className="flex items-center justify-between pt-4">
					<DrawerTitle className="text-title font-semibold text-ink">{copy.title}</DrawerTitle>
					<Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="닫기"><X aria-hidden className="h-5 w-5" /></Button>
				</div>
				<DrawerDescription className="sr-only">{copy.description}</DrawerDescription>

				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="space-y-4" aria-busy="true">
							{[0, 1, 2].map((i) => (
								<div key={i} className="flex animate-pulse items-center gap-3">
									<div className="h-12 w-12 rounded-full bg-border" />
									<div className="flex-1 space-y-2">
										<div className="h-4 w-24 rounded bg-border" />
										<div className="h-3 w-16 rounded bg-border" />
									</div>
								</div>
							))}
						</div>
					) : error ? (
						<div className="py-8 text-center">
							<p className="text-meta text-destructive">{copy.title} 목록을 불러오지 못했어요.</p>
							<Button variant="outline" size="sm" onClick={() => mutate()} className="mt-4">
								다시 시도
							</Button>
						</div>
					) : people.length === 0 ? (
						<div className="py-8 text-center">
							<Users className="mx-auto mb-4 h-12 w-12 text-ink-soft/60" aria-hidden />
							<p className="text-meta text-ink-soft">{copy.empty}</p>
						</div>
					) : (
						<ul className="divide-y divide-border">
							{people.map((person) => (
								<li key={person.id} className="flex min-h-16 items-center justify-between gap-3">
									<IntentLink href={`/profile/${person.public_id || person.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-2 hover:bg-muted">
										<Avatar className="h-10 w-10">
											<AvatarImage src={person.avatar_url || undefined} alt="" />
											<AvatarFallback className="bg-border text-ink-soft">{person.username?.charAt(0) || "?"}</AvatarFallback>
										</Avatar>
										<span className="min-w-0">
											<span className="block truncate text-label font-semibold text-ink">{person.username}</span>
											<span className="block text-meta text-ink-soft">
												@{person.public_id || person.username}
											</span>
										</span>
									</IntentLink>
									{currentUserId && person.id !== currentUserId && <FollowButton appearance="compact" userId={person.id} initialIsFollowing={person.viewer_follows} eventOrigin="follow_list" />}
								</li>
							))}
						</ul>
					)}
				</div>
			</DrawerContent>
		</Drawer>
	)
}
