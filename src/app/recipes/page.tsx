"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Search, SlidersHorizontal, List, Grid, BookUser, ChefHat } from "lucide-react"
import { RecipeBookAuthPrompt } from "@/components/auth/RecipeBookAuthPrompt"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import useSWRInfinite from "swr/infinite"
import { useRecipeStore } from "@/store/recipeStore"
import { useRefresh } from "@/contexts/RefreshContext"
import RecipeCard from "@/components/recipe/RecipeCard"
import RecipeCardSkeleton from "@/components/recipe/RecipeCardSkeleton"
import FilterModal from "@/components/recipe/FilterModal"
import RecipeListCard from "@/components/recipe/RecipeListCard"
import type { User } from "@supabase/supabase-js"
import type { FeedItem } from "@/types/item"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

type Tab = "my_recipes" | "all_recipes"

const PAGE_SIZE = 12

const fetcher = async (key: string): Promise<FeedItem[]> => {
	const supabase = createSupabaseBrowserClient()
	const [, tab, pageIndex, sortBy, sortOrder, searchTerm, filterCategory, filterColorLabel, userId] = key.split("||")

	const from = parseInt(pageIndex) * PAGE_SIZE
	const to = from + PAGE_SIZE - 1

	let query = supabase.from("items").select(`*, author:profiles!user_id(display_name, username, avatar_url)`).eq("item_type", "recipe")

	if (tab === "my_recipes") {
		if (!userId) return []
		query = query.eq("user_id", userId)

		if (searchTerm) {
			const { data: ingredientRecipeIds, error: rpcError } = await supabase.rpc("search_recipes_by_ingredient", { search_term: searchTerm })

			if (rpcError) {
				console.error("Error searching recipes by ingredient:", rpcError)
				query = query.ilike("title", `%${searchTerm}%`)
			} else {
				const recipeIds = ingredientRecipeIds.map((r) => r.id)
				query = query.or(`title.ilike.%${searchTerm}%,id.in.(${recipeIds.join(",") || "null"})`)
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

		if (searchTerm) {
			const { data: recipeIdsData, error: rpcError } = await supabase.rpc("search_followed_recipes_advanced", { current_user_id: userId, search_term: searchTerm })

			if (rpcError) {
				console.error("Error searching followed recipes:", rpcError)
				// Fallback to basic search if RPC fails
				const { data: followingData } = await supabase.from("follows").select("following_id").eq("follower_id", userId)
				const followingIds = followingData?.map((f) => f.following_id) || []
				if (followingIds.length === 0) return []
				query = query.in("user_id", followingIds).ilike("title", `%${searchTerm}%`)
			} else {
				const recipeIds = recipeIdsData.map((r) => r.id)
				if (recipeIds.length === 0) return [] // No results from advanced search
				query = query.in("id", recipeIds)
			}
		} else {
			const { data: followingData } = await supabase.from("follows").select("following_id").eq("follower_id", userId)
			const followingIds = followingData?.map((f) => f.following_id) || []
			if (followingIds.length === 0) return []
			query = query.in("user_id", followingIds)
		}
		query = query.neq("user_id", userId)
	}

	query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to)

	const { data, error } = await query
	if (error) throw error

	return data.map((item) => {
		const author = Array.isArray(item.author) ? item.author[0] : item.author
		return { ...item, author, item_id: item.id }
	}) as FeedItem[]
}

export default function RecipesPage() {
	const supabase = createSupabaseBrowserClient()
	const router = useRouter()
	const searchParams = useSearchParams()
	const { toast } = useToast()

	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [userLoading, setUserLoading] = useState(true)
	const [selectedRecipes, setSelectedRecipes] = useState<string[]>([])
	const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
	const [currentTab, setCurrentTab] = useState<Tab>("my_recipes")

	const { viewMode, setViewMode, setCurrentTab: setStoreCurrentTab, getCurrentTabState, setSearchTerm } = useRecipeStore()
	const currentTabState = getCurrentTabState()
	const { searchTerm, sortBy, sortOrder, filterCategory, filterColorLabel } = currentTabState
	const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

	const { registerRefreshFunction, unregisterRefreshFunction } = useRefresh()
	const pathname = usePathname()

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
		(pageIndex: number, previousPageData: FeedItem[]) => {
			if (userLoading) return null
			if (previousPageData && !previousPageData.length) return null
			if (!currentUser) return null
			return `recipes||${currentTab}||${pageIndex}||${sortBy}||${sortOrder}||${searchTerm}||${filterCategory}||${filterColorLabel}||${currentUser?.id}`
		},
		[currentUser, userLoading, currentTab, sortBy, sortOrder, searchTerm, filterCategory, filterColorLabel]
	)

	const { data, size, setSize, isLoading, mutate: mutateRecipes } = useSWRInfinite(getKey, fetcher, { revalidateFirstPage: false })

	const recipes = data ? ([] as FeedItem[]).concat(...data) : []
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

		const { error } = await supabase.from("items").delete().in("id", selectedRecipes)

		if (error) {
			toast({
				title: "오류",
				description: "레시피 삭제 중 오류가 발생했습니다.",
				variant: "destructive",
			})
			console.error("Error deleting recipes:", error)
		} else {
			toast({
				title: "성공",
				description: `${selectedRecipes.length}개의 레시피를 삭제했습니다.`,
			})
			mutateRecipes()
			setSelectedRecipes([])
		}
	}

	if (userLoading) {
		return (
			<div className="p-4">
				<div className={viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}>{viewMode === "grid" ? <RecipeCardSkeleton count={6} /> : <RecipeCardSkeleton count={3} type="list" />}</div>
			</div>
		)
	}

	if (!currentUser) {
		return <RecipeBookAuthPrompt />
	}

	return (
		<div className="flex flex-col h-full bg-gray-50 text-gray-900">
			<div className="sticky top-0 bg-white z-10 border-b border-gray-200">
				<div className="flex justify-around max-w-md mx-auto">
					<button onClick={() => handleTabChange("my_recipes")} className={`flex-1 flex items-center justify-center py-3 text-sm font-semibold transition-colors ${currentTab === "my_recipes" ? "text-orange-500 border-b-2 border-orange-500" : "text-gray-500"}`}>
						<BookUser className="w-5 h-5 mr-2" />
						나의 레시피
					</button>
					<button onClick={() => handleTabChange("all_recipes")} className={`flex-1 flex items-center justify-center py-3 text-sm font-semibold transition-colors ${currentTab === "all_recipes" ? "text-orange-500 border-b-2 border-orange-500" : "text-gray-500"}`}>
						<ChefHat className="w-5 h-5 mr-2" />
						모두의 레시피
					</button>
				</div>
			</div>

			<main className="flex-1 overflow-y-auto p-4">
				<div className="flex gap-2 mb-4">
					<div className="relative flex-grow">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
						<Input placeholder={currentTab === "my_recipes" ? "나의 레시피 검색..." : "팔로우한 사용자 레시피 검색..."} value={localSearchTerm} onChange={(e) => setLocalSearchTerm(e.target.value)} className="pl-10 bg-white" />
					</div>
					<Button variant="outline" size="icon" onClick={() => setIsFilterModalOpen(true)}>
						<SlidersHorizontal className="w-5 h-5" />
					</Button>
					<Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
						{viewMode === "grid" ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
					</Button>
				</div>

				{currentTab === "my_recipes" && selectedRecipes.length > 0 && (
					<div className="mb-4 flex justify-end">
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" size="sm">
									<Trash2 className="w-4 h-4 mr-2" />
									선택 삭제 ({selectedRecipes.length})
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
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

				{isLoading && recipes.length === 0 ? (
					<div className={viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}>{viewMode === "grid" ? <RecipeCardSkeleton count={6} /> : <RecipeCardSkeleton count={3} type="list" />}</div>
				) : isEmpty ? (
					<div className="text-center py-16 text-gray-500">
						<p className="font-semibold mb-2">{currentTab === "my_recipes" ? "아직 작성한 레시피가 없어요." : "팔로우한 사용자의 레시피가 없어요."}</p>
						<p className="text-sm">{currentTab === "my_recipes" ? "새로운 레시피를 추가해보세요!" : "다른 사용자를 팔로우하고 레시피를 확인해보세요."}</p>
						{currentTab === "my_recipes" && (
							<Button asChild className="mt-4">
								<Link href="/recipes/new">새 레시피 작성하기</Link>
							</Button>
						)}
					</div>
				) : (
					<div className={viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}>
						{recipes.map((item) =>
							viewMode === "grid" ? (
								<RecipeCard key={item.item_id} item={item} isSelectable={currentTab === "my_recipes"} isSelected={selectedRecipes.includes(item.item_id)} onSelect={() => handleSelectRecipe(item.item_id)} showAuthor={currentTab === "all_recipes"} />
							) : (
								<RecipeListCard key={item.item_id} item={item} isSelectable={currentTab === "my_recipes"} isSelected={selectedRecipes.includes(item.item_id)} onSelect={() => handleSelectRecipe(item.item_id)} showAuthor={currentTab === "all_recipes"} />
							)
						)}
					</div>
				)}

				{isLoadingMore && <div className={viewMode === "grid" ? "grid grid-cols-2 gap-4 mt-4" : "space-y-4 mt-4"}>{viewMode === "grid" ? <RecipeCardSkeleton count={2} /> : <RecipeCardSkeleton count={1} type="list" />}</div>}

				<div ref={observerElem} style={{ height: "1px" }} />

				{isReachingEnd && !isEmpty && <p className="text-center text-sm text-gray-500 py-8">모든 레시피를 불러왔습니다.</p>}
			</main>

			<FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} />
		</div>
	)
}
