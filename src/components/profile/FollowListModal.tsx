"use client"

import useSWR from "swr"
import { Users } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import FollowButton from "@/components/items/FollowButton"
import { IntentLink, RelativeTime } from "@/components/kit"

export type FollowDirection = "followers" | "following"

interface FollowPerson {
	id: string
	username: string
	avatar_url: string | null
	public_id: string | null
	followed_at: string
	// 보는 사람(로그인 사용자)이 이 사람을 팔로우하는지
	viewer_follows: boolean
}

const COPY: Record<FollowDirection, { title: string; description: string; empty: string }> = {
	followers: { title: "팔로워", description: "이 사용자를 팔로우하는 사람들", empty: "아직 팔로워가 없어요." },
	following: { title: "팔로잉", description: "이 사용자가 팔로우하는 사람들", empty: "아직 팔로우하는 사람이 없어요." },
}

type ProfileRow = { id: string; username: string; avatar_url: string | null; public_id: string | null }

async function fetchFollowList(direction: FollowDirection, userId: string, viewerId: string | null): Promise<FollowPerson[]> {
	const supabase = createSupabaseBrowserClient()
	// 팔로워: 이 사람을 팔로우하는 쪽(follower), 팔로잉: 이 사람이 팔로우하는 쪽(following)
	const query =
		direction === "followers"
			? supabase.from("follows").select("created_at, person:profiles!follows_follower_id_fkey (id, username, avatar_url, public_id)").eq("following_id", userId)
			: supabase.from("follows").select("created_at, person:profiles!follows_following_id_fkey (id, username, avatar_url, public_id)").eq("follower_id", userId)
	const { data, error } = await query.order("created_at", { ascending: false })
	if (error) throw error

	const people = (data || [])
		.map((row) => ({ person: (Array.isArray(row.person) ? row.person[0] : row.person) as ProfileRow | null, created_at: row.created_at as string }))
		.filter((row): row is { person: ProfileRow; created_at: string } => !!row.person)

	// 보는 사람의 팔로우 상태는 한 번에 확인한다
	let viewerFollows = new Set<string>()
	if (viewerId && people.length > 0) {
		if (direction === "following" && viewerId === userId) {
			viewerFollows = new Set(people.map((p) => p.person.id))
		} else {
			const { data: mine } = await supabase
				.from("follows")
				.select("following_id")
				.eq("follower_id", viewerId)
				.in("following_id", people.map((p) => p.person.id))
			viewerFollows = new Set((mine || []).map((f) => f.following_id as string))
		}
	}

	return people.map(({ person, created_at }) => ({
		id: person.id,
		username: person.username,
		avatar_url: person.avatar_url,
		public_id: person.public_id,
		followed_at: created_at,
		viewer_follows: viewerFollows.has(person.id),
	}))
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
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="flex max-h-[80vh] max-w-md flex-col">
				<DialogHeader>
					<DialogTitle>{copy.title}</DialogTitle>
					<DialogDescription>{copy.description}</DialogDescription>
				</DialogHeader>

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
							<p className="text-sm text-destructive">{copy.title} 목록을 불러오지 못했어요.</p>
							<Button variant="outline" size="sm" onClick={() => mutate()} className="mt-4">
								다시 시도
							</Button>
						</div>
					) : people.length === 0 ? (
						<div className="py-8 text-center">
							<Users className="mx-auto mb-4 h-12 w-12 text-ink-soft/60" aria-hidden />
							<p className="text-sm text-ink-soft">{copy.empty}</p>
						</div>
					) : (
						<ul className="space-y-1">
							{people.map((person) => (
								<li key={person.id} className="flex items-center justify-between gap-3">
									<IntentLink href={`/profile/${person.public_id || person.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-[3px] p-2 hover:bg-muted">
										<Avatar className="h-12 w-12 border">
											<AvatarImage src={person.avatar_url || undefined} alt="" />
											<AvatarFallback className="bg-border text-ink-soft">{person.username?.charAt(0) || "?"}</AvatarFallback>
										</Avatar>
										<span className="min-w-0">
											<span className="block truncate text-[15px] font-semibold text-ink">{person.username}</span>
											<span className="block text-[13px] text-ink-soft">
												<RelativeTime iso={person.followed_at} />
											</span>
										</span>
									</IntentLink>
									{currentUserId && person.id !== currentUserId && <FollowButton userId={person.id} initialIsFollowing={person.viewer_follows} />}
								</li>
							))}
						</ul>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
