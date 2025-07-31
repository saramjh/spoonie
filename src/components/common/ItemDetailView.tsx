"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MessageCircle, Share2, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { SimplifiedLikeButton } from "@/components/items/SimplifiedLikeButton"
import { BookmarkButton } from "@/components/items/BookmarkButton"
import FollowButton from "@/components/items/FollowButton"
import SimplifiedCommentsSection from "@/components/items/SimplifiedCommentsSection"
import ImageCarousel from "@/components/common/ImageCarousel"
import RecipeContentView from "@/components/recipe/RecipeContentView"
import { timeAgo } from "@/lib/utils"
import { useShare } from "@/hooks/useShare"
import { useNavigation } from "@/hooks/useNavigation"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import useSWR, { useSWRConfig } from "swr"
import { Item, ItemDetail } from "@/types/item"
import Link from "next/link"

import { useCitedRecipes } from "@/hooks/useCitedRecipes"
import { useThumbnail } from "@/hooks/useThumbnail"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"

interface ItemDetailViewProps {
	item: ItemDetail
}

interface CurrentUser {
	id: string
	avatar_url: string | null
	display_name: string
}

const fetcher = async (key: string) => {
	const supabase = createSupabaseBrowserClient()
	const [type, id] = key.split(":")

	if (type === "recipeTitle") {
		const { data, error } = await supabase.from("recipes").select(`id, title, user_id, profiles(username, display_name)`).eq("id", id).single()
		if (error) throw error
		return data
	}
	return null
}

// cited_recipe_ids는 useCitedRecipes 훅에서 처리됨

