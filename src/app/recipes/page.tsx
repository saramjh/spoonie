"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/lib/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Search, SlidersHorizontal, List, Grid, BookUser, ChefHat } from "lucide-react"

import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import useSWRInfinite from "swr/infinite"
import { useSWRConfig } from "swr"
import { useRecipeStore } from "@/store/recipeStore"
import RecipeCard from "@/components/recipe/RecipeCard"
import RecipeCardSkeleton from "@/components/recipe/RecipeCardSkeleton"
import FilterModal from "@/components/recipe/FilterModal"
import RecipeListCard from "@/components/recipe/RecipeListCard"
import type { User } from "@supabase/supabase-js"
import type { Item } from "@/types/item"
import { useToast } from "@/hooks/use-toast"
import { useNavigation } from "@/hooks/useNavigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

type Tab = "my_recipes" | "all_recipes"

const PAGE_SIZE = 12

	const fetcher = async (key: string): Promise<Item[]> => {
	try {
		const supabase = createSupabaseBrowserClient()
		const [, tab, pageIndex, sortBy, sortOrder, searchTerm, filterCategory, filterColorLabel, userId] = key.split("||")

		const from = parseInt(pageIndex) * PAGE_SIZE
		const to = from + PAGE_SIZE - 1

		// ✅ SSA 원칙: 모든 곳에서 정확한 댓글 수 계산
		let query
		if (tab === "my_recipes") {
			// 나의 레시피: 정확한 댓글 수 계산 RPC 함수 사용 (optimized_feed_view와 동일한 로직)
			query = supabase.rpc('get_user_recipes_with_accurate_stats', {
				target_user_id: userId
			})
		} else {
			// 모두의 레시피: 홈 피드와 완전히 동일한 방식
			query = supabase.from("optimized_feed_view").select(`
				*,
				profiles!user_id(display_name, username, avatar_url, public_id)
			`).eq("item_type", "recipe")
		}

	if (tab === "my_recipes") {
		if (!userId) return []
		// RPC 함수는 이미 사용자 필터링 포함

		if (searchTerm) {
			// 🔍 재료명과 레시피명 통합 검색
			try {
				// 1. ingredients 테이블에서 재료명 검색
				const { data: ingredientMatches } = await supabase
					.from("ingredients")
					.select("item_id")
					.ilike("name", `%${searchTerm}%`)
				
				const recipeIdsFromIngredients = ingredientMatches?.map(ing => ing.item_id) || []
				
				// 2. 레시피명 OR 재료명이 포함된 레시피 검색
				if (recipeIdsFromIngredients.length > 0) {
					// 레시피명 또는 재료명이 매치되는 경우
					query = query.or(`title.ilike.%${searchTerm}%,id.in.(${recipeIdsFromIngredients.join(",")})`)
				} else {
					// 재료 매치가 없으면 레시피명만 검색
					query = query.ilike("title", `%${searchTerm}%`)
				}
				
				
				
			} catch (error) {
				console.error("Search error, falling back to title search:", error)
				// 에러 시 기본 제목 검색으로 폴백
				query = query.ilike("title", `%${searchTerm}%`)
			}
		}

		if (filterCategory) {
			query = query.contains("tags", [filterCategory])
		}
		if (filterColorLabel) {
			query = query.eq("color_label", filterColorLabel)
		}
	} else {
		// all_recipes
		if (!userId) return []

		// all_recipes에서는 공개 레시피만 표시
		query = query.eq("is_public", true)

		// 팔로우한 사용자들의 ID 조회
		const { data: followingData } = await supabase.from("follows").select("following_id").eq("follower_id", userId)
		const followingIds = followingData?.map((f) => f.following_id) || []
		if (followingIds.length === 0) return []
		
		query = query.in("user_id", followingIds)
		
		if (searchTerm) {
			// 🔍 종합 검색: 레시피명, 사용자명, 재료명, 태그 검색
			try {
				// 1. 사용자명으로 검색
				const { data: userMatches } = await supabase
					.from("profiles")
					.select("id")
					        .ilike('username', `%${searchTerm}%`)
					.in("id", followingIds)
				
				// 2. 재료명으로 검색
				const { data: ingredientMatches } = await supabase
					.from("ingredients")
					.select("item_id")
					.ilike("name", `%${searchTerm}%`)
				
				const matchingUserIds = userMatches?.map(u => u.id) || []
				const recipeIdsFromIngredients = ingredientMatches?.map(ing => ing.item_id) || []
				
				// 3. 복합 검색: 제목, 사용자, 재료, 태그
				const conditions = [`title.ilike.%${searchTerm}%`]
				if (matchingUserIds.length > 0) {
					conditions.push(`user_id.in.(${matchingUserIds.join(",")})`)
				}
				if (recipeIdsFromIngredients.length > 0) {
					conditions.push(`id.in.(${recipeIdsFromIngredients.join(",")})`)
				}
				conditions.push(`tags.cs.{${searchTerm}}`)
				
				query = query.or(conditions.join(","))
				
				
				
			} catch (error) {
				console.error("Search error, falling back to title search:", error)
				// 에러 시 기본 제목 검색으로 폴백
				query = query.ilike("title", `%${searchTerm}%`)
			}
		}
		query = query.neq("user_id", userId)
	}

	query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to)

	const { data, error } = await query
	if (error) throw error

	if (!data || data.length === 0) {
		return []
	}

	// 🔄 SSA 기반: 사용자별 좋아요/팔로우 상태 조회 (프로필 페이지와 동일한 방식)
	// ✅ SSA 원칙: 홈 피드와 동일한 사용자 상호작용 데이터 처리
	const itemIds = data.map((item: Item) => item.id)
	const userLikesMap = new Map<string, boolean>()
	const userFollowsMap = new Map<string, boolean>()

	if (userId && userId !== "guest") {
		// 좋아요 상태 확인
		const { data: userLikes } = await supabase
			.from("likes")
			.select("item_id")
			.eq("user_id", userId)
			.in("item_id", itemIds)

		userLikes?.forEach((like) => {
			userLikesMap.set(like.item_id, true)
		})

		// 팔로우 상태 확인 (작성자들에 대한)
		const authorIds = Array.from(new Set(data.map((item: Item) => item.user_id)))
		const { data: userFollows } = await supabase
			.from("follows")
			.select("following_id")
			.eq("follower_id", userId)
			.in("following_id", authorIds)

		userFollows?.forEach((follow) => {
			userFollowsMap.set(follow.following_id, true)
		})
	}

	// ✅ SSA 기반: 홈 피드와 동일한 데이터 변환 로직 적용
	return data.map((item: Item & { profiles?: any }) => {
		// 🎯 나의 레시피(RPC)는 이미 평면화된 데이터, 모두의 레시피는 profiles 관계 데이터
		const profileData = tab === "my_recipes" 
			? item  // RPC 함수에서 이미 평면화됨
			: (Array.isArray(item.profiles) ? item.profiles[0] : item.profiles)
		
		const userLikeStatus = userLikesMap.get(item.id)
		const isLikedValue = userId && userId !== "guest" 
			? (userLikeStatus !== undefined ? userLikeStatus : false)
			: false
		
		return {
			id: item.id,
			item_id: item.id,
			user_id: item.user_id,
			item_type: item.item_type as "post" | "recipe",
			created_at: item.created_at,
			is_public: item.is_public,
			// 작성자 정보 처리 - 데이터 소스에 따라 다른 방식
			display_name: profileData?.display_name || item.display_name || null,
			username: profileData?.username || item.username || null,
			avatar_url: profileData?.avatar_url || item.avatar_url || null,
			user_public_id: profileData?.public_id || profileData?.user_public_id || item.user_public_id || null,
			user_email: null,
			title: item.title,
			content: item.content,
			description: item.description,
			image_urls: item.image_urls,
			thumbnail_index: item.thumbnail_index || null,
			tags: item.tags,
			color_label: item.color_label,
			servings: item.servings,
			cooking_time_minutes: item.cooking_time_minutes,
			recipe_id: item.recipe_id,
			cited_recipe_ids: item.cited_recipe_ids,
			// ✅ SSA 원칙: 모든 곳에서 정확한 좋아요/댓글 수 사용
			likes_count: item.likes_count || 0,
			comments_count: item.comments_count || 0,  // 🎯 이제 삭제된 댓글 제외된 정확한 값
			is_liked: tab === "my_recipes" 
				? (item.is_liked || false)  // RPC 함수에서 이미 계산됨
				: isLikedValue,             // 별도 계산 필요
			is_following: userFollowsMap.get(item.user_id) || false,
			bookmarks_count: 0,
			is_bookmarked: false,
			// 호환성을 위한 author 필드
			author: profileData
		}
	}) as Item[]
	
	} catch (error) {
		console.error("❌ Fetcher error:", error)
		// 에러 발생 시 빈 배열 반환 (무한 에러 루프 방지)
		return []
	}
}

