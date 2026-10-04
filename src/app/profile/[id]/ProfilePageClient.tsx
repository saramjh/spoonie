"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "@/shared/lib/navigation"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"

import { MoreVertical, Edit, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import FollowButton from "@/components/items/FollowButton"
import Link from "next/link"
import RecipeCard from "@/features/recipe/components/RecipeCard"
import RecipeCardSkeleton from "@/features/recipe/components/RecipeCardSkeleton"
import { Skeleton } from "@/components/ui/skeleton"
import FollowListModal, { type FollowDirection } from "@/features/profile/components/FollowListModal"

import { useSessionStore } from "@/store/sessionStore"
import { useFollowStore } from "@/features/social/store/followStore"
import { logEvent } from "@/shared/infra/events"
import { cameFrom } from "@/shared/lib/surface"
import useSWR from "swr"
import { fetchProfile, fetchUserItems, fetchFollowCounts, fetchFollowStatus, fetchLineageCounts, type UserProfile } from "@/features/profile/data/profile-repository"
import { IntentLink, Photo, PhotoCount, StateSheet, UnderlineTabs } from "@/components/kit"

interface ProfilePageClientProps {
	params: { id: string }
	// 서버에서 미리 조회한 공개 데이터. 초기 HTML에 프로필 내용을 포함시키고, 마운트 후 로그인 사용자 기준으로 갱신한다.
	initialProfile?: UserProfile | null
	initialItems?: Awaited<ReturnType<typeof fetchUserItems>> | null
	initialFollowCounts?: { followers: number; following: number } | null
}

export default function ProfilePageClient({ params, initialProfile, initialItems, initialFollowCounts }: ProfilePageClientProps) {
	const router = useRouter()
	const userId = params.id
	const supabase = createSupabaseBrowserClient()


	const [sessionUser, setSessionUser] = useState<User | null>(null)
	// 보기 기준은 대상 종류: 레시피(자산) / 레시피드(활동) (DESIGN.md Interface Grammar 2)
	const [tab, setTab] = useState<"recipe" | "post" | null>(null)

	// Zustand store에서 프로필 정보 가져오기
	const { profile: sessionProfile } = useSessionStore()
	const { setFollowing, isFollowing: getIsFollowing } = useFollowStore()

	const [profile, setProfile] = useState<UserProfile | null>(initialProfile ?? null)
	const { data: userItems } = useSWR(
		// 보는 사람이 바뀌면(로그인 확인 후 본인으로 판명) 비공개 글까지 다시 가져온다
		profile ? `user_items_${profile.id}_${sessionUser?.id ?? "guest"}` : null,
		() => fetchUserItems(profile!.id, sessionUser?.id),
		{
			revalidateOnFocus: false,
			dedupingInterval: 30000, // 30초 중복 방지
			fallbackData: initialItems ?? undefined,
			// 미리 만든 공개 페이지의 목록은 비로그인 방문자에게 그대로 쓴다. 로그인 사용자는 본인 비공개 글·내 좋아요 상태를 위해 다시 받는다
			revalidateOnMount: !initialItems || !!sessionUser,
		}
	)
	// 팔로우 mutation 뒤 같은 key를 무효화할 수 있도록 SWR에 둔다.
	const { data: followCounts } = useSWR(
		profile ? `follow_counts_${profile.id}` : null,
		() => fetchFollowCounts(profile!.id),
		{
			revalidateOnFocus: false,
			dedupingInterval: 10000, // 10초 중복 방지
			fallbackData: initialFollowCounts ?? undefined,
			revalidateOnMount: true,
		}
	)
	const { data: lineage } = useSWR(profile ? `lineage_counts_${profile.id}` : null, () => fetchLineageCounts(profile!.id), {
		revalidateOnFocus: false,
		dedupingInterval: 60000,
	})
	const [isLoading, setIsLoading] = useState(!initialProfile)
	const [profileError, setProfileError] = useState<Error | null>(null)
	
	// 모달 상태들
	const [followList, setFollowList] = useState<FollowDirection | null>(null)
	
	// 현재 팔로우 상태 (글로벌 스토어에서)
	const isFollowing = profile ? getIsFollowing(profile.id) : false

	// 서버가 미리 받아 둔 프로필: 값이 바뀌어도 아래 효과를 다시 돌리지 않고, 돌 때의 값을 읽기만 한다
	const readInitialProfile = useEffectEvent(() => initialProfile)

	useEffect(() => {
		const loadAllData = async () => {
			if (!userId) return
			// 서버가 넘긴 프로필이 있으면 스켈레톤으로 덮지 않고 그대로 보여준 채 갱신한다
			if (!readInitialProfile()) setIsLoading(true)
			setProfileError(null)
			try {
				// 현재 사용자 확인과 프로필 조회는 서로 의존하지 않으므로 병렬로 보낸다
				const [
					{
						data: { user },
					},
					profileData,
				] = await Promise.all([supabase.auth.getUser(), readInitialProfile() ?? fetchProfile(userId)])
				setProfile(profileData)

				const followStatusData = await fetchFollowStatus(user?.id || "", profileData.id) // 글로벌 팔로우 스토어 동기화용
				
				// 상세 조회 결과와 전역 팔로우 상태를 맞춘다.
				if (user?.id && user.id !== profileData.id) {
					setFollowing(profileData.id, followStatusData)
				}
			} catch (err) {
				setProfileError(err instanceof Error ? err : new Error("An error occurred"))
				setProfile(null)
			} finally {
				setIsLoading(false)
			}
		}
		loadAllData()
	}, [userId, supabase.auth, setFollowing])

	useEffect(() => {
		const getSessionUser = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser()
			setSessionUser(user)
		}
		getSessionUser()
	}, [supabase.auth])

	// 프로필 방문 기록: 글에서 왔으면 그 글을 함께 남겨 "글 → 작성자 발견"을 잰다. 본인 프로필은 남기지 않는다
	const loggedVisitRef = useRef<string | null>(null)
	useEffect(() => {
		if (!sessionUser?.id || !profile?.id || loggedVisitRef.current === profile.id) return
		loggedVisitRef.current = profile.id
		if (sessionUser.id === profile.id) return
		const from = cameFrom(window.location.pathname)
		logEvent("profile_open", from.itemId, `${from.surface}|${profile.id}`)
	}, [sessionUser?.id, profile?.id])

	// Optimistic Updates 시스템에서는 복잡한 새로고침 등록 로직 불필요
	// 데이터는 SWR과 실시간 동기화를 통해 자동으로 최신 상태 유지

	const isOwner = sessionUser?.id === profile?.id

	const handleLogout = async () => {
		await supabase.auth.signOut()
		// SPA 라우팅 대신 새로고침을 통한 홈 이동으로 모든 상태 초기화
		// 의도한 예외: 로그아웃 뒤에는 화면 이동이 아니라 새로고침으로 홈에 가서 모든 상태(캐시·스토어)를 비운다
		// eslint-disable-next-line @next/next/no-location-assign-relative-destination
		window.location.href = "/"
	}

	// 현재 프로필이 세션 사용자와 같으면 최신 아바터 URL 사용
	const currentAvatarUrl = isOwner && sessionProfile?.avatar_url ? sessionProfile.avatar_url : profile?.avatar_url

	if (isLoading) {
		return (
			<div className="min-h-screen" aria-busy="true">
				<div className="border-b border-border bg-paper px-4 pb-4 pt-5">
					<div className="flex items-start gap-4">
						<Skeleton className="h-[72px] w-[72px] rounded-full" />
						<div className="flex-1 space-y-2 pt-1">
							<Skeleton className="h-6 w-32" />
							<Skeleton className="h-4 w-44" />
						</div>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3 px-3 py-3">
					{[0, 1, 2, 3].map((i) => (
						<RecipeCardSkeleton key={i} />
					))}
				</div>
			</div>
		)
	}

	if (profileError) {
		return (
			<div className="px-3 pt-3">
				<StateSheet title="사용자를 찾을 수 없어요" body="주소가 바뀌었거나 탈퇴한 사용자일 수 있어요." />
			</div>
		)
	}

	const recipes = (userItems || []).filter((item) => item.item_type === "recipe")
	const posts = (userItems || []).filter((item) => item.item_type !== "recipe")
	const activeTab = tab ?? (recipes.length > 0 || posts.length === 0 ? "recipe" : "post")
	const showFollowCounts = profile?.show_follower_count !== false || isOwner
	// 서비스 고유의 지표. 0인 값은 숨긴다 (DESIGN.md Interface Grammar 5)
	const lineageFacts = [
		lineage?.cooked ? `${lineage.cooked}번 만들어짐` : null,
		lineage?.adapted ? `${lineage.adapted}번 이어짐` : null,
		lineage?.referenced ? `${lineage.referenced}번 참고됨` : null,
	].filter(Boolean)

	return (
		<div className="min-h-screen">
			<header className="border-b border-border bg-paper px-4 pb-4 pt-5">
				<div className="flex items-start gap-4">
					<div className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-full bg-border">
						{currentAvatarUrl && currentAvatarUrl !== "/icon-only.svg" ? (
							<Image src={currentAvatarUrl} alt="" fill sizes="72px" priority className="object-cover" />
						) : (
							<span className="flex h-full w-full items-center justify-center text-title text-ink-soft">{profile?.username?.charAt(0) || "?"}</span>
						)}
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center justify-between gap-2">
							<h1 className="truncate text-title text-ink">{profile?.username}</h1>
							{isOwner && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon" className="-mr-2 flex-shrink-0" aria-label="프로필 메뉴">
											<MoreVertical className="h-5 w-5" aria-hidden />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="min-w-[9rem]">
										<DropdownMenuItem onSelect={() => router.push(`/profile/${userId}/edit`)} className="min-h-11 cursor-pointer gap-2">
											<Edit className="h-4 w-4" aria-hidden />
											프로필 수정
										</DropdownMenuItem>
										<DropdownMenuItem onSelect={handleLogout} className="min-h-11 cursor-pointer gap-2">
											<LogOut className="h-4 w-4" aria-hidden />
											로그아웃
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</div>
						<p className="mt-0.5 text-label text-ink">
							레시피 <span className="font-semibold tabular-nums">{recipes.length}</span>
							{lineageFacts.length > 0 && <span className="text-ink-soft"> · {lineageFacts.join(" · ")}</span>}
						</p>
						{showFollowCounts && (
							<p className="mt-0.5 text-meta text-ink-soft">
								<button type="button" onClick={() => setFollowList("followers")} className="py-1 underline-offset-4 hover:underline">
									팔로워 <span className="tabular-nums">{followCounts?.followers || 0}</span>
								</button>
								{" · "}
								<button type="button" onClick={() => setFollowList("following")} className="py-1 underline-offset-4 hover:underline">
									팔로잉 <span className="tabular-nums">{followCounts?.following || 0}</span>
								</button>
							</p>
						)}
					</div>
				</div>

				{profile?.profile_message && <p className="mt-3 whitespace-pre-wrap break-words text-body text-ink">{profile.profile_message}</p>}
				{profile?.show_join_date !== false && profile?.created_at && (
					<p className="mt-2 text-meta text-ink-soft">
						{new Date(profile.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long" })} 가입
					</p>
				)}

				{!isOwner && profile && <FollowButton userId={profile.id} initialIsFollowing={isFollowing} appearance="primary" eventOrigin="profile" className="mt-4 w-full" />}
			</header>

			<UnderlineTabs
				label="작성한 글 종류"
				className="sticky top-0 z-10"
				value={activeTab}
				onChange={setTab}
				items={[
					{ key: "recipe", label: "레시피", count: recipes.length },
					{ key: "post", label: "레시피드", count: posts.length },
				]}
			/>

			<div className="px-3 py-3">
				{activeTab === "recipe" ? (
					recipes.length > 0 ? (
						<div className="grid grid-cols-2 gap-3">
							{recipes.map((item, index) => (
								<RecipeCard key={item.id} item={item} priority={index < 2} showColorLabel={false} />
							))}
						</div>
					) : (
						<StateSheet title={isOwner ? "아직 쓴 레시피가 없어요" : "아직 공개한 레시피가 없어요"} action={isOwner ? <Button asChild><Link href="/recipes/new">레시피 쓰기</Link></Button> : undefined} />
					)
				) : posts.length > 0 ? (
					<ul className="grid grid-cols-3 gap-1">
						{posts.map((item, index) => {
							const thumb = item.image_urls?.[item.thumbnail_index || 0]
							return (
								<li key={item.id}>
									<IntentLink href={`/posts/${item.id}`} className="relative block aspect-square overflow-hidden rounded-[2px] bg-muted" aria-label={item.title || item.content?.slice(0, 30) || "레시피드"}>
										{thumb ? (
											<Photo src={thumb} sizes="(max-width: 448px) 33vw, 150px" priority={index < 3} />
										) : (
											<span className="h-full p-2 text-meta text-ink line-clamp-4">{item.content}</span>
										)}
										<PhotoCount count={item.image_urls?.length || 0} />
										{!item.is_public && <span className="absolute left-1 top-1 rounded-[2px] bg-ink/80 px-1.5 text-micro text-paper">비공개</span>}
									</IntentLink>
								</li>
							)
						})}
					</ul>
				) : (
					<StateSheet title={isOwner ? "아직 남긴 레시피드가 없어요" : "아직 공개한 레시피드가 없어요"} body={isOwner ? "다른 사람의 레시피로 만들었다면 그 레시피 화면의 ‘이 레시피로 만들었어요’로 남겨 보세요." : undefined} />
				)}
			</div>

			{followList && (
				<FollowListModal direction={followList} isOpen onClose={() => setFollowList(null)} userId={profile?.id || ""} currentUserId={sessionUser?.id || null} />
			)}
		</div>
	)
}