"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useRouter, usePathname } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MoreVertical, Grid, List, Edit, LogOut, Calendar, Users, BookOpen } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import FollowButton from "@/components/feed/FollowButton"
import PostCard from "@/components/feed/PostCard"
import { useRefresh } from "@/contexts/RefreshContext"
import { useSessionStore } from "@/store/sessionStore"

// 타입 정의는 유지
interface Recipe {
	id: string
	title: string
	image_urls: string[] | null
}
interface UserProfile {
	id: string
	username: string
	display_name: string | null
	avatar_url: string | null
	bio: string | null
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

const fetchRecipes = async (userId: string, currentUserId?: string) => {
	const supabase = createSupabaseBrowserClient()

	let query = supabase.from("items").select("id, title, image_urls").eq("user_id", userId).eq("item_type", "recipe").order("created_at", { ascending: false })

	// 본인이 아닌 다른 사용자의 프로필을 볼 때는 공개 레시피만 표시
	if (currentUserId !== userId) {
		query = query.eq("is_public", true)
	}

	const { data, error } = await query
	if (error) throw new Error(error.message)
	return data as Recipe[]
}

const fetchFollowCounts = async (userId: string) => {
	const supabase = createSupabaseBrowserClient()
	const { count: followersCount } = await supabase.from("follows").select("id", { count: "exact" }).eq("following_id", userId)
	const { count: followingCount } = await supabase.from("follows").select("id", { count: "exact" }).eq("follower_id", userId)
	return { followers: followersCount || 0, following: followingCount || 0 }
}

export default function ProfilePage() {
	const router = useRouter()
	const params = useParams()
	const pathname = usePathname()
	const userId = params.id as string
	const supabase = createSupabaseBrowserClient()

	const [sessionUser, setSessionUser] = useState<{ id: string } | null>(null)
	const [viewMode, setViewMode] = useState<"grid" | "feed">("grid")
	const { registerRefreshFunction, unregisterRefreshFunction } = useRefresh()

	// Zustand store에서 프로필 정보 가져오기
	const { profile: sessionProfile } = useSessionStore()

	const [profile, setProfile] = useState<UserProfile | null>(null)
	const [recipes, setRecipes] = useState<Recipe[] | null>(null)
	const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [profileError, setProfileError] = useState<Error | null>(null)

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

				const [recipesData, followCountsData] = await Promise.all([fetchRecipes(profileData.id, user?.id), fetchFollowCounts(profileData.id)])
				setRecipes(recipesData)
				setFollowCounts(followCountsData)
			} catch (err) {
				setProfileError(err instanceof Error ? err : new Error("An error occurred"))
				setProfile(null)
				setRecipes(null)
				setFollowCounts(null)
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

	useEffect(() => {
		const handleRefresh = async () => {
			// Manually re-fetch data for refresh
			setIsLoading(true)
			setProfileError(null)

			try {
				// 현재 사용자 정보 가져오기
				const {
					data: { user },
				} = await supabase.auth.getUser()

				const profileData = await fetchProfile(userId)
				setProfile(profileData)

				const [recipesData, followCountsData] = await Promise.all([fetchRecipes(profileData.id, user?.id), fetchFollowCounts(profileData.id)])
				setRecipes(recipesData)
				setFollowCounts(followCountsData)
			} catch (err) {
				setProfileError(err instanceof Error ? err : new Error("An error occurred"))
				setProfile(null)
				setRecipes(null)
				setFollowCounts(null)
			} finally {
				setIsLoading(false)
			}
		}

		registerRefreshFunction(pathname, handleRefresh)

		return () => {
			unregisterRefreshFunction(pathname)
		}
	}, [pathname, registerRefreshFunction, unregisterRefreshFunction, userId])

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
								<div className="flex justify-center md:justify-start gap-8 mb-4">
									<div className="text-center">
										<div className="h-6 bg-gray-200 rounded w-8 animate-pulse mb-2"></div>
										<div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
									</div>
									<div className="text-center">
										<div className="h-6 bg-gray-200 rounded w-8 animate-pulse mb-2"></div>
										<div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
									</div>
									<div className="text-center">
										<div className="h-6 bg-gray-200 rounded w-8 animate-pulse mb-2"></div>
										<div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
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
								{/* 프로필 편집 버튼 제거, 팔로우 버튼만 유지 */}
								{!isOwner && <FollowButton userId={profile!.id} initialIsFollowing={false} />}
							</div>

							{/* Stats */}
							<div className="flex justify-center md:justify-start gap-8 mb-4">
								<div className="text-center">
									<div className="font-semibold text-lg">{recipes?.length || 0}</div>
									<div className="text-sm text-gray-600">게시물</div>
								</div>
								<div className="text-center">
									<div className="font-semibold text-lg">{followCounts?.followers || 0}</div>
									<div className="text-sm text-gray-600">팔로워</div>
								</div>
								<div className="text-center">
									<div className="font-semibold text-lg">{followCounts?.following || 0}</div>
									<div className="text-sm text-gray-600">팔로잉</div>
								</div>
							</div>

							{/* Bio and Info */}
							<div className="space-y-2">
								{profile?.display_name && <div className="font-semibold">{profile.display_name}</div>}
								{profile?.bio && <div className="text-sm text-gray-700 whitespace-pre-wrap">{profile.bio}</div>}

								{/* 가입일과 레시피 개수 - 모든 해상도에서 일관된 시멘틱 구조 */}
								<div className="flex items-center flex-nowrap gap-2 text-sm text-gray-500 overflow-hidden max-w-full">
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
										<span className="whitespace-nowrap">{recipes?.length || 0}개</span>
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
			<div className="max-w-4xl mx-auto px-4 py-6">
				{viewMode === "grid" ? (
					<>
						{/* Masonry Grid Layout */}
						{recipes && recipes.length > 0 ? (
							<div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
								{recipes.map((recipe) => (
									<Link href={`/recipes/${recipe.id}`} key={recipe.id} className="break-inside-avoid block">
										<div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 mb-4">
											<div className="relative aspect-square">
												{recipe.image_urls && recipe.image_urls.length > 0 ? (
													<Image src={recipe.image_urls[0]} alt={recipe.title} fill className="object-cover" />
												) : (
													<div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
														<div className="text-center">
															<BookOpen className="w-8 h-8 text-orange-500 mx-auto mb-2" />
															<span className="text-orange-600 font-medium text-sm">레시피</span>
														</div>
													</div>
												)}
											</div>
											<div className="p-3">
												<h3 className="font-medium text-sm text-gray-900 line-clamp-2">{recipe.title}</h3>
											</div>
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className="text-center py-16">
								<BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
								<h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없습니다</h3>
								<p className="text-gray-500">{isOwner ? "첫 번째 레시피를 공유해보세요!" : "곧 멋진 레시피들이 올라올 예정입니다."}</p>
							</div>
						)}
					</>
				) : (
					<>
						{/* Feed Style Layout */}
						{recipes && recipes.length > 0 ? (
							<div className="space-y-6">
								{recipes.map((recipe) => {
									// PostCard 형태로 변환하기 위한 데이터 구조 맞춤
									const feedItem = {
										item_id: recipe.id,
										item_type: "recipe" as const,
										content: null,
										title: recipe.title,
										description: null,
										image_urls: recipe.image_urls,
										tags: null,
										created_at: new Date().toISOString(), // 임시
										user_id: profile?.id || "",
										user_public_id: profile?.public_id || null,
										recipe_id: recipe.id,
										display_name: profile?.display_name || null,
										avatar_url: currentAvatarUrl ?? null, // 업데이트된 아바타 URL 사용
										user_email: null,
										likes_count: 0, // 임시
										comments_count: 0, // 임시
										view_count: 0,
										is_following: false,
										is_liked: false, // 임시
									}
									return <PostCard key={recipe.id} item={feedItem} />
								})}
							</div>
						) : (
							<div className="text-center py-16">
								<Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
								<h3 className="text-lg font-medium text-gray-900 mb-2">아직 게시물이 없습니다</h3>
								<p className="text-gray-500">{isOwner ? "첫 번째 레시피를 공유해보세요!" : "곧 멋진 레시피들이 올라올 예정입니다."}</p>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}
