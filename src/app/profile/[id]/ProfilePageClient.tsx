"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"

import { Badge } from "@/components/ui/badge"
import { MoreVertical, Grid, List, Edit, LogOut, Calendar, Users, BookOpen, Heart, MessageCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import FollowButton from "@/components/items/FollowButton"
import PostCard from "@/components/items/PostCard"
import FollowersModal from "@/components/profile/FollowersModal"
import FollowingModal from "@/components/profile/FollowingModal"

import { useSessionStore } from "@/store/sessionStore"
import { useFollowStore } from "@/store/followStore" // 🚀 업계 표준: 글로벌 팔로우 상태
import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import { cacheManager } from "@/lib/unified-cache-manager"
import { useNavigation } from "@/hooks/useNavigation"
import useSWR from "swr"
import type { Item } from "@/types/item"
import { getCommentCountConcurrencySafe } from "@/utils/concurrency-helpers"

// 🚀 개선된 프로필 그리드 오버레이 컴포넌트
interface ProfileGridOverlayProps {
	item: Item
	sessionUser: User | null
}

function ProfileGridOverlay({ item, sessionUser }: ProfileGridOverlayProps) {
	const router = useRouter()
	const { createLinkWithOrigin } = useNavigation()
	
	// 🚀 SSA 기반 캐시 연동 (토스식 단순화)
	const fallbackItem = {
		...item,
		likes_count: item.likes_count || 0,
		comments_count: item.comments_count || 0,
		is_liked: item.is_liked || false
	}
	const cachedItem = useSSAItemCache(item.item_id, fallbackItem)
	const stableItemId = item.item_id || item.id
	
	// 🎉 토스식 애니메이션 상태 관리
	const [showHeartAnimation, setShowHeartAnimation] = useState(false)
	const [isTouching, setIsTouching] = useState(false)
	
	// 🎯 클릭 타이머 상태 (단일/더블 클릭 구분)
	const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null)
	
	// 🧹 컴포넌트 언마운트 시 타이머 정리
	useEffect(() => {
		return () => {
			if (clickTimer) {
				clearTimeout(clickTimer);
			}
		};
	}, [clickTimer]);
	
	return (
		<>
			{/* 🎯 토스식 미니멀 접근: 핵심만 남기고 모두 제거 */}
			
			{/* 📊 사용자가 정말 필요한 정보만 - 극도로 절제된 표시 */}
			{cachedItem.is_liked && (
				<div className="absolute top-2 right-2 z-30">
					<div className="w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
						<Heart className="w-3 h-3 fill-red-500 text-red-500" />
					</div>
				</div>
			)}
			
			{/* 🎉 토스식 좋아요 애니메이션 (React 상태 기반) */}
			{showHeartAnimation && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
					<Heart className="w-12 h-12 fill-red-500 text-red-500 animate-ping" />
				</div>
			)}
			
			{/* 🎨 터치 시 어두운 오버레이 - 이미지 위에 확실히 표시 */}
			{isTouching && (
				<div className="absolute inset-0 bg-black/30 z-10" />
			)}

			{/* 🚀 토스 철학: 스마트 클릭 처리 (단일클릭=상세페이지, 더블클릭=좋아요) */}
		<div 
			className="absolute inset-0 z-20 cursor-pointer select-none"
			onTouchStart={() => setIsTouching(true)}
			onTouchEnd={() => setIsTouching(false)}
			onTouchCancel={() => setIsTouching(false)}
			onMouseDown={(e) => {
				e.preventDefault();
				setIsTouching(true);
			}}
			onMouseUp={(e) => {
				e.preventDefault();
				setIsTouching(false);
			}}
			onMouseLeave={(e) => {
				e.preventDefault();
				setIsTouching(false);
			}}
			onClick={async (e) => {
				e.preventDefault();
				e.stopPropagation();
				
				// 기존 타이머가 있으면 더블클릭으로 처리
				if (clickTimer) {
					clearTimeout(clickTimer);
					setClickTimer(null);
					
					// 🎯 더블클릭 - 좋아요 처리
					if (!sessionUser?.id) return;
					
					// 🎯 햅틱 피드백 (모바일에서)
					if (navigator.vibrate) {
						navigator.vibrate(50);
					}
					
					try {
						const newHasLiked = !cachedItem.is_liked;
						await cacheManager.like(stableItemId, sessionUser.id, newHasLiked, cachedItem);
						
						// 🎉 토스식 마이크로 인터랙션 (React 상태 기반 안전한 애니메이션)
						if (newHasLiked) {
							setShowHeartAnimation(true);
							setTimeout(() => setShowHeartAnimation(false), 600);
						}
					} catch (error) {
						console.error('❌ 좋아요 처리 실패:', error);
					}
				} else {
					// 🎯 단일클릭 - 상세페이지 이동 (300ms 후)
					const timer = setTimeout(() => {
						const isRecipe = item.item_type === "recipe";
						const baseUrl = isRecipe ? `/recipes/${item.id}` : `/posts/${item.id}`;
						const detailUrl = createLinkWithOrigin(baseUrl);
						router.push(detailUrl);
						setClickTimer(null);
					}, 300);
					
					setClickTimer(timer);
				}
			}}
		/>
			
			{/* 📱 토스식 정보 밀도: 이미지 위에 명확한 통계 표시 */}
			{(cachedItem.likes_count > 0 || cachedItem.comments_count > 0) && (
				<div className="absolute bottom-2 right-2 z-30">
					<div className="bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
						{cachedItem.likes_count > 0 && (
							<div className="flex items-center gap-1">
								<Heart className="w-3 h-3 fill-red-500 text-red-500" />
								<span className="text-white text-xs font-medium">
									{cachedItem.likes_count}
								</span>
							</div>
						)}
						{cachedItem.likes_count > 0 && cachedItem.comments_count > 0 && (
							<span className="text-white/40 text-xs">|</span>
						)}
						{cachedItem.comments_count > 0 && (
							<div className="flex items-center gap-1">
								<MessageCircle className="w-3 h-3 text-white/70" />
								<span className="text-white/80 text-xs">
									{cachedItem.comments_count}
								</span>
							</div>
						)}
					</div>
				</div>
			)}
		</>
	)
}

