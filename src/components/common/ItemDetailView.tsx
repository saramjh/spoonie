"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "@/lib/navigation"
import { ArrowLeft, MessageCircle, Share2, MoreVertical, Edit, Trash2, Heart } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { SimplifiedLikeButton } from "@/components/items/SimplifiedLikeButton"
import { BookmarkButton } from "@/components/items/BookmarkButton"
import FollowButton from "@/components/items/FollowButton"
import SimplifiedCommentsSection from "@/components/items/SimplifiedCommentsSection"
import LoginPromptSheet from "@/components/auth/LoginPromptSheet"
import ImageCarousel from "@/components/common/ImageCarousel"
import RecipeContentView from "@/components/recipe/RecipeContentView"
import { cn, timeAgo } from "@/lib/utils"
import { formatCookingTime } from "@/lib/recipe-amount"
import { useShare } from "@/hooks/useShare"
import { useNavigation } from "@/hooks/useNavigation"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import useSWR, { useSWRConfig } from "swr"
import { Item, ItemDetail } from "@/types/item"
import Link from "next/link"
import Image from "next/image"

import { useCitedRecipes, useRecipeRelations } from "@/hooks/useCitedRecipes"
import SourceLine from "@/components/items/SourceLine"
import { useThumbnail } from "@/hooks/useThumbnail"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import { cacheManager } from "@/lib/unified-cache-manager"
import { IntentLink, SectionHeading, Sheet } from "@/components/kit"

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

	// early return 제거 - hooks 호출 순서 보장
	const isRecipe = item?.item_type === "recipe"

	// Hook 안정성을 위한 값 안정화
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
	
	// SSA 표준: items 테이블 데이터에 실시간 상태 기본값 추가
	const stableFallbackData = useMemo(() => {
		if (!item || !stableItemId) {
			// 타입 안전성: 완전한 Item 타입 기본 fallback 데이터 제공
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
			id: stableItemId, // 타입 안전성: 명시적 id 설정
			likes_count: item?.likes_count || 0,
			comments_count: item?.comments_count || 0,
			is_liked: item?.is_liked || false,
			is_bookmarked: item?.is_bookmarked || false,
			bookmarks_count: item?.bookmarks_count || 0
		}
	}, [item, stableItemId])

	// SSA 발전: 실시간 캐시 업데이트 구독 (홈화면과 동일) - hooks를 조건부 렌더링 전에 호출
	const cachedItem = useSSAItemCache(stableItemId || 'null', stableFallbackData)
	
	// 썸네일 관리 - 캐시된 아이템의 최신 thumbnail_index 사용
	const { orderedImages } = useThumbnail({
		itemId: stableItemId || 'null',
		imageUrls: cachedItem?.image_urls || item?.image_urls || [],
		thumbnailIndex: cachedItem?.thumbnail_index ?? item?.thumbnail_index ?? 0
	})

	// SWR 호출 - 조건부 렌더링 전에 호출
	const { data: citedRecipe } = useSWR(item?.item_type === "post" && item?.recipe_id ? `recipeTitle:${item.recipe_id}` : null, fetcher)

	// cited_recipe_ids 처리 - 캐싱된 훅 사용
	const { citedRecipes, isLoading: citedRecipesLoading } = useCitedRecipes(item?.cited_recipe_ids)
	const relations = useRecipeRelations(isRecipe ? item?.item_id || item?.id : null)

	// SSA 표준: 상태 관리 - 조건부 렌더링 전에 호출
	// commentsCount는 캐시에서 직접 사용 (실시간 동기화)
	const [localLikesCount, setLocalLikesCount] = useState(cachedItem?.likes_count || 0)
	const [localHasLiked, setLocalHasLiked] = useState(cachedItem?.is_liked || false)
	const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
	const [, setIsAuthLoading] = useState(true)
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	
	// 더블탭 좋아요 상태 관리
	const [showHeartAnimation, setShowHeartAnimation] = useState(false)
	const [showLoginPrompt, setShowLoginPrompt] = useState(false)
	const commentsRef = useRef<HTMLDivElement>(null)

	const comments = useMemo(() => item?.comments_data || [], [item?.comments_data])
	
	// SSA 표준: 캐시 업데이트 시 로컬 상태 동기화
	useEffect(() => {
		if (cachedItem) {
			// commentsCount 제거 - 캐시에서 직접 사용
			setLocalLikesCount(cachedItem.likes_count || 0)
			setLocalHasLiked(cachedItem.is_liked || false)
		}
	}, [cachedItem])

	// 아이템 상태 동기화 useEffect
	useEffect(() => {
		setLocalLikesCount(item?.likes_count || 0)
		setLocalHasLiked(item?.is_liked || false)
		// commentsCount 제거 - 캐시에서 직접 사용
	}, [item?.likes_count, item?.is_liked])

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
			// 페이지 이동 시 현재 아이템의 상태를 홈화면에 동기화
			// 강제로 홈화면 피드 새로고침 (확실한 동기화)
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
	
	// 더블탭 좋아요 핸들러 (프로필 그리드와 동일한 SSA 기반 로직)
	const handleDoubleTapLike = async () => {
		// 비로그인 사용자 회원가입 유도 (토스 UX 스타일 - 바텀시트)
		if (!currentUser?.id) {
			setShowLoginPrompt(true)
			return
		}
		
		try {
			if (!stableItemId) return // 추가 안전장치
			
			const newHasLiked = !cachedItem.is_liked
			await cacheManager.like(stableItemId, currentUser.id, newHasLiked, cachedItem)
			
			// 토스식 마이크로 인터랙션 (React 상태 기반 안전한 애니메이션)
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
	
	// 방어적 렌더링: item이 없을 때의 처리 (hooks 호출 후)
	if (!item) {
		return (
			<div className="flex flex-col h-full items-center justify-center p-8">
				<div className="text-center space-y-4">
					<div className="w-16 h-16 bg-border rounded-full animate-pulse mx-auto"></div>
					<div className="space-y-2">
						<div className="h-4 bg-border rounded animate-pulse w-48"></div>
						<div className="h-3 bg-border rounded animate-pulse w-32 mx-auto"></div>
					</div>
					<p className="text-ink-soft text-sm">컨텐츠를 불러오는 중...</p>
				</div>
			</div>
		)
	}
	
	// ID가 없으면 에러 상태 표시 - 모든 hooks 호출 후 조건부 렌더링
	if (!stableItemId) {
		return (
			<div className="flex flex-col h-full items-center justify-center p-8">
				<div className="text-center space-y-4">
					<div className="space-y-2">
						<h3 className="text-lg font-semibold text-ink">콘텐츠를 불러올 수 없습니다</h3>
						<p className="text-ink-soft text-sm">잘못된 링크이거나 삭제된 콘텐츠일 수 있습니다.</p>
					</div>
				</div>
			</div>
		)
	}

	
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
	
	// 업계 표준: 삭제 확인 핸들러 (PostCard와 완전히 동일한 방식)
	const handleDeleteConfirm = async () => {
		if (!currentUser || !isOwnItem) return
		
		setIsDeleting(true)
		
		
		
		// 업계 표준: 1. 모든 관련 캐시에서 즉시 제거 (Instagram/Twitter 방식)
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
				
				// 더 정확한 구조 감지: useSWRInfinite 페이지 구조 vs 평면 배열
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
			

			
			// 업계 표준: 3. 성공시 최종 캐시 확정
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

	// Optimistic Updates 시스템에서는 복잡한 구독/등록 로직 불필요
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





	const authorName = item.username || "사용자"
	const cookingTime = formatCookingTime(item.cooking_time_minutes)
	const ingredientCount = item.ingredients?.length || 0

	// 이 글이 참고한 레시피: 종이 뒤로 겹쳐 붙은 다른 종이의 가장자리로 보여 준다
	const renderCitedPeek = () => {
		if (!isRecipe || citedRecipesLoading || citedRecipes.length === 0) return null
		const shown = citedRecipes.slice(0, 2)
		return (
			<nav aria-label="참고한 레시피" className="relative z-0 mx-2 -mb-1.5">
				{shown.map((cited, i) => {
					const authorProfile = Array.isArray(cited.author) ? cited.author[0] : cited.author
					return (
						<IntentLink
							key={cited.id}
							href={`/recipes/${cited.id}`}
							className={cn(
								"block rounded-t-[3px] bg-paper px-3 pb-3 pt-2 text-sm shadow-sheet",
								i === 0 ? "-rotate-[0.6deg]" : "-mt-1 mx-1 rotate-[0.4deg]"
							)}
						>
							<span className="text-ink-soft">참고한 레시피 </span>
							<span className="font-semibold text-ink">{authorProfile?.username || "익명"}의 {cited.title}</span>
							{i === shown.length - 1 && citedRecipes.length > shown.length && (
								<span className="text-ink-soft"> 외 {citedRecipes.length - shown.length}개</span>
							)}
						</IntentLink>
					)
				})}
			</nav>
		)
	}

	// 요리한 경험을 나누려 할 때 가입을 권한다: 비로그인이면 로그인 후 바로 그 작성 화면으로 이어진다
	const requireLogin = (href: string) => (currentUser ? href : `/login?next=${encodeURIComponent(href)}`)

	// 이 레시피에서 나온 것들: 만들어 본 기록(레시피드)과 이어진 레시피(레시피). 행동은 그 머리에 둔다.
	const renderRecipeGraph = () => {
		if (!isRecipe) return null
		return (
			<section aria-labelledby="made-heading" className="border-t border-border px-4 pb-5 pt-5">
				<SectionHeading id="made-heading">
					만들어 본 기록 {relations.made.length > 0 && <span className="font-medium tabular-nums text-ink-soft">{relations.made.length}</span>}
				</SectionHeading>
				{relations.made.length > 0 && (
					<ul className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
						{relations.made.map((made) => (
							<li key={made.id} className="w-28 flex-shrink-0">
								<IntentLink href={`/posts/${made.id}`} className="block">
									<div className="relative aspect-square overflow-hidden rounded-[2px] bg-muted">
										{made.image_url && <Image src={made.image_url} alt="" fill sizes="112px" className="object-cover" />}
									</div>
									<p className="mt-1 truncate text-[13px] text-ink-soft">{made.username}</p>
								</IntentLink>
							</li>
						))}
					</ul>
				)}
				<Button asChild variant="outline" className="mt-3 w-full">
					<IntentLink href={requireLogin(`/posts/new?source=${stableItemId}&origin=recipe_detail`)}>이 레시피로 만들었어요</IntentLink>
				</Button>

				{relations.continued.length > 0 && (
					<>
						<h2 className="mt-6 text-lg font-bold text-ink">
							이어진 레시피 <span className="font-medium tabular-nums text-ink-soft">{relations.continued.length}</span>
						</h2>
						<ul className="mt-2 divide-y divide-border">
							{relations.continued.map((next) => (
								<li key={next.id}>
									<IntentLink href={`/recipes/${next.id}`} className="flex min-h-12 items-center gap-2 py-2.5 text-[15px] text-ink">
										<span className="min-w-0 truncate">
											{next.username}의 <span className="font-semibold">{next.title}</span>
										</span>
										{next.relation_type === "adapted" && <span className="flex-shrink-0 text-sm text-ink-soft">고친 버전</span>}
									</IntentLink>
								</li>
							))}
						</ul>
					</>
				)}
				<Link
					href={requireLogin(`/recipes/new?fork=${stableItemId}`)}
					className="mt-3 inline-flex min-h-11 items-center text-[15px] font-medium text-ink underline underline-offset-4"
				>
					참고해서 내 레시피 만들기
				</Link>
			</section>
		)
	}

	return (
		<div className="flex flex-col h-full relative">
			<article>
				<header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b border-border bg-paper px-1">
					<Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => router.back()} aria-label="뒤로 가기">
						<ArrowLeft className="h-6 w-6" aria-hidden />
					</Button>

					<IntentLink href={`/profile/${item.user_public_id || item.user_id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
						<Avatar className="h-8 w-8">
							<AvatarImage src={item.avatar_url || undefined} alt="" />
							<AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
						</Avatar>
						<span className="truncate font-semibold text-ink">{authorName}</span>
						<span className="flex-shrink-0 text-sm text-ink-soft">{isRecipe ? "레시피" : "레시피드"}</span>
					</IntentLink>

					<div className="flex items-center pr-1">
						{isOwnItem ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="h-11 w-11" aria-label="더보기">
										<MoreVertical className="h-5 w-5" aria-hidden />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="min-w-[8rem]">
									<DropdownMenuItem onClick={handleEdit} className="min-h-11 cursor-pointer gap-2">
										<Edit className="h-4 w-4" aria-hidden />
										수정
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={() => setShowDeleteModal(true)} className="min-h-11 cursor-pointer gap-2 text-destructive focus:text-destructive">
										<Trash2 className="h-4 w-4" aria-hidden />
										삭제
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							currentUser && <FollowButton userId={item.user_id} initialIsFollowing={item.is_following} className="w-[80px]" />
						)}
					</div>
				</header>

				<div className="flex-1 px-3 pb-8 pt-3">
					{renderCitedPeek()}

					<Sheet className="relative z-10">
						{!isRecipe && !citedRecipesLoading && (
							<SourceLine recipes={citedRecipes} creationOrigin={item.creation_origin} className="border-b border-border px-4 py-3" />
						)}

						{orderedImages.length > 0 && (
							<div className="relative overflow-hidden rounded-t-[3px]">
								<ImageCarousel
									images={orderedImages}
									alt={isRecipe ? item.title || "레시피 사진" : `${authorName}님의 레시피드 사진`}
									frame={isRecipe ? "recipe" : "recipeed"}
									priority
									onDoubleClick={handleDoubleTapLike}
								/>
								{showHeartAnimation && (
									<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
										<Heart className="h-16 w-16 animate-ping fill-[#D6453D] text-[#D6453D]" aria-hidden />
									</div>
								)}
							</div>
						)}

						<div className="px-4 pb-1 pt-6">
							{isRecipe ? (
								<>
									{item.title && <h1 className="text-[26px] font-bold leading-tight tracking-[-0.01em] text-ink [text-wrap:balance]">{item.title}</h1>}
									<p className="mt-2 text-[15px] text-ink-soft">
										{[item.servings ? `${item.servings}인분` : null, cookingTime ? `조리 ${cookingTime}` : null, ingredientCount ? `재료 ${ingredientCount}가지` : null]
											.filter(Boolean)
											.join(" · ")}
										{" · "}
										<time dateTime={item.created_at}>{timeAgo(item.created_at)}</time>
									</p>
									{item.description && <p className="mt-4 whitespace-pre-wrap break-words text-[16px] leading-[1.65] text-ink">{item.description}</p>}
								</>
							) : (
								<>
									{/* 레시피드는 사진과 글이 주인공이라 제목을 키우지 않는다 (DESIGN.md Interface Grammar 1) */}
									{item.title && <h1 className="mb-1.5 text-[17px] font-semibold text-ink">{item.title}</h1>}
									<p className="whitespace-pre-wrap break-words text-[16px] leading-[1.7] text-ink">{item.content}</p>
								</>
							)}

							{item.tags && item.tags.length > 0 && (
								<ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1" aria-label="태그">
									{item.tags.map((tag, idx) => (
										<li key={idx} className="text-[15px] text-ink-soft">
											#{tag}
										</li>
									))}
								</ul>
							)}

							{/* 기존 recipe_id 기반 참고 레시피 (하위호환) */}
							{!isRecipe && item.recipe_id && citedRecipe && (
								<IntentLink href={`/recipes/${citedRecipe.id}`} className="mt-4 block text-[15px] text-ink underline underline-offset-4">
									{/* @ts-expect-error - profiles relation can be array or object */}
									참고한 레시피: {citedRecipe.profiles?.username || "익명"}의 {citedRecipe.title}
								</IntentLink>
							)}

							{!isRecipe && (
								<p className="mt-3 text-sm text-ink-soft">
									<time dateTime={item.created_at}>{timeAgo(item.created_at)}</time>
								</p>
							)}
						</div>

						<div className="flex items-center justify-between px-2 py-1">
							<div className="flex items-center gap-1 text-ink-soft">
								<SimplifiedLikeButton
									itemId={stableItemId}
									itemType={item.item_type}
									authorId={item.user_id}
									currentUserId={currentUser?.id}
									initialLikesCount={cachedItem?.likes_count || localLikesCount}
									initialHasLiked={cachedItem?.is_liked || localHasLiked}
									cachedItem={cachedItem}
								/>
								<a href="#comments" className="flex h-11 items-center gap-1.5 px-2" aria-label={`댓글 ${cachedItem?.comments_count || 0}개`}>
									<MessageCircle className="h-5 w-5" aria-hidden />
									<span className="text-sm font-medium tabular-nums">{cachedItem?.comments_count || 0}</span>
								</a>
							</div>
							<div className="flex items-center">
								<BookmarkButton
									itemId={stableItemId}
									itemType={isRecipe ? "recipe" : "post"}
									currentUserId={currentUser?.id}
									initialBookmarksCount={(cachedItem as Item & { bookmarks_count?: number }).bookmarks_count || 0}
									initialIsBookmarked={(cachedItem as Item & { is_bookmarked?: boolean }).is_bookmarked || false}
									size="icon"
									className="h-11 w-11"
									cachedItem={cachedItem}
								/>
								<Button variant="ghost" size="icon" className="h-11 w-11 text-ink-soft" onClick={handleShare} aria-label="공유하기">
									<Share2 className="h-5 w-5" aria-hidden />
								</Button>
							</div>
						</div>

						{isRecipe && (
							<RecipeContentView
								initialServings={item.servings || 1}
								ingredients={item.ingredients || []}
								steps={item.steps || []}
								recipeId={stableItemId}
							/>
						)}

						{renderRecipeGraph()}
					</Sheet>

					<div id="comments" ref={commentsRef} className="mt-3 scroll-mt-16 rounded-[3px] bg-paper p-4 shadow-sheet">
						<h2 className="mb-3 text-lg font-bold text-ink">
							댓글 {(cachedItem?.comments_count || 0) > 0 && <span className="font-medium tabular-nums text-ink-soft">{cachedItem?.comments_count}</span>}
						</h2>
						<SimplifiedCommentsSection currentUserId={currentUser?.id} itemId={stableItemId} onCommentsCountChange={undefined} cachedItem={cachedItem || item} />
					</div>
				</div>
			</article>

			{/* 삭제 확인 다이얼로그 */}
			<AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>정말 삭제할까요?</AlertDialogTitle>
						<AlertDialogDescription>
							이 {isRecipe ? "레시피를" : "레시피드를"} 삭제하면 되돌릴 수 없어요.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
						<AlertDialogAction 
							onClick={handleDeleteConfirm} 
							disabled={isDeleting} 
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? "삭제 중..." : "삭제"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			
			{/* 토스 스타일 로그인 유도 바텀시트 */}
			<LoginPromptSheet
				isOpen={showLoginPrompt}
				onClose={() => setShowLoginPrompt(false)}
				action="like"
			/>
		</div>
	)
}
