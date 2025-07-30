"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useRouter, usePathname } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Grid, List, Edit, LogOut, Calendar, Users, BookOpen } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import FollowButton from "@/components/items/FollowButton"
import PostCard from "@/components/items/PostCard"
import FollowersModal from "@/components/profile/FollowersModal"
import FollowingModal from "@/components/profile/FollowingModal"

import { useSessionStore } from "@/store/sessionStore"
import { useFollowStore } from "@/store/followStore" // 🚀 업계 표준: 글로벌 팔로우 상태
import useSWR from "swr"
import type { Item } from "@/types/item"


interface UserProfile {
	id: string
	username: string
	display_name: string | null
	avatar_url: string | null
	profile_message: string | null // bio → profile_message로 변경
	created_at?: string
	public_id?: string | null
}

interface FollowCounts {
	followers: number
	following: number
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
				_count_likes:likes(count),
				_count_comments:comments(count)
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

	// 🔄 홈화면과 동일한 좋아요/팔로우 상태 확인
	const itemIds = items.map((item) => item.id)
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
	return items.map((item) => {
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
			// 🚀 업계표준: 데이터 소스에 따른 좋아요/댓글 수 처리 (나의 레시피 패턴)
			likes_count: item.likes_count || (item._count_likes?.[0]?.count ?? 0),
			comments_count: item.comments_count || (item._count_comments?.[0]?.count ?? 0),
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

export default function ProfilePage() {
	const router = useRouter()
	const params = useParams()
	const pathname = usePathname()
	const userId = params.id as string
	const supabase = createSupabaseBrowserClient()

	const [sessionUser, setSessionUser] = useState<User | null>(null)
	const [viewMode, setViewMode] = useState<"grid" | "feed">("grid")


	// Zustand store에서 프로필 정보 가져오기
	const { profile: sessionProfile } = useSessionStore()
	const { isFollowing: globalIsFollowing, setFollowing } = useFollowStore() // 🚀 업계 표준: 글로벌 팔로우 상태

	const [profile, setProfile] = useState<UserProfile | null>(null)
	// 🚀 업계 표준: SWR로 사용자 아이템 관리 (DataManager 연동)
	const { data: userItems, error: userItemsError, mutate: mutateUserItems } = useSWR(
		profile ? `user_items_${profile.id}` : null,
		() => fetchUserItems(profile!.id, sessionUser?.id),
		{
			revalidateOnFocus: false,
			dedupingInterval: 30000, // 30초 중복 방지
		}
	)
	const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null)
	const [citationCount, setCitationCount] = useState<number>(0)
	const [isLoading, setIsLoading] = useState(true)
	const [profileError, setProfileError] = useState<Error | null>(null)
	// 🚀 업계 표준: 지역 상태 제거, 글로벌 상태만 사용
	
	// 모달 상태들
	const [showFollowersModal, setShowFollowersModal] = useState(false)
	const [showFollowingModal, setShowFollowingModal] = useState(false)

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

				const [followCountsData, citationsData, followStatusData] = await Promise.all([
					fetchFollowCounts(profileData.id),
					fetchCitationCount(profileData.id),
					fetchFollowStatus(user?.id || "", profileData.id) // 🚀 업계 표준: 글로벌 스토어 동기화용
				])
				// userItems는 이제 SWR로 자동 관리됨
				setFollowCounts(followCountsData)
				setCitationCount(citationsData)
				
				// 🚀 업계 표준: 글로벌 팔로우 스토어와 동기화
				if (user?.id && user.id !== profileData.id) {
					setFollowing(profileData.id, followStatusData)
				}
			} catch (err) {
				setProfileError(err instanceof Error ? err : new Error("An error occurred"))
				setProfile(null)
				// userItems는 SWR로 관리되므로 직접 설정하지 않음
				setFollowCounts(null)
				setCitationCount(0)
			} finally {
				setIsLoading(false)
			}
		}
		loadAllData()
	}, [userId, supabase.auth])

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
							<DropdownMenuContent align="end" className="w-48">
								<DropdownMenuItem onSelect={() => router.push(`/profile/${userId}/edit`)} className="cursor-pointer hover:bg-gray-300">
									<Edit className="mr-2 h-4 w-4" /> 프로필 수정
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={handleLogout} className="cursor-pointer hover:bg-gray-300">
									<LogOut className="mr-2 h-4 w-4" /> 로그아웃
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}

				<div className="max-w-4xl mx-auto px-4 py-8">
					<div className="flex flex-col md:flex-row items-center md:items-start gap-8">
						{/* Profile Image */}
						<div className="flex-shrink-0">
							<Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-gray-200">
								<AvatarImage src={currentAvatarUrl || undefined} className="object-cover" />
								<AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-orange-400 to-orange-600 text-white">{profile?.display_name?.charAt(0) || profile?.username?.charAt(0) || "U"}</AvatarFallback>
							</Avatar>
						</div>

						{/* Profile Info */}
						<div className="flex-1 text-center md:text-left">
							<div className="flex flex-col md:flex-row items-center gap-4 mb-4">
								<h1 className="text-2xl font-light">{profile?.username}</h1>
								{/* 🚀 업계 표준: 글로벌 상태만 사용하는 팔로우 버튼 */}
								{!isOwner && <FollowButton userId={profile!.id} />}
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
								{profile?.display_name && <div className="font-semibold">{profile.display_name}</div>}
								{profile?.profile_message && <div className="text-sm text-gray-700 whitespace-pre-wrap">{profile.profile_message}</div>}

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
								{userItems.map((item) => {
									const isRecipe = item.item_type === "recipe"
									const detailUrl = isRecipe ? `/recipes/${item.id}` : `/posts/${item.id}`
									
									return (
										<Link href={detailUrl} key={item.id} className="break-inside-avoid block">
											<div className={`rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 mb-3 sm:mb-4 ${
												isRecipe 
													? "bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 hover:border-orange-300" 
													: "bg-white border border-gray-200 hover:border-gray-300"
											}`}>
												<div className="relative aspect-square">
													{item.image_urls && item.image_urls.length > 0 ? (
														<Image src={item.image_urls[0]} alt={item.title || ''} fill className="object-cover" />
													) : (
														<div className={`w-full h-full flex items-center justify-center ${
															isRecipe 
																? "bg-gradient-to-br from-orange-100 to-orange-200" 
																: "bg-gradient-to-br from-gray-100 to-gray-200"
														}`}>
															<div className="text-center">
																{isRecipe ? (
																	<>
																		<BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mx-auto mb-1 sm:mb-2" />
																		<span className="text-orange-600 font-medium text-xs sm:text-sm">레시피</span>
																	</>
																) : (
																	<>
																		<Users className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 mx-auto mb-1 sm:mb-2" />
																		<span className="text-gray-600 font-medium text-xs sm:text-sm">레시피드</span>
																	</>
																)}
															</div>
														</div>
													)}
													{/* 비공개 표시 */}
													{!item.is_public && (
														<div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
															비공개
														</div>
													)}
												</div>
												<div className="p-2 sm:p-3">
													<h3 className="font-medium text-xs sm:text-sm text-gray-900 line-clamp-2">{item.title || ''}</h3>
												</div>
											</div>
										</Link>
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