interface UserProfile {
	id: string
	username: string
	display_name: string | null
	avatar_url: string | null
	profile_message: string | null // bio → profile_message로 변경
	created_at?: string
	public_id?: string | null
}

// --- 데이터 페칭 함수들 ---
const fetchProfile = async (identifier: string) => {
	if (!identifier) {
		throw new Error("Profile identifier is required.")
	}
	const supabase = createSupabaseBrowserClient()
	// Check if identifier is a UUID
	const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)

	const column = isUUID ? "id" : "public_id"

	const { data, error } = await supabase.from("profiles").select("*").eq(column, identifier).single()

	if (error) {
		// If it was a UUID and it failed, maybe it's a public_id that looks like a UUID? Unlikely.
		// For now, just throw the error.
		throw new Error(error.message)
	}
	if (!data) {
		throw new Error("Profile not found")
	}
	return data as UserProfile
}

const fetchUserItems = async (userId: string, currentUserId?: string) => {
	const supabase = createSupabaseBrowserClient()

	// 🚀 업계표준 Privacy Logic: 본인/타인 구분하여 다른 데이터 소스 사용
	let query
	
	if (currentUserId === userId) {
		// 🔒 본인 프로필: items 테이블 직접 사용하여 비공개 게시물도 포함
		// 🚀 홈 피드와 동일한 정확한 댓글 수 계산 방식 사용
		query = supabase
			.from("items")
			.select(`
				*,
				profiles!user_id (
					username,
					display_name,
					avatar_url,
					public_id
				),
				likes_count:likes(count)
			`)
			.eq("user_id", userId)
			.in("item_type", ["recipe", "post"])
			.order("created_at", { ascending: false })
	} else {
		// 🌍 타인 프로필: optimized_feed_view 사용 (공개 게시물만)
		query = supabase
			.from("optimized_feed_view")
			.select(`
				*,
				profiles!user_id (
					username,
					display_name,
					avatar_url,
					public_id
				)
			`)
			.eq("user_id", userId)
			.in("item_type", ["recipe", "post"])
			.eq("is_public", true) // 타인에게는 공개 게시물만
			.order("created_at", { ascending: false })
	}

	const { data: items, error } = await query
	if (error) throw new Error(error.message)
	if (!items || items.length === 0) return []

	// 🚀 정확한 댓글 수 계산 (본인 프로필의 경우에만)
	const itemsWithAccurateComments = currentUserId === userId 
		? await Promise.all(items.map(async (item) => {
			const accurateCommentsCount = await getCommentCountConcurrencySafe(item.id)
			return { ...item, accurate_comments_count: accurateCommentsCount }
		}))
		: items

	// 🔄 홈화면과 동일한 좋아요/팔로우 상태 확인
	const itemIds = itemsWithAccurateComments.map((item) => item.id)
	const userLikesMap = new Map<string, boolean>()
	const userFollowsMap = new Map<string, boolean>()

	if (currentUserId && currentUserId !== "guest") {
		// 좋아요 상태 확인
		const { data: userLikes } = await supabase
			.from("likes")
			.select("item_id")
			.eq("user_id", currentUserId)
			.in("item_id", itemIds)

		userLikes?.forEach((like) => {
			userLikesMap.set(like.item_id, true)
		})

		// 팔로우 상태 확인 (프로필 주인과 현재 사용자가 다른 경우에만)
		if (currentUserId !== userId) {
			const { data: followStatus } = await supabase
				.from("follows")
				.select("following_id")
				.eq("follower_id", currentUserId)
				.eq("following_id", userId)
				.single()

			if (followStatus) {
				userFollowsMap.set(userId, true)
			}
		}
	}

	// 🎯 홈화면과 동일한 Item 형태로 변환
	return itemsWithAccurateComments.map((item) => {
		const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
		const userLikeStatus = userLikesMap.get(item.id)
		const isLikedValue = currentUserId && currentUserId !== "guest" 
			? (userLikeStatus !== undefined ? userLikeStatus : false)
			: false

		return {
			id: item.id,
			item_id: item.id,
			user_id: item.user_id,
			item_type: item.item_type as "post" | "recipe",
			created_at: item.created_at,
			is_public: item.is_public,
			display_name: profileData?.display_name || item.display_name || null,
			username: profileData?.username || item.username || null,
			avatar_url: profileData?.avatar_url || item.avatar_url || null,
			user_public_id: profileData?.public_id || item.user_public_id || null,
			user_email: null,
			title: item.title,
			content: item.content,
			description: item.description,
			image_urls: item.image_urls,
			thumbnail_index: item.thumbnail_index ?? 0, // 🖼️ 썸네일 인덱스 추가
			tags: item.tags,
			color_label: item.color_label,
			servings: item.servings,
			cooking_time_minutes: item.cooking_time_minutes,
			recipe_id: item.recipe_id,
			cited_recipe_ids: item.cited_recipe_ids,
					// 🚀 홈 피드와 동일한 정확한 좋아요/댓글 수 처리
		likes_count: currentUserId === userId 
			? (item.likes_count?.[0]?.count ?? 0)   // 본인 프로필: items 테이블 집계 결과
			: (item.likes_count || 0),              // 타인 프로필: optimized_feed_view 결과
		comments_count: currentUserId === userId 
			? ('accurate_comments_count' in item ? (item as { accurate_comments_count: number }).accurate_comments_count : 0)  // 본인 프로필: 정확한 댓글 수 (삭제된 댓글 제외)
			: (item.comments_count || 0),                   // 타인 프로필: optimized_feed_view 결과 (이미 삭제된 댓글 제외)
			view_count: 0,
			is_liked: isLikedValue,
			is_following: userFollowsMap.get(userId) || false,
		}
	})
}

