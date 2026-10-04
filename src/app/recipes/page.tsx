"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRouter } from "@/shared/lib/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Search, SlidersHorizontal, List, Grid } from "lucide-react"

import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import useSWRInfinite from "swr/infinite"
import { useRecipeStore } from "@/features/recipe/store/recipeStore"
import RecipeCard from "@/features/recipe/components/RecipeCard"
import RecipeCardSkeleton from "@/features/recipe/components/RecipeCardSkeleton"
import FilterModal, { hasActiveRecipeFilter } from "@/features/recipe/components/FilterModal"
import RecipeListCard from "@/features/recipe/components/RecipeListCard"
import type { User } from "@supabase/supabase-js"
import type { Item } from "@/types/item"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Sheet, StateSheet, UnderlineTabs } from "@/components/kit"
import { cacheManager } from "@/shared/infra/unified-cache-manager"
import { revalidateItemPage } from "@/shared/infra/revalidate-item"
import { collectItemImageUrls, removeItemImages } from "@/shared/infra/item-images"
import { RECIPE_BOOK_PAGE_SIZE, fetchRecipeBookPage } from "@/features/feed/data/recipe-book-repository"
import { deleteItemsByIds } from "@/features/feed/data/item-detail"

type Tab = "my_recipes" | "all_recipes"

const PAGE_SIZE = RECIPE_BOOK_PAGE_SIZE

const fetcher = fetchRecipeBookPage

