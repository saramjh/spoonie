"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MessageCircle, Share2, MoreVertical, Edit, Trash2, Heart } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import FAQSchema, { commonRecipeFAQs, commonPostFAQs, platformFAQs } from "@/components/ai-search-optimization/FAQSchema"
import TossStyleFAQSection, { createTossStyleFAQs } from "@/components/common/TossStyleFAQSection"
import TossStyleBreadcrumb from "@/components/common/TossStyleBreadcrumb"
import { SimplifiedLikeButton } from "@/components/items/SimplifiedLikeButton"
import { BookmarkButton } from "@/components/items/BookmarkButton"
import FollowButton from "@/components/items/FollowButton"
import SimplifiedCommentsSection from "@/components/items/SimplifiedCommentsSection"
import LoginPromptSheet from "@/components/auth/LoginPromptSheet"
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
import { cacheManager } from "@/lib/unified-cache-manager"

interface ItemDetailViewProps {
	item: ItemDetail | null | undefined
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

	// 🛡️ early return 제거 - hooks 호출 순서 보장
	const isRecipe = item?.item_type === "recipe"

	// 🛡️ Hook 안정성을 위한 값 안정화
	const stableItemId = useMemo(() => {
		const id = item?.item_id || item?.id
		if (!id) {
			console.warn('⚠️ ItemDetailView: item에서 ID를 찾을 수 없습니다:', item)
			return null
		}
		return id
		// 의도적 최적화: item 전체가 아닌 ID 속성만 감시
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [item?.item_id, item?.id])
	
	// 🚀 SSA 표준: items 테이블 데이터에 실시간 상태 기본값 추가
	const stableFallbackData = useMemo(() => {
		if (!item || !stableItemId) {
			// 🎯 타입 안전성: 완전한 Item 타입 기본 fallback 데이터 제공
			return {
				id: stableItemId || 'unknown',
				item_id: stableItemId || 'unknown',
				user_id: '',
				item_type: 'post' as const,
				created_at: new Date().toISOString(),
				title: null,
				content: null,
				description: null,
				image_urls: [],
				thumbnail_index: 0,
				tags: null,
				is_public: true,
				color_label: null,
				servings: null,
				cooking_time_minutes: null,
				recipe_id: null,
				cited_recipe_ids: null,
				username: '',
				likes_count: 0,
				comments_count: 0,
				is_liked: false,
				is_following: false,
				bookmarks_count: 0,
				is_bookmarked: false
			}
		}
		return {
			...item,
			id: stableItemId, // 🎯 타입 안전성: 명시적 id 설정
			likes_count: item?.likes_count || 0,
			comments_count: item?.comments_count || 0,
			is_liked: item?.is_liked || false,
			is_bookmarked: item?.is_bookmarked || false,
			bookmarks_count: item?.bookmarks_count || 0
		}
	}, [item, stableItemId])

	// 🚀 SSA 발전: 실시간 캐시 업데이트 구독 (홈화면과 동일) - hooks를 조건부 렌더링 전에 호출
	const cachedItem = useSSAItemCache(stableItemId || 'null', stableFallbackData)
	
	// 🖼️ 썸네일 관리 - 캐시된 아이템의 최신 thumbnail_index 사용
	const { orderedImages } = useThumbnail({
		itemId: stableItemId || 'null',
		imageUrls: cachedItem?.image_urls || item?.image_urls || [],
		thumbnailIndex: cachedItem?.thumbnail_index ?? item?.thumbnail_index ?? 0
	})

	// SWR 호출 - 조건부 렌더링 전에 호출
	const { data: citedRecipe } = useSWR(item?.item_type === "post" && item?.recipe_id ? `recipeTitle:${item.recipe_id}` : null, fetcher)

	// cited_recipe_ids 처리 - 캐싱된 훅 사용
	const { citedRecipes, isLoading: citedRecipesLoading } = useCitedRecipes(item?.cited_recipe_ids)

	// 🚀 SSA 표준: 상태 관리 - 조건부 렌더링 전에 호출
	const [commentsCount, setCommentsCount] = useState(cachedItem?.comments_count || 0)
	const [localLikesCount, setLocalLikesCount] = useState(cachedItem?.likes_count || 0)
	const [localHasLiked, setLocalHasLiked] = useState(cachedItem?.is_liked || false)
	const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
	const [isAuthLoading, setIsAuthLoading] = useState(true)
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	
	// 🎯 더블탭 좋아요 상태 관리
	const [showHeartAnimation, setShowHeartAnimation] = useState(false)
	const [showLoginPrompt, setShowLoginPrompt] = useState(false)
	const commentsRef = useRef<HTMLDivElement>(null)

	const comments = useMemo(() => item?.comments_data || [], [item?.comments_data])
	
	// 🚀 SSA 표준: 캐시 업데이트 시 로컬 상태 동기화
	useEffect(() => {
		if (cachedItem) {
			setCommentsCount(cachedItem.comments_count || 0)
			setLocalLikesCount(cachedItem.likes_count || 0)
			setLocalHasLiked(cachedItem.is_liked || false)
		}
	}, [cachedItem])

	// 아이템 상태 동기화 useEffect
	useEffect(() => {
		setLocalLikesCount(item?.likes_count || 0)
		setLocalHasLiked(item?.is_liked || false)
		setCommentsCount(item?.comments_count || 0)
	}, [item?.likes_count, item?.is_liked, item?.comments_count])

	// 현재 사용자 조회 useEffect
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
					    display_name: profile?.username || user.email?.split("@")[0] || "User",
				})
			}
			setIsAuthLoading(false)
		}
		fetchCurrentUser()
	}, [supabase])

	// 댓글 스크롤 useEffect
	useEffect(() => {
		if (window.location.hash === "#comments" && commentsRef.current) {
			setTimeout(() => {
				commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
			}, 500)
		}
	}, [comments])

	// 페이지 언마운트 시 홈화면과 상태 동기화 useEffect
	useEffect(() => {
		return () => {
			// 🔄 페이지 이동 시 현재 아이템의 상태를 홈화면에 동기화
			// 🚀 강제로 홈화면 피드 새로고침 (확실한 동기화)
			// 모든 홈 피드 캐시 무효화
			mutate(
				(key) => typeof key === "string" && 
				         key.startsWith(`items|`) && 
				         key.endsWith(`|${currentUser?.id || "guest"}`),
				undefined,
				{ revalidate: true } // 서버에서 다시 가져오기
			)
		}
	}, [currentUser?.id, mutate])
	
	// 🎯 더블탭 좋아요 핸들러 (프로필 그리드와 동일한 SSA 기반 로직)
	const handleDoubleTapLike = async () => {
		// 🔐 비로그인 사용자 회원가입 유도 (토스 UX 스타일 - 바텀시트)
		if (!currentUser?.id) {
			setShowLoginPrompt(true)
			return
		}
		
		try {
			if (!stableItemId) return // 추가 안전장치
			
			const newHasLiked = !cachedItem.is_liked
			await cacheManager.like(stableItemId, currentUser.id, newHasLiked, cachedItem)
			
			// 🎉 토스식 마이크로 인터랙션 (React 상태 기반 안전한 애니메이션)
			if (newHasLiked) {
				setShowHeartAnimation(true)
				setTimeout(() => setShowHeartAnimation(false), 600)
			}
		} catch (error) {
			console.error('❌ 더블탭 좋아요 처리 실패:', error)
			toast({
				title: "오류가 발생했습니다",
				description: "잠시 후 다시 시도해주세요.",
				variant: "destructive",
			})
		}
	}
	
	// 🛡️ 방어적 렌더링: item이 없을 때의 처리 (hooks 호출 후)
	if (!item) {
		return (
			<div className="flex flex-col h-full items-center justify-center p-8">
				<div className="text-center space-y-4">
					<div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse mx-auto"></div>
					<div className="space-y-2">
						<div className="h-4 bg-gray-200 rounded animate-pulse w-48"></div>
						<div className="h-3 bg-gray-200 rounded animate-pulse w-32 mx-auto"></div>
					</div>
					<p className="text-gray-500 text-sm">컨텐츠를 불러오는 중...</p>
				</div>
			</div>
		)
	}
	
	// 🛡️ ID가 없으면 에러 상태 표시 - 모든 hooks 호출 후 조건부 렌더링
	if (!stableItemId) {
		return (
			<div className="flex flex-col h-full items-center justify-center p-8">
				<div className="text-center space-y-4">
					<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
						<span className="text-red-500 text-2xl">⚠️</span>
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-semibold text-gray-900">콘텐츠를 불러올 수 없습니다</h3>
						<p className="text-gray-500 text-sm">잘못된 링크이거나 삭제된 콘텐츠일 수 있습니다.</p>
					</div>
				</div>
			</div>
		)
	}

	// 비회원 여부 확인
	const isGuest = !currentUser && !isAuthLoading
	
	// 작성자 여부 확인
	const isOwnItem = currentUser && currentUser.id === item?.user_id
	
	// 수정 버튼 핸들러 (Origin 정보 포함)
	const handleEdit = () => {
		const itemId = item?.item_id || item?.id
		if (!itemId) return
		
		const baseEditPath = isRecipe ? `/recipes/${itemId}/edit` : `/posts/${itemId}/edit`
		const editPath = createLinkWithOrigin(baseEditPath)
		router.push(editPath)
	}
	
	// 🚀 업계 표준: 삭제 확인 핸들러 (PostCard와 완전히 동일한 방식)
	const handleDeleteConfirm = async () => {
		if (!currentUser || !isOwnItem) return
		
		setIsDeleting(true)
		
		
		
		// 🚀 업계 표준: 1. 모든 관련 캐시에서 즉시 제거 (Instagram/Twitter 방식)
		mutate(
			(key) => {
				const isRecipeBook = typeof key === "string" && key.startsWith("recipes||");
				const isHomeFeed = typeof key === "string" && key.startsWith("items|");
				
				return isRecipeBook || isHomeFeed;
			},
			// Note: Using any type here due to complex SWR cache structure variations
			(cachedData: any) => {
				if (!cachedData || !Array.isArray(cachedData)) {
					return cachedData;
				}
				
				// 🚀 더 정확한 구조 감지: useSWRInfinite 페이지 구조 vs 평면 배열
				const hasPageStructure = cachedData.length > 0 && 
				                         Array.isArray(cachedData[0]) && 
				                         (cachedData[0].length === 0 || typeof cachedData[0][0] === 'object');
				
				if (hasPageStructure) {
					
					return cachedData.map((page: any) => 
						page.filter((feedItem: any) => {
							const shouldKeep = (feedItem.item_id || feedItem.id) !== item.item_id;
							if (!shouldKeep) {
							}
							return shouldKeep;
						})
					);
				} else {
					// fallbackData나 평면 배열 구조 처리

					return cachedData.filter((feedItem: any) => {
						const shouldKeep = (feedItem.item_id || feedItem.id) !== item.item_id;
						if (!shouldKeep) {
						}
						return shouldKeep;
					});
				}
			},
			{ revalidate: false }
		)
		
		try {
	
			
			// 2. 실제 데이터베이스에서 삭제
			const { error } = await supabase
				.from("items")
				.delete()
				.eq("id", item.item_id)
				.eq("user_id", currentUser.id) // 보안 검증
			
			if (error) throw error
			

			
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

	// 🚀 Optimistic Updates 시스템에서는 복잡한 구독/등록 로직 불필요
	// 모든 상태는 optimisticLikeUpdate, optimisticCommentUpdate에서 즉시 처리됨

	const handleShare = () => {
		const url = window.location.href
		const shareData = {
			    title: `Spoonie에서 ${isRecipe ? item.title : (item.username || "사용자") + "님의 레시피드"} 보기`,
			text: isRecipe ? item.description || "" : item.content || "",
			url: url,
		}
		share(shareData)
	}





	// AI 검색 최적화: FAQ 데이터 준비
	const itemSpecificFAQs = isRecipe ? [
		{
			question: `${item.title || '이 레시피'}는 몇 인분인가요?`,
			answer: item.servings ? `${item.servings}인분입니다.` : '레시피 정보를 확인해주세요.'
		},
		{
			question: `${item.title || '이 레시피'} 조리 시간은 얼마나 걸리나요?`,
			answer: item.cooking_time_minutes ? `약 ${item.cooking_time_minutes}분 소요됩니다.` : '조리 시간은 레시피 정보를 참고해주세요.'
		},
		...commonRecipeFAQs
	] : commonPostFAQs

	// 🎨 토스 스타일 FAQ 데이터 준비
	const tossStyleFAQs = isRecipe 
		? createTossStyleFAQs.recipe(
			item.title || '이 레시피', 
			item.servings ?? undefined, 
			item.cooking_time_minutes ?? undefined
		)
		            : createTossStyleFAQs.post(item.username || '작성자')

	return (
		<div className="flex flex-col h-full relative">
			{/* AI 검색 최적화: FAQ Schema */}
			<FAQSchema 
				faqs={[...itemSpecificFAQs, ...platformFAQs]}
				pageTitle={item.title || (isRecipe ? '레시피' : '레시피드')}
			/>
			
			{/* 🎨 토스 스타일 브레드크럼 네비게이션 */}
			<TossStyleBreadcrumb />
			{/* 비회원 블러 오버레이 - Toss-style 상단 정렬 (약한 블러) */}
			{isGuest && (
				<div className="absolute inset-0 z-50 bg-black/15 flex items-start justify-center p-6 pt-8 sm:pt-12">
					<div className="bg-white rounded-3xl p-8 max-w-sm mx-auto text-center shadow-2xl border border-gray-100">
						<div className="mb-6">
							<h2 className="text-xl font-bold text-gray-900 mb-2">회원만 볼 수 있습니다</h2>
							<p className="text-sm text-gray-600 leading-relaxed">
								{isRecipe ? "레시피의 전체 내용을" : "레시피드의 전체 내용을"} 보시려면 로그인이 필요해요. Spoonie에서 더 많은 {isRecipe ? "레시피" : "레시피드"}를 만나보세요!
							</p>
						</div>
						<div className="space-y-3">
							<Button asChild className="w-full h-14 text-base font-semibold bg-orange-500 hover:bg-orange-600 rounded-2xl">
								<Link href="/login">로그인 / 회원가입</Link>
							</Button>
							<Button variant="outline" className="w-full h-14 text-base font-medium border-2 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl" onClick={() => router.back()}>
								뒤로 가기
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* 기존 콘텐츠 (비회원일 때 블러 처리 - 아주 약함) */}
			<div className={isGuest ? "filter blur-[1px] pointer-events-none" : ""}>
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
							<AvatarFallback>{item.username?.charAt(0) || "U"}</AvatarFallback>
						</Avatar>
						<span className="font-semibold">{item.username || "사용자"}</span>
					</Link>
					
					{/* 우측 액션 버튼 */}
					<div className="flex items-center">
						{isOwnItem ? (
							/* 작성자인 경우: 점3버튼 (드롭다운) */
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-auto min-w-[80px]">
									<DropdownMenuItem onClick={handleEdit} className="cursor-pointer relative flex items-center justify-start px-3 py-2">
										<Edit className="h-4 w-4 flex-shrink-0" />
										<span className="flex-1 text-center">수정</span>
									</DropdownMenuItem>
									<DropdownMenuItem 
										onClick={() => setShowDeleteModal(true)} 
										className="text-red-600 cursor-pointer relative flex items-center justify-start px-3 py-2"
									>
										<Trash2 className="h-4 w-4 flex-shrink-0" />
										<span className="flex-1 text-center">삭제</span>
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
					{orderedImages.length > 0 && (
						<div className="relative">
							<ImageCarousel 
								images={orderedImages} 
								alt={isRecipe ? item.title || "Recipe image" : `Post by ${item.username || "작성자"}`} 
								priority 
								onDoubleClick={handleDoubleTapLike}
							/>
							
							{/* 🎉 토스식 더블탭 좋아요 애니메이션 */}
							{showHeartAnimation && (
								<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
									<Heart className="w-16 h-16 fill-red-500 text-red-500 animate-ping" />
								</div>
							)}
						</div>
					)}
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
												    const authorName = authorProfile?.username || "익명"
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
												    const authorName = authorProfile?.username || "익명"
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
													        {citedRecipe.profiles?.username || "익명"}의 {citedRecipe.title}
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
								itemId={stableItemId} 
								itemType={item.item_type}
								authorId={item.user_id}
								currentUserId={currentUser?.id}
								initialLikesCount={cachedItem?.likes_count || localLikesCount}
								initialHasLiked={cachedItem?.is_liked || localHasLiked}
								cachedItem={cachedItem}
							/>
							<div className="flex items-center gap-1">
								<MessageCircle className="h-6 w-6" />
								<span className="text-base font-medium">{commentsCount}</span>
							</div>
						</div>
					</div>

					{/* 🎨 토스 스타일 FAQ 섹션 */}
					<div className="px-4 py-6 bg-gray-50">
						<TossStyleFAQSection 
							faqs={tossStyleFAQs}
							title="자주 묻는 질문"
						/>
					</div>

					<div ref={commentsRef} className="p-4">
						<SimplifiedCommentsSection 
							currentUserId={currentUser?.id} 
							itemId={stableItemId} 
							onCommentsCountChange={setCommentsCount}
							cachedItem={cachedItem || item}
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
			
			{/* 🎨 토스 스타일 로그인 유도 바텀시트 */}
			<LoginPromptSheet
				isOpen={showLoginPrompt}
				onClose={() => setShowLoginPrompt(false)}
				action="like"
			/>
		</div>
	)
}