const fetchFollowCounts = async (userId: string) => {
	const supabase = createSupabaseBrowserClient()
	const { count: followersCount } = await supabase.from("follows").select("id", { count: "exact" }).eq("following_id", userId)
	const { count: followingCount } = await supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", userId)
	return { followers: followersCount || 0, following: followingCount || 0 }
}

// 팔로우 상태 확인
const fetchFollowStatus = async (currentUserId: string, targetUserId: string) => {
	if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
		return false
	}
	
	const supabase = createSupabaseBrowserClient()
	const { data, error } = await supabase
		.from("follows")
		.select("id")
		.eq("follower_id", currentUserId)
		.eq("following_id", targetUserId)
		.single()
	
	if (error && error.code !== "PGRST116") { // PGRST116 = no rows found
		console.error("Error checking follow status:", error)
		return false
	}
	
	return !!data
}

// 참고레시피로 인용된 횟수 계산
const fetchCitationCount = async (userId: string) => {
	const supabase = createSupabaseBrowserClient()
	
	// 1. 먼저 이 사용자의 모든 레시피 ID 가져오기
	const { data: userRecipes, error: recipesError } = await supabase
		.from("items")
		.select("id")
		.eq("user_id", userId)
		.eq("item_type", "recipe")
	
	if (recipesError) {
		console.error("Error fetching user recipes:", recipesError)
		return 0
	}
	
	if (!userRecipes || userRecipes.length === 0) {
		return 0
	}
	
	const userRecipeIds = userRecipes.map(recipe => recipe.id)
	
	// 2. cited_recipe_ids에서 이 사용자의 레시피가 포함된 아이템들 찾기
	const { data: citingItems, error: citingError } = await supabase
		.from("items")
		.select("cited_recipe_ids")
		.not("cited_recipe_ids", "is", null) // cited_recipe_ids가 null이 아닌 것만
	
	if (citingError) {
		console.error("Error fetching citing items:", citingError)
		return 0
	}
	
	// 3. 클라이언트에서 카운트 계산
	let totalCitations = 0
	
	citingItems?.forEach(item => {
		if (item.cited_recipe_ids && Array.isArray(item.cited_recipe_ids)) {
			// 이 아이템의 cited_recipe_ids에 사용자의 레시피 ID가 포함된 개수 계산
			const matchingCount = item.cited_recipe_ids.filter(citedId => 
				userRecipeIds.includes(citedId)
			).length
			totalCitations += matchingCount
		}
	})
	
	return totalCitations
}