export default function RecipesPage() {
	const supabase = createSupabaseBrowserClient()
	const router = useRouter()
	const searchParams = useSearchParams()
	const { toast } = useToast()
	const { mutate } = useSWRConfig()

	// 🧭 Smart Navigation: 레시피북 navigation history 추적
	useNavigation({ trackHistory: true })

	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [userLoading, setUserLoading] = useState(true)
	const [selectedRecipes, setSelectedRecipes] = useState<string[]>([])
	const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
	const [currentTab, setCurrentTab] = useState<Tab>("my_recipes")

	const { viewMode, setViewMode, setCurrentTab: setStoreCurrentTab, getCurrentTabState, setSearchTerm } = useRecipeStore()
	const currentTabState = getCurrentTabState()
	const { searchTerm, sortBy, sortOrder, filterCategory, filterColorLabel } = currentTabState
	const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

	// const { registerRefreshFunction, unregisterRefreshFunction } = useRefresh()
	// const pathname = usePathname()

	useEffect(() => {
		async function getUserAndSetInitialTab() {
			const {
				data: { user },
			} = await supabase.auth.getUser()
			setCurrentUser(user)
			setUserLoading(false)
			const tabParam = searchParams.get("tab")
			const initialTab = tabParam === "all" ? "all_recipes" : "my_recipes"
			setCurrentTab(initialTab)
			setStoreCurrentTab(initialTab)
		}
		getUserAndSetInitialTab()
	}, [supabase.auth, searchParams, setStoreCurrentTab])


	useEffect(() => {
		const handler = setTimeout(() => {
			setSearchTerm(localSearchTerm)
		}, 500)
		return () => clearTimeout(handler)
	}, [localSearchTerm, setSearchTerm])

	useEffect(() => {
		setLocalSearchTerm(searchTerm)
	}, [searchTerm])

	const getKey = useCallback(
		(pageIndex: number, previousPageData: Item[]) => {
			if (userLoading) return null
			if (previousPageData && !previousPageData.length) return null
			if (!currentUser) return null
			return `recipes||${currentTab}||${pageIndex}||${sortBy}||${sortOrder}||${searchTerm}||${filterCategory}||${filterColorLabel}||${currentUser?.id}`
		},
		[currentUser, userLoading, currentTab, sortBy, sortOrder, searchTerm, filterCategory, filterColorLabel]
	)

	const { data, size, setSize, isLoading, mutate: mutateRecipes } = useSWRInfinite(getKey, fetcher, { revalidateFirstPage: false })

	// 🚀 업계 표준: 팔로우 스토어에서 자동으로 캐시 무효화 처리하므로 이벤트 리스너 불필요

	const recipes = data ? ([] as Item[]).concat(...data) : []
	const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined")
	const isEmpty = data?.[0]?.length === 0
	const isReachingEnd = isEmpty || (data && data[data.length - 1]?.length < PAGE_SIZE)

	const observerElem = useRef<HTMLDivElement>(null)

	const handleObserver = useCallback(
		(entries: IntersectionObserverEntry[]) => {
			const target = entries[0]
			if (target.isIntersecting && !isReachingEnd && !isLoadingMore) {
				setSize(size + 1)
			}
		},
		[setSize, isReachingEnd, isLoadingMore, size]
	)

	useEffect(() => {
		const element = observerElem.current
		if (!element) return
		const observer = new IntersectionObserver(handleObserver, { threshold: 1.0 })
		observer.observe(element)
		return () => {
			observer.unobserve(element)
			// 🔧 메모리 안전: IntersectionObserver 완전 정리
			observer.disconnect()
		}
	}, [handleObserver])

	const handleTabChange = (tab: Tab) => {
		setCurrentTab(tab)
		setStoreCurrentTab(tab)
		setSelectedRecipes([])
		router.push(`/recipes?tab=${tab === "my_recipes" ? "my" : "all"}`, { scroll: false })
	}

	const handleSelectRecipe = (recipeId: string) => {
		if (currentTab !== "my_recipes") return
		setSelectedRecipes((prev) => (prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]))
	}

		const handleDeleteSelected = async () => {
		if (selectedRecipes.length === 0) return

		

		// 🚀 업계 표준: 1. 레시피북 캐시에서 즉시 제거 (Instagram/Twitter 방식)
		mutateRecipes(
			(cachedData: any[] | any[][] | undefined) => {
				
				if (!cachedData || !Array.isArray(cachedData)) {
					
					return cachedData;
				}
				
				// useSWRInfinite 페이지 구조 처리
				const hasPageStructure = cachedData.length > 0 && Array.isArray(cachedData[0]);
				
				if (hasPageStructure) {
					
					return cachedData.map((page: any) => 
						page.filter((recipe: any) => {
							const shouldKeep = !selectedRecipes.includes(recipe.item_id || recipe.id);
							if (!shouldKeep) {
								
							}
							return shouldKeep;
						})
					);
				} else {
					// 평면 배열 구조 처리 (폴백)
					
					return cachedData.filter((recipe: any) => {
						const shouldKeep = !selectedRecipes.includes(recipe.item_id || recipe.id);
						if (!shouldKeep) {
							
						}
						return shouldKeep;
					});
				}
			},
			{ revalidate: false } // 즉시 UI 업데이트, 서버 재검증 없음
		)

		// 🚀 업계 표준: 2. 홈화면 캐시에서도 즉시 제거 (동기화)
		mutate(
			(key) => {
				const isMatch = typeof key === "string" && key.startsWith("items|");
				
				return isMatch;
			},
			(cachedData: any) => {
				
				if (!cachedData || !Array.isArray(cachedData)) {
					
					return cachedData;
				}
				
				// 홈피드도 동일한 방식으로 처리
				const hasPageStructure = cachedData.length > 0 && 
				                         Array.isArray(cachedData[0]) && 
				                         (cachedData[0].length === 0 || typeof cachedData[0][0] === 'object');
				
				if (hasPageStructure) {
					
					return cachedData.map((page: any) => 
						page.filter((feedItem: any) => {
							const shouldKeep = !selectedRecipes.includes(feedItem.item_id);
							if (!shouldKeep) {
								
							}
							return shouldKeep;
						})
					);
				} else {
					
					return cachedData.filter((feedItem: any) => {
						const shouldKeep = !selectedRecipes.includes(feedItem.item_id);
						if (!shouldKeep) {
							
						}
						return shouldKeep;
					});
				}
			},
			{ revalidate: false }
		)

		try {
			
			
			// 3. 실제 데이터베이스에서 레시피 삭제
			const { error } = await supabase.from("items").delete().in("id", selectedRecipes)

			if (error) throw error
			
			

			// 🚀 업계 표준: 4. 성공시 최종 캐시 확정
			await mutateRecipes() // 레시피북 캐시 확정
			await mutate((key: string) => typeof key === "string" && key.startsWith("items|")) // 홈화면 캐시 확정
			
			toast({
				title: "성공",
				description: `${selectedRecipes.length}개의 레시피를 삭제했습니다.`,
			})
			setSelectedRecipes([])
			
		} catch (error: unknown) {
			console.error("❌ RecipeBook: Database deletion failed:", error)
			
			// 🚀 업계 표준: 5. 실패시 Optimistic Update 롤백
			
			await mutateRecipes() // 레시피북 롤백
			await mutate((key: string) => typeof key === "string" && key.startsWith("items|")) // 홈화면 롤백
			
			toast({
				title: "오류",
				description: "레시피 삭제 중 오류가 발생했습니다.",
				variant: "destructive",
			})
			console.error("Error deleting recipes:", error)
		}
	}

	if (userLoading) {
		return (
			<div className="px-2 py-3 max-w-7xl mx-auto w-full">
				<div className={
					viewMode === "card" 
						? "grid grid-cols-2 gap-3" 
						: "space-y-5"
				}>
					{Array.from({ length: viewMode === "card" ? 6 : 3 }).map((_, i) => (
						<RecipeCardSkeleton key={i} />
					))}
				</div>
			</div>
		)
	}

	// 비회원 여부 확인
	const isGuest = !currentUser && !userLoading

	return (
		<div className="flex flex-col w-full h-screen bg-door text-ink relative overflow-hidden">
			{isGuest ? (
				<div className="px-3 pt-3">
					<section className="rounded-[3px] bg-paper px-5 py-6 shadow-sheet">
						<h1 className="text-xl font-bold text-ink">레시피북은 회원이 쓰는 공간이에요</h1>
						<p className="mt-2 text-[15px] leading-relaxed text-ink-soft">내 레시피를 기록하고 색상 라벨로 정리해 두었다가 요리할 때 다시 꺼내 볼 수 있어요.</p>
						<Button asChild className="mt-5">
							<Link href="/login?next=/recipes">로그인하고 레시피북 열기</Link>
						</Button>
					</section>
				</div>
			) : (
			<div className="flex flex-col h-full">
				<div className="sticky top-0 bg-paper z-[60] border-b border-border">
					<div className="flex justify-around max-w-md mx-auto relative">
					<div className="flex-1 flex items-center justify-center relative">
						<button 
							onClick={() => handleTabChange("my_recipes")} 
							className={`flex h-12 items-center justify-center px-2 text-[15px] font-semibold transition-colors ${currentTab === "my_recipes" ? "text-ink border-b-2 border-ink" : "text-ink-soft"}`}
						>
							<BookUser className="w-5 h-5 mr-2" />
							나의 레시피
						</button>
					</div>
					<div className="flex-1 flex items-center justify-center relative">
						<button 
							onClick={() => handleTabChange("all_recipes")} 
							className={`flex h-12 items-center justify-center px-2 text-[15px] font-semibold transition-colors ${currentTab === "all_recipes" ? "text-ink border-b-2 border-ink" : "text-ink-soft"}`}
						>
							<ChefHat className="w-5 h-5 mr-2" />
							모두의 레시피
						</button>
					</div>
					
				</div>
			</div>

			{/* 🔧 반응형 최적화: 컨테이너 최대 너비 + 패딩 조정 */}
			<main className="flex-1 overflow-y-auto px-3 py-3 max-w-7xl mx-auto w-full">
				{/* 🔧 검색/필터 영역 - 모바일 최적화 */}
				<div className="flex gap-2 mb-3">
					<div className="relative flex-grow min-w-0">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft" aria-hidden />
						<Input 
							placeholder={
								currentTab === "my_recipes" 
									? "레시피명, 재료명으로 검색..." 
									: "레시피명, 사용자명, 재료명, 태그로 검색..."
							} 
							value={localSearchTerm} 
							onChange={(e) => setLocalSearchTerm(e.target.value)} 
							aria-label="레시피 검색" className="h-11 pl-10 bg-paper text-[15px]" 
						/>
					</div>
					{/* 🎯 필터 버튼은 나의 레시피에서만 표시 */}
					{currentTab === "my_recipes" && (
						<Button variant="outline" size="icon" onClick={() => setIsFilterModalOpen(true)} aria-label="색상 라벨로 거르기">
							<SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
						</Button>
					)}
					<Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "card" ? "list" : "card")} aria-label={viewMode === "card" ? "목록으로 보기" : "격자로 보기"}>
						{viewMode === "card" ? <List className="w-4 h-4 sm:w-5 sm:h-5" /> : <Grid className="w-4 h-4 sm:w-5 sm:h-5" />}
					</Button>
				</div>

				{currentTab === "my_recipes" && selectedRecipes.length > 0 && (
					<div className="mb-3 sm:mb-4 flex justify-end">
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" size="sm" className="text-xs sm:text-sm">
									<Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
									선택 삭제 ({selectedRecipes.length})
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent className="max-w-sm sm:max-w-md">
								<AlertDialogHeader>
									<AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
									<AlertDialogDescription>선택한 {selectedRecipes.length}개의 레시피를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>취소</AlertDialogCancel>
									<AlertDialogAction onClick={handleDeleteSelected}>삭제</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				)}

				{/* 🚀 2열 통일 그리드 시스템 */}
				{isLoading && recipes.length === 0 ? (
					<div className={
						viewMode === "card" 
							? "grid grid-cols-2 gap-3" 
							: "space-y-2.5"
					}>
						{Array.from({ length: viewMode === "card" ? 4 : 3 }).map((_, i) => (
							<RecipeCardSkeleton key={i} />
						))}
					</div>
				) : isEmpty ? (
					<div className="text-center py-12 sm:py-16 text-ink-soft px-4">
						<p className="font-semibold mb-2 text-sm sm:text-base">{currentTab === "my_recipes" ? "아직 작성한 레시피가 없어요." : "팔로우한 사용자의 레시피가 없어요."}</p>
						<p className="text-xs sm:text-sm">{currentTab === "my_recipes" ? "새로운 레시피를 추가해보세요!" : "다른 사용자를 팔로우하고 레시피를 확인해보세요."}</p>
						{currentTab === "my_recipes" && (
							<Button asChild className="mt-3 sm:mt-4 text-sm">
								<Link href="/recipes/new">새 레시피 작성하기</Link>
							</Button>
						)}
					</div>
				) : (
					<div className={
						viewMode === "card" 
							? "grid grid-cols-2 gap-3" 
							: "space-y-2.5"
					}>
						{recipes.map((item, index) =>
							viewMode === "card" ? (
								<RecipeCard 
									key={item.item_id} 
									item={item} 
									isSelectable={currentTab === "my_recipes"} 
									isSelected={selectedRecipes.includes(item.item_id)} 
									onSelect={() => handleSelectRecipe(item.item_id)} 
									showAuthor={currentTab === "all_recipes"}
									priority={index === 0} // 첫 번째 레시피에만 우선순위 부여
								/>
							) : (
								<RecipeListCard 
									key={item.item_id} 
									item={item} 
									isSelectable={currentTab === "my_recipes"} 
									isSelected={selectedRecipes.includes(item.item_id)} 
									onSelect={() => handleSelectRecipe(item.item_id)} 
									showAuthor={currentTab === "all_recipes"}
									priority={index === 0} // 첫 번째 레시피에만 우선순위 부여
								/>
							)
						)}
					</div>
				)}

				{isLoadingMore && (
					<div className={
						viewMode === "card" 
							? "grid grid-cols-2 gap-3 mt-4" 
							: "space-y-2.5 mt-4"
					}>
						{Array.from({ length: viewMode === "card" ? 2 : 1 }).map((_, i) => (
							<RecipeCardSkeleton key={i} />
						))}
					</div>
				)}

				<div ref={observerElem} style={{ height: "1px" }} />

				{isReachingEnd && !isEmpty && <p className="text-center text-xs sm:text-sm text-ink-soft py-6 sm:py-8">모든 레시피를 불러왔습니다.</p>}
			</main>

			<FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} />
			</div>
			)}
		</div>
	)
}