export default function RecipesPage() {
	const supabase = createSupabaseBrowserClient()
	const router = useRouter()
	const searchParams = useSearchParams()
	const { toast } = useToast()


	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [userLoading, setUserLoading] = useState(true)
	const [selectedRecipes, setSelectedRecipes] = useState<string[]>([])
	// 고르기는 따로 켠다: 평소에는 카드를 누르면 레시피가 열린다
	const [isSelecting, setIsSelecting] = useState(false)
	const stopSelecting = () => {
		setIsSelecting(false)
		setSelectedRecipes([])
	}
	const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
	const [currentTab, setCurrentTab] = useState<Tab>("my_recipes")

	const { viewMode, setViewMode, setCurrentTab: setStoreCurrentTab, getCurrentTabState, setSearchTerm } = useRecipeStore()
	const currentTabState = getCurrentTabState()
	const { searchTerm, sortBy, sortOrder, filterCategory, filterColorLabel } = currentTabState
	const filterActive = hasActiveRecipeFilter(currentTabState)
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

	// 저장된 검색어가 바깥에서 바뀌면(초기화 등) 입력칸도 맞춘다. 렌더 중에 한 번만 맞춰 렌더가 한 번 더 일어나지 않게 한다
	const [syncedSearchTerm, setSyncedSearchTerm] = useState(searchTerm)
	if (searchTerm !== syncedSearchTerm) {
		setSyncedSearchTerm(searchTerm)
		setLocalSearchTerm(searchTerm)
	}

	const getKey = useCallback(
		(pageIndex: number, previousPageData: Item[]) => {
			if (userLoading) return null
			if (previousPageData && !previousPageData.length) return null
			if (!currentUser) return null
			return `recipes||${currentTab}||${pageIndex}||${sortBy}||${sortOrder}||${searchTerm}||${filterCategory}||${filterColorLabel}||${currentUser?.id}`
		},
		[currentUser, userLoading, currentTab, sortBy, sortOrder, searchTerm, filterCategory, filterColorLabel]
	)

	const { data, size, setSize, isLoading } = useSWRInfinite(getKey, fetcher, { revalidateFirstPage: false })


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
			// 메모리 안전: IntersectionObserver 완전 정리
			observer.disconnect()
		}
	}, [handleObserver])

	const handleTabChange = (tab: Tab) => {
		setCurrentTab(tab)
		setStoreCurrentTab(tab)
		stopSelecting()
		router.push(`/recipes?tab=${tab === "my_recipes" ? "my" : "all"}`, { scroll: false })
	}

	const handleSelectRecipe = (recipeId: string) => {
		if (currentTab !== "my_recipes") return
		setSelectedRecipes((prev) => (prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]))
	}

		const handleDeleteSelected = async () => {
		if (selectedRecipes.length === 0) return

		

		// 1. 모든 목록·상세 캐시에서 바로 뺀다. 실패하면 rollback이 목록을 다시 받는다
		const rollback = await cacheManager.deleteItems(selectedRecipes)

		try {
			
			
			// 3. 실제 데이터베이스에서 레시피 삭제
			// 글이 지워지면 사진 목록도 사라지므로 먼저 모아 둔다
			const imageUrls = await collectItemImageUrls(supabase, selectedRecipes)
			const { error } = await deleteItemsByIds(supabase, selectedRecipes)

			if (error) throw error
			selectedRecipes.forEach((itemId) => revalidateItemPage(itemId)) // 지운 레시피의 미리 만든 페이지를 바로 내린다
			removeItemImages(imageUrls) // 지운 레시피의 사진 파일도 지운다
			
			

			
			toast({ title: `레시피 ${selectedRecipes.length}개를 지웠어요` })
			stopSelecting()
			
		} catch (error: unknown) {
			console.error("❌ RecipeBook: Database deletion failed:", error)
			
			rollback() // 지운 줄 알았던 레시피를 목록에 되돌린다 (서버에서 다시 받기)
			
			toast({ title: "지우지 못했어요", description: "잠시 뒤 다시 해 주세요.", variant: "destructive" })
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
		<div className="flex flex-col w-full h-screen text-ink relative overflow-hidden">
			{isGuest ? (
				<div className="px-3 pt-3">
					<StateSheet headingLevel="h1" title="레시피북은 회원이 쓰는 공간이에요" body="내 레시피를 기록하고 색상 라벨로 정리해 두었다가 요리할 때 다시 꺼내 볼 수 있어요." action={<Button asChild><Link href="/login?next=/recipes">로그인하고 레시피북 열기</Link></Button>} />
				</div>
			) : (
			<div className="flex flex-col h-full">
				<UnderlineTabs
					label="레시피 범위"
					className="sticky top-0 z-[60]"
					value={currentTab}
					onChange={handleTabChange}
					items={[
						{ key: "my_recipes", label: "내 레시피" },
						{ key: "all_recipes", label: "팔로잉" },
					]}
				/>

			<main className="flex-1 overflow-y-auto px-3 py-3 max-w-7xl mx-auto w-full">
				{/* 도구 줄: 검색 / 거르기 / 보기 방식 / 선택. 고르는 동안에는 같은 높이·같은 자리에서 "고른 수 · 지우기 · 완료"로 바뀐다
				    (줄 높이가 같아 켜고 끌 때 아래 목록이 움직이지 않는다. "선택"과 "완료"는 같은 오른쪽 끝) */}
				<div className="mb-3 flex h-11 items-center gap-1">
					{isSelecting ? (
						<>
							<p className="min-w-0 flex-1 truncate pl-1 text-label text-ink" aria-live="polite">
								{selectedRecipes.length > 0 ? <><span className="font-semibold tabular-nums">{selectedRecipes.length}</span>개 골랐어요</> : <span className="text-ink-soft">지울 레시피를 골라 주세요</span>}
							</p>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="ghost" disabled={selectedRecipes.length === 0} className="px-3 text-destructive hover:text-destructive">
									<Trash2 aria-hidden />
									지우기
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent className="max-w-sm sm:max-w-md">
								<AlertDialogHeader>
									<AlertDialogTitle>레시피 {selectedRecipes.length}개를 지울까요?</AlertDialogTitle>
									<AlertDialogDescription>지운 레시피는 되돌릴 수 없어요. 이 레시피로 남긴 다른 사람의 기록에서는 출처가 사라져요.</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>취소</AlertDialogCancel>
									<AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">지우기</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
							<Button variant="ghost" onClick={stopSelecting} className="px-3 font-semibold">
								완료
							</Button>
						</>
					) : (
						<>
							<div className="relative min-w-0 flex-1">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-soft" aria-hidden />
								<Input
									placeholder={currentTab === "my_recipes" ? "레시피·재료 검색" : "레시피·재료·사람 검색"}
									value={localSearchTerm}
									onChange={(e) => setLocalSearchTerm(e.target.value)}
									aria-label="레시피 검색"
									className="pl-9"
								/>
							</div>
							{currentTab === "my_recipes" && (
								<Button variant="ghost" size="icon" onClick={() => setIsFilterModalOpen(true)} aria-label={filterActive ? "거르기와 정렬 (켜짐)" : "거르기와 정렬"} className="relative">
									<SlidersHorizontal className="!size-5" aria-hidden />
									{/* 거르기·정렬이 켜져 있으면 점: 목록이 왜 줄었는지 알 수 있게 */}
									{filterActive && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand ring-2 ring-door" aria-hidden />}
								</Button>
							)}
							<Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === "card" ? "list" : "card")} aria-label={viewMode === "card" ? "목록으로 보기" : "격자로 보기"}>
								{viewMode === "card" ? <List className="!size-5" aria-hidden /> : <Grid className="!size-5" aria-hidden />}
							</Button>
							{currentTab === "my_recipes" && recipes.length > 0 && (
								<Button variant="ghost" onClick={() => setIsSelecting(true)} className="px-3">
									선택
								</Button>
							)}
						</>
					)}
				</div>

				{/* 2열 통일 그리드 시스템 */}
				{isLoading && recipes.length === 0 ? (
					<div className={
						viewMode === "card" 
							? "grid grid-cols-2 gap-3" 
							: "space-y-2"
					}>
						{Array.from({ length: viewMode === "card" ? 4 : 3 }).map((_, i) => (
							<RecipeCardSkeleton key={i} />
						))}
					</div>
				) : isEmpty ? (
					<Sheet className="px-5 py-6">
						<p className="text-heading text-ink">{currentTab === "my_recipes" ? "아직 쓴 레시피가 없어요" : "팔로우한 사람의 레시피가 아직 없어요"}</p>
						<p className="mt-1 text-label text-ink-soft">{currentTab === "my_recipes" ? "레시피를 쓰면 여기에 모여서 요리할 때 다시 꺼내 볼 수 있어요." : "검색에서 마음에 드는 사람을 팔로우하면 그 사람의 레시피가 여기에 모여요."}</p>
						{currentTab === "my_recipes" && (
							<Button asChild className="mt-4">
								<Link href="/recipes/new">레시피 쓰기</Link>
							</Button>
						)}
					</Sheet>
				) : (
					<div className={
						viewMode === "card" 
							? "grid grid-cols-2 gap-3" 
							: "space-y-2"
					}>
						{recipes.map((item, index) =>
							viewMode === "card" ? (
								<RecipeCard 
									key={item.item_id} 
									item={item} 
									isSelectable={isSelecting} 
									isSelected={selectedRecipes.includes(item.item_id)} 
									onSelect={() => handleSelectRecipe(item.item_id)} 
									showAuthor={currentTab === "all_recipes"}
									priority={index === 0} // 첫 번째 레시피에만 우선순위 부여
								/>
							) : (
								<RecipeListCard 
									key={item.item_id} 
									item={item} 
									isSelectable={isSelecting} 
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
							? "grid grid-cols-2 gap-3 mt-3" 
							: "space-y-2 mt-2"
					}>
						{Array.from({ length: viewMode === "card" ? 2 : 1 }).map((_, i) => (
							<RecipeCardSkeleton key={i} />
						))}
					</div>
				)}

				<div ref={observerElem} className="h-px" />

				{isReachingEnd && !isEmpty && <p className="py-6 text-center text-meta text-ink-soft">여기까지예요</p>}
			</main>

			<FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} />
			</div>
			)}
		</div>
	)
}