export default function ItemDetailView({ item }: ItemDetailViewProps) {
	const router = useRouter()
	const { createLinkWithOrigin } = useNavigation()
	const { share } = useShare()
	const { toast } = useToast()
	const supabase = createSupabaseBrowserClient()
	const { mutate } = useSWRConfig()



	const isRecipe = item.item_type === "recipe"

	// 🛡️ Hook 안정성을 위한 값 안정화
	const stableItemId = useMemo(() => item.item_id || item.id, [item.item_id, item.id])
	const stableFallbackData = useMemo(() => item, [item])

	// 🚀 SSA 발전: 실시간 캐시 업데이트 구독 (홈화면과 동일)
	const cachedItem = useSSAItemCache(stableItemId, stableFallbackData)
	
	// 🖼️ 썸네일 관리 - 캐시된 아이템의 최신 thumbnail_index 사용
	const { orderedImages } = useThumbnail({
		itemId: stableItemId,
		imageUrls: cachedItem.image_urls || [],
		thumbnailIndex: cachedItem.thumbnail_index ?? 0
	})

	// Debug logging
	console.log("ItemDetailView Debug:", {
		item_type: item.item_type,
		isRecipe,
		hasSteps: !!item.steps,
		stepsLength: item.steps?.length,
		steps: item.steps,
		hasInstructions: !!item.instructions,
		instructionsLength: item.instructions?.length,
		instructions: item.instructions,
		cited_recipe_ids: item.cited_recipe_ids,
		hasCitedRecipeIds: !!(item.cited_recipe_ids && item.cited_recipe_ids.length > 0),
	})

	const { data: citedRecipe } = useSWR(item.item_type === "post" && item.recipe_id ? `recipeTitle:${item.recipe_id}` : null, fetcher)

	// cited_recipe_ids 처리 - 캐싱된 훅 사용
	const { citedRecipes, isLoading: citedRecipesLoading } = useCitedRecipes(item.cited_recipe_ids)

	const [commentsCount, setCommentsCount] = useState(item.comments_count || 0)
	const [localLikesCount, setLocalLikesCount] = useState(item.likes_count || 0)
	const [localHasLiked, setLocalHasLiked] = useState(item.is_liked || false)
	const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
	const [isAuthLoading, setIsAuthLoading] = useState(true) // 인증 상태 로딩

	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const commentsRef = useRef<HTMLDivElement>(null)

	const comments = useMemo(() => item.comments_data || [], [item.comments_data])

	// 비회원 여부 확인
	const isGuest = !currentUser && !isAuthLoading
	
	// 작성자 여부 확인
	const isOwnItem = currentUser && currentUser.id === item.user_id
	
	// 수정 버튼 핸들러 (Origin 정보 포함)
	const handleEdit = () => {
		const baseEditPath = isRecipe ? `/recipes/${item.item_id}/edit` : `/posts/${item.item_id}/edit`
		const editPath = createLinkWithOrigin(baseEditPath)
		router.push(editPath)
	}
	
	// 🚀 업계 표준: 삭제 확인 핸들러 (PostCard와 완전히 동일한 방식)
	const handleDeleteConfirm = async () => {
		if (!currentUser || !isOwnItem) return
		
		setIsDeleting(true)
		
		console.log(`🗑️ ItemDetailView: Starting deletion of item ${item.item_id}`);
		
		// 🚀 업계 표준: 1. 모든 관련 캐시에서 즉시 제거 (Instagram/Twitter 방식)
		mutate(
			(key) => {
				const isRecipeBook = typeof key === "string" && key.startsWith("recipes||");
				const isHomeFeed = typeof key === "string" && key.startsWith("items|");
				console.log(`🔍 ItemDetailView: Checking key "${key}" - recipe book: ${isRecipeBook}, home feed: ${isHomeFeed}`);
				return isRecipeBook || isHomeFeed;
			},
			// Note: Using any type here due to complex SWR cache structure variations
			(cachedData: any) => {
				console.log(`🔄 ItemDetailView: Processing cached data:`, cachedData);
				if (!cachedData || !Array.isArray(cachedData)) {
					console.log(`❌ ItemDetailView: Invalid cached data`);
					return cachedData;
				}
				
				// 🚀 더 정확한 구조 감지: useSWRInfinite 페이지 구조 vs 평면 배열
				const hasPageStructure = cachedData.length > 0 && 
				                         Array.isArray(cachedData[0]) && 
				                         (cachedData[0].length === 0 || typeof cachedData[0][0] === 'object');
				
				if (hasPageStructure) {
					console.log(`📄 ItemDetailView: Processing paginated structure with ${cachedData.length} pages`);
					return cachedData.map((page: any) => 
						page.filter((feedItem: any) => {
							const shouldKeep = (feedItem.item_id || feedItem.id) !== item.item_id;
							if (!shouldKeep) {
								console.log(`🗑️ ItemDetailView: Removing item ${feedItem.item_id || feedItem.id} from cache`);
							}
							return shouldKeep;
						})
					);
				} else {
					// fallbackData나 평면 배열 구조 처리
					console.log(`📋 ItemDetailView: Processing flat array with ${cachedData.length} items`);
					return cachedData.filter((feedItem: any) => {
						const shouldKeep = (feedItem.item_id || feedItem.id) !== item.item_id;
						if (!shouldKeep) {
							console.log(`🗑️ ItemDetailView: Removing item ${feedItem.item_id || feedItem.id} from flat array`);
						}
						return shouldKeep;
					});
				}
			},
			{ revalidate: false }
		)
		
		try {
			console.log(`🌐 ItemDetailView: Attempting database deletion for item ${item.item_id}`);
			
			// 2. 실제 데이터베이스에서 삭제
			const { error } = await supabase
				.from("items")
				.delete()
				.eq("id", item.item_id)
				.eq("user_id", currentUser.id) // 보안 검증
			
			if (error) throw error
			
			console.log(`✅ ItemDetailView: Database deletion successful`);
			
			// 🚀 업계 표준: 3. 성공시 최종 캐시 확정
			await mutate((key) => typeof key === "string" && (key.startsWith("items|") || key.startsWith("recipes||")))
			
			toast({
				title: `${isRecipe ? "레시피" : "레시피드"}가 삭제되었습니다.`,
			})
			
			router.push("/")
		} catch (error) {
			console.error("❌ ItemDetailView: Database deletion failed:", error)
			
			// 4. 실패시 Optimistic Update 롤백
			await mutate((key) => typeof key === "string" && (key.startsWith("items|") || key.startsWith("recipes||")))
			
			toast({
				title: "삭제에 실패했습니다.",
				description: "잠시 후 다시 시도해주세요.",
				variant: "destructive",
			})
		} finally {
			setIsDeleting(false)
			setShowDeleteModal(false)
		}
	}

	// cited_recipe_ids는 useCitedRecipes 훅에서 자동으로 관리됨

	// 🔄 item props 변경 시 로컬 상태 동기화 (useItemDetail 새로고침 시 등)
	useEffect(() => {
		console.log(`🔄 ItemDetailView: Syncing with item props - likes: ${item.likes_count}, hasLiked: ${item.is_liked}, comments: ${item.comments_count}`)
		setLocalLikesCount(item.likes_count || 0)
		setLocalHasLiked(item.is_liked || false)
		setCommentsCount(item.comments_count || 0)
	}, [item.likes_count, item.is_liked, item.comments_count])

	useEffect(() => {
		const fetchCurrentUser = async () => {
			setIsAuthLoading(true)
			const {
				data: { user },
			} = await supabase.auth.getUser()
			if (user) {
				const { data: profile } = await supabase.from("profiles").select("id, avatar_url, display_name, username, public_id").eq("id", user.id).maybeSingle()
				setCurrentUser({
					id: user.id,
					avatar_url: profile?.avatar_url || null,
					display_name: profile?.username || profile?.display_name || user.email?.split("@")[0] || "User",
				})
			}
			setIsAuthLoading(false)
		}
		fetchCurrentUser()
	}, [supabase])

	// 🚀 Optimistic Updates 시스템에서는 복잡한 구독/등록 로직 불필요
	// 모든 상태는 optimisticLikeUpdate, optimisticCommentUpdate에서 즉시 처리됨

	useEffect(() => {
		if (window.location.hash === "#comments" && commentsRef.current) {
			setTimeout(() => {
				commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
			}, 500)
		}
	}, [comments])

	const handleShare = () => {
		const url = window.location.href
		const shareData = {
			title: `Spoonie에서 ${isRecipe ? item.title : (item.display_name || "사용자") + "님의 레시피드"} 보기`,
			text: isRecipe ? item.description || "" : item.content || "",
			url: url,
		}
		share(shareData)
	}



	// 페이지 언마운트 시 홈화면과 상태 동기화
	useEffect(() => {
		return () => {
			// 🔄 페이지 이동 시 현재 아이템의 상태를 홈화면에 동기화
			console.log(`🔄 ItemDetailView: Component unmounting, syncing state for ${item.item_id}`)
			
			// 🚀 강제로 홈화면 피드 새로고침 (확실한 동기화)
			console.log(`🚀 Forcing home feed refresh for user ${currentUser?.id || "guest"}`)
			
			// 모든 홈 피드 캐시 무효화
			mutate(
				(key) => typeof key === "string" && 
				         key.startsWith(`items|`) && 
				         key.endsWith(`|${currentUser?.id || "guest"}`),
				undefined,
				{ revalidate: true } // 서버에서 다시 가져오기
			)
		}
	}, [currentUser?.id, item.item_id, mutate])

	return (
		<div className="flex flex-col h-full relative">
			{/* 비회원 블러 오버레이 */}
			{isGuest && (
				<div className="absolute inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
					<div className="bg-white rounded-2xl p-8 max-w-sm mx-auto text-center shadow-2xl">
						<div className="mb-6">
							<h2 className="text-2xl font-bold text-gray-900 mb-3">회원만 볼 수 있습니다</h2>
							<p className="text-gray-600 leading-relaxed">
								{isRecipe ? "레시피의 전체 내용을" : "레시피드의 전체 내용을"} 보시려면 로그인이 필요해요. Spoonie에서 더 많은 {isRecipe ? "레시피" : "레시피드"}를 만나보세요!
							</p>
						</div>
						<div className="space-y-3">
							<Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold">
								<Link href="/login">로그인 / 회원가입</Link>
							</Button>
							<Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-xl font-semibold" onClick={() => router.back()}>
								뒤로 가기
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* 기존 콘텐츠 (비회원일 때 블러 처리) */}
			<div className={isGuest ? "filter blur-sm pointer-events-none" : ""}>
				{/* 인스타그램 스타일 헤더 */}
				<header className="sticky top-0 z-10 flex items-center p-4 bg-white border-b">
					{/* 뒤로가기 버튼 */}
					<Button variant="ghost" size="icon" onClick={() => router.back()}>
						<ArrowLeft className="h-6 w-6" />
					</Button>
					
					{/* 작성자 정보 (중앙 정렬) */}
					<Link href={`/profile/${item.user_public_id || item.user_id}`} className="flex items-center gap-3 flex-1 ml-3">
						<Avatar className="h-8 w-8">
							<AvatarImage src={item.avatar_url || undefined} />
							<AvatarFallback>{(item.username || item.display_name)?.charAt(0) || "U"}</AvatarFallback>
						</Avatar>
						<span className="font-semibold">{item.username || item.display_name || "사용자"}</span>
					</Link>
					
					{/* 우측 액션 버튼 */}
					<div className="flex items-center">
						{isOwnItem ? (
							/* 작성자인 경우: 점3버튼 (드롭다운) */
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="h-8 w-8">
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
										<Edit className="mr-2 h-4 w-4" />
										수정
									</DropdownMenuItem>
									<DropdownMenuItem 
										onClick={() => setShowDeleteModal(true)} 
										className="text-red-600 focus:text-red-600 cursor-pointer"
									>
										<Trash2 className="mr-2 h-4 w-4" />
										삭제
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							/* 작성자가 아닌 경우: 팔로우 버튼 */
							currentUser && <FollowButton 
								userId={item.user_id} 
								initialIsFollowing={item.is_following} 
								className="w-[80px]"
							/>
						)}
					</div>
				</header>

				<div className="flex-1 overflow-y-auto">
					{orderedImages.length > 0 && <ImageCarousel images={orderedImages} alt={isRecipe ? item.title || "Recipe image" : `Post by ${item.display_name}`} priority />}
					<div className="p-4">
						{isRecipe ? (
							<>
								<div className="flex justify-between items-center mb-2">
									{item.title && <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>}
									<div className="flex items-center gap-1">
										<BookmarkButton
											itemId={stableItemId}
											itemType={isRecipe ? 'recipe' : 'post'}
											currentUserId={currentUser?.id}
											initialBookmarksCount={(cachedItem as Item & { bookmarks_count?: number }).bookmarks_count || 0}
											initialIsBookmarked={(cachedItem as Item & { is_bookmarked?: boolean }).is_bookmarked || false}
											size="icon"
											cachedItem={cachedItem}
										/>
										<Button variant="ghost" size="icon" onClick={handleShare}>
											<Share2 className="h-6 w-6 text-gray-600" />
										</Button>
									</div>
								</div>
								{item.description && <p className="text-sm text-gray-500 mb-2 whitespace-pre-wrap break-words leading-relaxed">{item.description}</p>}

								{/* 참고 레시피 표시 - 개선된 디자인 */}
								{citedRecipesLoading && (
									<div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border-l-4 border-orange-300">
										<div className="flex items-center gap-2 mb-3">
											<div className="w-4 h-4 bg-orange-300 rounded animate-pulse"></div>
											<span className="font-semibold text-orange-800">참고 레시피</span>
										</div>
										<div className="bg-white/70 p-3 rounded-lg border border-orange-200 animate-pulse">
											<div className="h-4 bg-orange-200 rounded w-3/4"></div>
										</div>
									</div>
								)}
								{!citedRecipesLoading && citedRecipes.length > 0 && (
									<div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border-l-4 border-orange-300">
										<div className="flex items-center gap-2 mb-3">
											<svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
												<path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
												<path d="M17.5 10.5c.88 0 1.73.09 2.5.26V9.24c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99zM13 12.49v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26V11.9c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.29-4.5.83zM17.5 14.33c-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26v-1.52c-.79-.15-1.64-.24-2.5-.24z" />
											</svg>
											<span className="font-semibold text-orange-800">참고 레시피</span>
											<span className="text-xs text-orange-600 bg-orange-200 px-2 py-1 rounded-full">{citedRecipes.length}개</span>
										</div>
										<div className="space-y-2">
											{citedRecipes.map((citedRecipeItem) => {
												const authorProfile = Array.isArray(citedRecipeItem.author) ? citedRecipeItem.author[0] : citedRecipeItem.author
												const authorName = authorProfile?.display_name || authorProfile?.username || "익명"
												const recipeDate = citedRecipeItem.created_at 
													? new Date(citedRecipeItem.created_at).toLocaleDateString('ko-KR', { 
															year: 'numeric', 
															month: '2-digit', 
															day: '2-digit' 
														}).replace(/\./g, '.').replace(/\s/g, '') 
													: ""

												return (
													<Link key={citedRecipeItem.id} href={`/recipes/${citedRecipeItem.id}`} className="block group">
														<div className="bg-white p-3 rounded-lg border border-orange-200 hover:border-orange-300 hover:shadow-sm transition-all duration-200 group-hover:scale-[1.02]">
															<div className="flex justify-between items-center">
																<div className="flex items-center gap-2 flex-1">
																	<div className="w-2 h-2 bg-orange-400 rounded-full group-hover:bg-orange-500 transition-colors"></div>
																	<span className="text-gray-800 text-sm font-medium group-hover:text-orange-800 transition-colors">
																		{authorName}의 {citedRecipeItem.title}
																	</span>
																</div>
																{recipeDate && <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full ml-3 flex-shrink-0">{recipeDate}</span>}
															</div>
														</div>
													</Link>
												)
											})}
										</div>
									</div>
								)}

								{item.tags && item.tags.length > 0 && (
									<div className="flex flex-wrap gap-2 mb-4 mt-3">
										{item.tags.map((tag, idx) => (
											<span key={idx} className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
												#{tag}
											</span>
										))}
									</div>
								)}
								<p className="text-sm text-gray-500 mb-4 text-right">{timeAgo(item.created_at)}</p>
								<RecipeContentView initialServings={item.servings || 1} ingredients={item.ingredients || []} steps={item.steps || []} />
							</>
						) : (
							<>
								<div className="flex justify-between items-start mb-2">
									<div className="flex-1">
										<p className="text-base text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{item.content}</p>
									</div>
									<div className="flex items-center gap-1 ml-4">
										<BookmarkButton
											itemId={stableItemId}
											itemType="post"
											currentUserId={currentUser?.id}
											initialBookmarksCount={(cachedItem as Item & { bookmarks_count?: number }).bookmarks_count || 0}
											initialIsBookmarked={(cachedItem as Item & { is_bookmarked?: boolean }).is_bookmarked || false}
											size="icon"
											cachedItem={cachedItem}
										/>
										<Button variant="ghost" size="icon" onClick={handleShare}>
											<Share2 className="h-6 w-6 text-gray-600" />
										</Button>
									</div>
								</div>

								{/* 포스트에서 태그 표시 */}
								{item.tags && item.tags.length > 0 && (
									<div className="flex flex-wrap gap-2 mt-3">
										{item.tags.map((tag, idx) => (
											<span key={idx} className="bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full text-xs font-medium">
												#{tag}
											</span>
										))}
									</div>
								)}

								{/* 포스트에서 cited_recipe_ids 참고 레시피 표시 - 개선된 디자인 */}
								{citedRecipesLoading && (
									<div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border-l-4 border-orange-300">
										<div className="flex items-center gap-2 mb-3">
											<div className="w-4 h-4 bg-orange-300 rounded animate-pulse"></div>
											<span className="font-semibold text-orange-800">참고 레시피</span>
										</div>
										<div className="bg-white/70 p-3 rounded-lg border border-orange-200 animate-pulse">
											<div className="h-4 bg-orange-200 rounded w-3/4"></div>
										</div>
									</div>
								)}
								{!citedRecipesLoading && citedRecipes.length > 0 && (
									<div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border-l-4 border-orange-300">
										<div className="flex items-center gap-2 mb-3">
											<svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
												<path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
												<path d="M17.5 10.5c.88 0 1.73.09 2.5.26V9.24c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99zM13 12.49v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26V11.9c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.29-4.5.83zM17.5 14.33c-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26v-1.52c-.79-.15-1.64-.24-2.5-.24z" />
											</svg>
											<span className="font-semibold text-orange-800">참고 레시피</span>
											<span className="text-xs text-orange-600 bg-orange-200 px-2 py-1 rounded-full">{citedRecipes.length}개</span>
										</div>
										<div className="space-y-2">
											{citedRecipes.map((citedRecipeItem) => {
												const authorProfile = Array.isArray(citedRecipeItem.author) ? citedRecipeItem.author[0] : citedRecipeItem.author
												const authorName = authorProfile?.display_name || authorProfile?.username || "익명"
												const recipeDate = citedRecipeItem.created_at 
													? new Date(citedRecipeItem.created_at).toLocaleDateString('ko-KR', { 
															year: 'numeric', 
															month: '2-digit', 
															day: '2-digit' 
														}).replace(/\./g, '.').replace(/\s/g, '') 
													: ""

												return (
													<Link key={citedRecipeItem.id} href={`/recipes/${citedRecipeItem.id}`} className="block group">
														<div className="bg-white p-3 rounded-lg border border-orange-200 hover:border-orange-300 hover:shadow-sm transition-all duration-200 group-hover:scale-[1.02]">
															<div className="flex justify-between items-center">
																<div className="flex items-center gap-2 flex-1">
																	<div className="w-2 h-2 bg-orange-400 rounded-full group-hover:bg-orange-500 transition-colors"></div>
																	<span className="text-gray-800 text-sm font-medium group-hover:text-orange-800 transition-colors">
																		{authorName}의 {citedRecipeItem.title}
																	</span>
																</div>
																{recipeDate && <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full ml-3 flex-shrink-0">{recipeDate}</span>}
															</div>
														</div>
													</Link>
												)
											})}
										</div>
									</div>
								)}

								{/* 기존 recipe_id 기반 참고 레시피 (하위호환) */}
								{item.recipe_id && citedRecipe && (
									<div className="mt-3">
										<Link href={`/recipes/${citedRecipe.id}`}>
											<div className="bg-gray-100 p-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
												<span className="font-semibold text-gray-600">참고 레시피:</span>
												<span className="text-gray-800 ml-2">
													{/* @ts-expect-error - profiles relation can be array or object */}
													{citedRecipe.profiles?.username || citedRecipe.profiles?.display_name || "익명"}의 {citedRecipe.title}
												</span>
											</div>
										</Link>
									</div>
								)}
							</>
						)}
					</div>
					<div className="flex justify-between items-center p-4 border-t">
						<div className="flex items-center gap-2 text-gray-600">
							{/* 🎯 기존 검증된 좋아요 버튼 사용 */}
							<SimplifiedLikeButton 
								itemId={item.item_id} 
								itemType={item.item_type}
								authorId={item.user_id}
								currentUserId={currentUser?.id}
								initialLikesCount={cachedItem.likes_count || localLikesCount}
								initialHasLiked={cachedItem.is_liked || localHasLiked}
								cachedItem={cachedItem}
							/>
							<div className="flex items-center gap-1">
								<MessageCircle className="h-6 w-6" />
								<span className="text-base font-medium">{commentsCount}</span>
							</div>
						</div>
					</div>

					<div ref={commentsRef} className="p-4">
						<SimplifiedCommentsSection 
							currentUserId={currentUser?.id} 
							itemId={item.item_id} 
							onCommentsCountChange={setCommentsCount}
							cachedItem={item}
						/>
					</div>
				</div>

				{/* 댓글 입력은 SimplifiedCommentsSection 내부에서 처리됨 */}
			</div>
			
			{/* 삭제 확인 다이얼로그 */}
			<AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>삭제 확인</AlertDialogTitle>
						<AlertDialogDescription>
							이 {isRecipe ? "레시피를" : "레시피드를"} 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
						<AlertDialogAction 
							onClick={handleDeleteConfirm} 
							disabled={isDeleting} 
							className="bg-red-600 hover:bg-red-700"
						>
							{isDeleting ? "삭제 중..." : "삭제"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