interface ProfilePageClientProps {
	params: { id: string }
}

export default function ProfilePageClient({ params }: ProfilePageClientProps) {
	const router = useRouter()
	const userId = params.id
	const supabase = createSupabaseBrowserClient()

	// 🧭 Smart Navigation: 이 페이지를 거쳐간 navigation history 추적
	useNavigation({ trackHistory: true })

	const [sessionUser, setSessionUser] = useState<User | null>(null)
	const [viewMode, setViewMode] = useState<"grid" | "feed">("grid")

	// Zustand store에서 프로필 정보 가져오기
	const { profile: sessionProfile } = useSessionStore()
	const { setFollowing, isFollowing: getIsFollowing } = useFollowStore() // 🚀 업계 표준: 글로벌 팔로우 상태

	const [profile, setProfile] = useState<UserProfile | null>(null)
	// 🚀 업계 표준: SWR로 사용자 아이템 관리 (DataManager 연동)
	const { data: userItems } = useSWR(
		profile ? `user_items_${profile.id}` : null,
		() => fetchUserItems(profile!.id, sessionUser?.id),
		{
			revalidateOnFocus: false,
			dedupingInterval: 30000, // 30초 중복 방지
		}
	)
	// 🚀 SSA 표준: 팔로우 수도 SWR로 관리하여 실시간 캐시 무효화 지원
	const { data: followCounts } = useSWR(
		profile ? `follow_counts_${profile.id}` : null,
		() => fetchFollowCounts(profile!.id),
		{
			revalidateOnFocus: false,
			dedupingInterval: 10000, // 10초 중복 방지
		}
	)
	const [citationCount, setCitationCount] = useState<number>(0)
	const [isLoading, setIsLoading] = useState(true)
	const [profileError, setProfileError] = useState<Error | null>(null)
	// 🚀 업계 표준: 지역 상태 제거, 글로벌 상태만 사용
	
	// 모달 상태들
	const [showFollowersModal, setShowFollowersModal] = useState(false)
	const [showFollowingModal, setShowFollowingModal] = useState(false)
	
	// 현재 팔로우 상태 (글로벌 스토어에서)
	const isFollowing = profile ? getIsFollowing(profile.id) : false

	useEffect(() => {
		const loadAllData = async () => {
			if (!userId) return
			setIsLoading(true)
			setProfileError(null)
			try {
				// 현재 사용자 정보 가져오기
				const {
					data: { user },
				} = await supabase.auth.getUser()

				const profileData = await fetchProfile(userId)
				setProfile(profileData)

				const [citationsData, followStatusData] = await Promise.all([
					fetchCitationCount(profileData.id),
					fetchFollowStatus(user?.id || "", profileData.id) // 🚀 업계 표준: 글로벌 스토어 동기화용
				])
				// userItems와 followCounts는 이제 SWR로 자동 관리됨
				setCitationCount(citationsData)
				
				// 🚀 업계 표준: 글로벌 팔로우 스토어와 동기화
				if (user?.id && user.id !== profileData.id) {
					setFollowing(profileData.id, followStatusData)
				}
			} catch (err) {
				setProfileError(err instanceof Error ? err : new Error("An error occurred"))
				setProfile(null)
				// userItems와 followCounts는 SWR로 관리되므로 직접 설정하지 않음
				setCitationCount(0)
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

	// 🚀 Optimistic Updates 시스템에서는 복잡한 새로고침 등록 로직 불필요
	// 데이터는 SWR과 실시간 동기화를 통해 자동으로 최신 상태 유지

	const isOwner = sessionUser?.id === profile?.id

	const handleLogout = async () => {
		await supabase.auth.signOut()
		// SPA 라우팅 대신 새로고침을 통한 홈 이동으로 모든 상태 초기화
		window.location.href = "/"
	}

	// 현재 프로필이 세션 사용자와 같으면 최신 아바터 URL 사용
	const currentAvatarUrl = isOwner && sessionProfile?.avatar_url ? sessionProfile.avatar_url : profile?.avatar_url

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50">
				{/* Profile Header Skeleton */}
				<div className="bg-white">
					<div className="max-w-4xl mx-auto px-4 py-8">
						<div className="flex flex-col md:flex-row items-center md:items-start gap-8">
							{/* Profile Image Skeleton */}
							<div className="flex-shrink-0">
								<div className="w-32 h-32 md:w-40 md:h-40 bg-gray-200 rounded-full animate-pulse border-4 border-gray-200"></div>
							</div>

							{/* Profile Info Skeleton */}
							<div className="flex-1 text-center md:text-left">
								<div className="flex flex-col md:flex-row items-center gap-4 mb-4">
									<div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
									<div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
								</div>

								{/* Stats Skeleton */}
								<div className="flex justify-center md:justify-start gap-2 sm:gap-3 md:gap-6 mb-4 px-2">
									<div className="text-center flex-1 max-w-[70px]">
										<div className="h-6 bg-gray-200 rounded w-8 animate-pulse mb-2 mx-auto"></div>
										<div className="h-3 bg-gray-200 rounded w-12 animate-pulse mx-auto"></div>
									</div>
									<div className="text-center flex-1 max-w-[70px]">
										<div className="h-6 bg-gray-200 rounded w-8 animate-pulse mb-2 mx-auto"></div>
										<div className="h-3 bg-gray-200 rounded w-12 animate-pulse mx-auto"></div>
									</div>
									<div className="text-center flex-1 max-w-[70px]">
										<div className="h-6 bg-gray-200 rounded w-8 animate-pulse mb-2 mx-auto"></div>
										<div className="h-3 bg-gray-200 rounded w-12 animate-pulse mx-auto"></div>
									</div>
									<div className="text-center flex-1 max-w-[70px]">
										<div className="h-6 bg-gray-200 rounded w-8 animate-pulse mb-2 mx-auto"></div>
										<div className="h-3 bg-gray-200 rounded w-12 animate-pulse mx-auto"></div>
									</div>
								</div>

								{/* Bio Skeleton */}
								<div className="space-y-2">
									<div className="h-5 bg-gray-200 rounded w-48 animate-pulse"></div>
									<div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
									<div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
								</div>
							</div>
						</div>
					</div>

					{/* Navigation Tabs Skeleton */}
					<div className="border-t">
						<div className="max-w-4xl mx-auto px-4">
							<div className="flex justify-center">
								<div className="h-12 bg-gray-200 rounded w-20 animate-pulse mx-2"></div>
								<div className="h-12 bg-gray-200 rounded w-20 animate-pulse mx-2"></div>
							</div>
						</div>
					</div>
				</div>

				{/* Content Skeleton */}
				<div className="max-w-4xl mx-auto px-4 py-6">
					<div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
						{[...Array(6)].map((_, i) => (
							<div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm mb-4 break-inside-avoid">
								<div className="aspect-square bg-gray-200 animate-pulse"></div>
								<div className="p-3">
									<div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		)
	}

	if (profileError) {
		return <div className="text-center p-8">사용자를 찾을 수 없습니다.</div>
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Profile Header - Instagram Style */}
			<div className="bg-white relative">
				{/* 점3버튼을 우측 상단으로 이동 */}
				{isOwner && (
					<div className="absolute top-4 right-4 z-10">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90">
									<MoreVertical className="h-5 w-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-auto min-w-[120px]">
								<DropdownMenuItem onSelect={() => router.push(`/profile/${userId}/edit`)} className="cursor-pointer relative flex items-center justify-start px-3 py-2">
									<Edit className="h-4 w-4 flex-shrink-0" />
									<span className="flex-1 text-center">프로필 수정</span>
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={handleLogout} className="cursor-pointer relative flex items-center justify-start px-3 py-2 text-red-600">
									<LogOut className="h-4 w-4 flex-shrink-0" />
									<span className="flex-1 text-center">로그아웃</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}

				<div className="max-w-4xl mx-auto px-4 py-8">
					<div className="flex flex-col md:flex-row items-center md:items-start gap-8">
						{/* Profile Image - LCP 최적화를 위해 Next.js Image 사용 */}
						<div className="flex-shrink-0">
							<div className="relative w-32 h-32 md:w-40 md:h-40 border-4 border-gray-200 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600">
								{currentAvatarUrl && currentAvatarUrl !== "/icon-only.svg" ? (
									<Image
										src={currentAvatarUrl}
										alt={`${profile?.username || 'User'} 프로필 이미지`}
										fill
										priority
										className="object-cover"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center">
										<span className="text-4xl font-bold text-white">
											{profile?.username?.charAt(0) || "U"}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Profile Info */}
						<div className="flex-1 text-center md:text-left">
							<div className="flex flex-col md:flex-row items-center gap-4 mb-4">
								<h1 className="text-2xl font-light">{profile?.username}</h1>
								{/* 🚀 업계 표준: 글로벌 상태와 초기값을 모두 활용하는 팔로우 버튼 */}
								{!isOwner && profile && (
									<FollowButton 
										userId={profile.id} 
										initialIsFollowing={isFollowing}
									/>
								)}
							</div>

							{/* Stats */}
							<div className="flex justify-center md:justify-start gap-2 sm:gap-3 md:gap-6 mb-4 px-2">
								<div className="text-center flex-1 max-w-[70px]">
									<div className="font-semibold text-lg">{userItems?.length || 0}</div>
									<div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">게시물</div>
								</div>
								<div 
									className="text-center cursor-pointer hover:opacity-80 transition-opacity flex-1 max-w-[70px]"
									onClick={() => setShowFollowersModal(true)}
								>
									<div className="font-semibold text-lg">{followCounts?.followers || 0}</div>
									<div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">팔로워</div>
								</div>
								<div 
									className="text-center cursor-pointer hover:opacity-80 transition-opacity flex-1 max-w-[70px]"
									onClick={() => setShowFollowingModal(true)}
								>
									<div className="font-semibold text-lg">{followCounts?.following || 0}</div>
									<div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">팔로잉</div>
								</div>
								<div className="text-center flex-1 max-w-[70px]">
									<div className="font-semibold text-lg text-orange-600">{citationCount}</div>
									<div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">인용</div>
								</div>
							</div>

							{/* Profile Message and Info */}
							<div className="space-y-2">
								{profile?.profile_message && (
									<div className="text-sm text-gray-700 leading-relaxed break-words hyphens-auto max-w-full">
										<p className="whitespace-pre-wrap">{profile.profile_message}</p>
									</div>
								)}

								{/* 가입일과 레시피 개수 - 모바일 중앙정렬, 데스크톱 왼쪽정렬 */}
								<div className="flex items-center justify-center md:justify-start flex-nowrap gap-2 text-sm text-gray-500 overflow-hidden max-w-full">
									<div className="flex items-center gap-1 whitespace-nowrap flex-shrink-0">
										<Calendar className="w-4 h-4 flex-shrink-0" />
										<span className="whitespace-nowrap text-xs">
											{profile?.created_at
												? new Date(profile.created_at)
														.toLocaleDateString("ko-KR", {
															year: "2-digit",
															month: "2-digit",
															day: "2-digit",
														})
														.replace(/\./g, ".")
												: "N/A"}
										</span>
									</div>
									<div className="text-gray-300 select-none flex-shrink-0" aria-hidden="true">
										•
									</div>
									<Badge variant="secondary" className="flex items-center gap-1 whitespace-nowrap flex-shrink-0 text-xs px-2 py-1">
										<BookOpen className="w-3 h-3 flex-shrink-0" />
										<span className="whitespace-nowrap">레시피 {userItems?.filter(item => item.item_type === 'recipe').length || 0}개</span>
									</Badge>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="border-t">
					<div className="max-w-4xl mx-auto">
						<div className="flex w-full">
							<Button variant="ghost" onClick={() => setViewMode("grid")} className={`flex-1 py-3 rounded-none border-t-2 ${viewMode === "grid" ? "border-black" : "border-transparent"} hover:bg-gray-50`}>
								<Grid className="w-4 h-4 mr-2" />
								<span className="hidden sm:inline">그리드</span>
							</Button>
							<Button variant="ghost" onClick={() => setViewMode("feed")} className={`flex-1 py-3 rounded-none border-t-2 ${viewMode === "feed" ? "border-black" : "border-transparent"} hover:bg-gray-50`}>
								<List className="w-4 h-4 mr-2" />
								<span className="hidden sm:inline">피드</span>
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Content Area */}
			<div className="max-w-4xl mx-auto px-2 py-2">
				{viewMode === "grid" ? (
					<>
						{/* Responsive Grid Layout - 모든 화면에서 2열 통일 (레시피북과 일관성) */}
						{userItems && userItems.length > 0 ? (
							<div className="columns-2 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
								{userItems.map((item, index) => {
									const isRecipe = item.item_type === "recipe"
									// 🚀 LCP 최적화: 첫 번째 행의 이미지들에 priority 적용 (첫 4개)
									const isPriorityImage = index < 4
									
									return (
										<div key={item.id} className="break-inside-avoid mb-3 sm:mb-4">
											<div className={`rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group relative select-none ${
												isRecipe 
													? "bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 hover:border-orange-300" 
													: "bg-white border border-gray-200 hover:border-gray-300"
											}`}>
																							{/* 🔗 메인 클릭 영역 (오버레이에서 처리) */}
											<div className="block">
													<div className="relative aspect-square cursor-pointer overflow-hidden">
														{item.image_urls && item.image_urls.length > 0 ? (
															<Image 
																src={item.image_urls[item.thumbnail_index || 0]} 
																alt={item.title || ''} 
																fill 
																priority={isPriorityImage}
																className="object-cover group-hover:scale-105 transition-transform duration-300" 
															/>
														) : (
															<div className={`w-full h-full flex items-center justify-center transition-all duration-300 ${
																isRecipe 
																	? "bg-gradient-to-br from-orange-100 to-orange-200 group-hover:from-orange-200 group-hover:to-orange-300" 
																	: "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-gray-200 group-hover:to-gray-300"
															}`}>
																<div className="text-center">
																	{isRecipe ? (
																		<>
																			<BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300" />
																			<span className="text-orange-600 font-medium text-xs sm:text-sm">레시피</span>
																		</>
																	) : (
																		<>
																			<Users className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300" />
																			<span className="text-gray-600 font-medium text-xs sm:text-sm">레시피드</span>
																		</>
																	)}
																</div>
															</div>
														)}
														
														{/* 호버 시 어두운 오버레이 */}
														<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 pointer-events-none" />
														
														{/* 비공개 표시 */}
														{!item.is_public && (
															<div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
																비공개
															</div>
														)}
														
														{/* 🚀 SSA 기반 상호작용 요소들 - 이미지 영역에만 적용 */}
														<ProfileGridOverlay 
															item={item} 
															sessionUser={sessionUser} 
														/>
													</div>
													
													<div className="p-2 sm:p-3">
														<h3 className="font-medium text-xs sm:text-sm text-gray-900 line-clamp-2 group-hover:text-orange-600 transition-colors duration-300 select-none">{item.title || ''}</h3>
													</div>
												</div>
											</div>
										</div>
									)
								})}
							</div>
						) : (
							<div className="text-center py-16">
								<BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
								<h3 className="text-lg font-medium text-gray-900 mb-2">아직 레시피가 없습니다</h3>
								<p className="text-gray-500">{isOwner ? "첫 번째 레시피를 작성해보세요!" : "곧 멋진 레시피들이 올라올 예정입니다."}</p>
							</div>
						)}
					</>
				) : (
					<>
						{/* Feed Style Layout - 홈화면과 동일한 구조 */}
						{userItems && userItems.length > 0 ? (
							<div className="space-y-5">
								{userItems.map((item) => (
									<div key={item.id || item.item_id} data-item-id={item.id || item.item_id}>
										<PostCard 
											item={item} 
											currentUser={sessionUser}
										/>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-16">
								<Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
								<h3 className="text-lg font-medium text-gray-900 mb-2">아직 레시피가 없습니다</h3>
								<p className="text-gray-500">{isOwner ? "첫 번째 레시피를 작성해보세요!" : "곧 멋진 레시피들이 올라올 예정입니다."}</p>
							</div>
						)}
					</>
				)}
			</div>

			{/* Modals */}
			<FollowersModal 
				isOpen={showFollowersModal}
				onClose={() => setShowFollowersModal(false)}
				userId={profile?.id || ""}
				currentUserId={sessionUser?.id || null}
			/>
			
			<FollowingModal 
				isOpen={showFollowingModal}
				onClose={() => setShowFollowingModal(false)}
				userId={profile?.id || ""}
				currentUserId={sessionUser?.id || null}
			/>
		</div>
	)
}