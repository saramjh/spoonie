"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "@/shared/lib/navigation"
import { ArrowLeft, MessageCircle, Share2, MoreVertical, Edit, Trash2, Heart } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { LikeButton } from "@/components/items/LikeButton"
import { BookmarkButton } from "@/components/items/BookmarkButton"
import FollowButton from "@/components/items/FollowButton"
import CommentsSection from "@/components/items/CommentsSection"
import LoginPromptSheet from "@/components/auth/LoginPromptSheet"
import ImageCarousel from "@/components/common/ImageCarousel"
import { publicContentTitle } from "@/features/discovery/domain/search-exposure"
import RecipeContentView from "@/features/recipe/components/RecipeContentView"
import { RecipeActivity } from "@/features/recipe/components/RecipeActivity"
import RecipeCard from "@/features/recipe/components/RecipeCard"
import { cn } from "@/lib/utils"
import { formatCookingTime } from "@/features/recipe/domain/recipe-amount"
import { useShare } from "@/hooks/useShare"
import { useNavigation } from "@/hooks/useNavigation"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { useSWRConfig } from "swr"
import { Item, ItemDetail } from "@/types/item"
import Link from "next/link"

import { useAuthorRecipes, useCitedRecipes, useRecipeRelations } from "@/features/recipe/hooks/useCitedRecipes"
import { orderImagesForDisplay } from "@/shared/lib/thumbnail"
import { useItemCache } from "@/hooks/useItemCache"
import { cacheManager } from "@/shared/infra/unified-cache-manager"
import { IntentLink, MadeProof, Photo, RelativeTime, SectionHeading, Sheet, SourceRow } from "@/components/kit"
import { revalidateItemPage } from "@/shared/infra/revalidate-item"
import { logEvent } from "@/shared/infra/events"
import { cameFrom } from "@/shared/lib/surface"
import { collectItemImageUrls, removeItemImages } from "@/shared/infra/item-images"
import { deleteOwnItem } from "@/features/feed/data/item-detail"
import { topicHref } from "@/shared/lib/topics"
import { fetchProfileSummary } from "@/features/profile/data/profile-repository"

interface ItemDetailViewProps {
	item: ItemDetail | null | undefined
}

interface CurrentUser {
	id: string
	avatar_url: string | null
	display_name: string
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
	const cachedItem = useItemCache(stableItemId || 'null', stableFallbackData)
	
	// 썸네일 관리 - 캐시된 아이템의 최신 thumbnail_index 사용
	const orderedImages = orderImagesForDisplay(cachedItem?.image_urls || item?.image_urls, cachedItem?.thumbnail_index ?? item?.thumbnail_index)

	// SWR 호출 - 조건부 렌더링 전에 호출

	// cited_recipe_ids 처리 - 캐싱된 훅 사용
	const { citedRecipes, isLoading: citedRecipesLoading } = useCitedRecipes(item?.cited_recipe_ids)
	const relations = useRecipeRelations(isRecipe ? item?.item_id || item?.id : null)
	// 레시피드: 같은 레시피로 만든 다른 기록 (출처 레시피의 관계에서 이 글을 뺀 것)
	const sourceRelations = useRecipeRelations(!isRecipe ? item?.cited_recipe_ids?.[0] : null)
	// 작성자의 다른 레시피 (작성자 발견)
	const authorRecipes = useAuthorRecipes(item?.user_id, item?.item_id || item?.id)

	// SSA 표준: 상태 관리 - 조건부 렌더링 전에 호출
	// commentsCount는 캐시에서 직접 사용 (실시간 동기화)
	const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
	const [isAuthLoading, setIsAuthLoading] = useState(true)
	const [showDeleteModal, setShowDeleteModal] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	
	// 더블탭 좋아요 상태 관리
	const [showHeartAnimation, setShowHeartAnimation] = useState(false)
	const [showLoginPrompt, setShowLoginPrompt] = useState(false)
	const commentsRef = useRef<HTMLDivElement>(null)

	const comments = useMemo(() => item?.comments_data || [], [item?.comments_data])
	
	// 로그인 사용자 기준으로 다시 받은 값(내 좋아요·저장, 최신 수)을 화면 캐시에 반영한다.
	// 미리 만든 공개 페이지의 값으로 처음 채워진 캐시는 그대로 두면 바뀌지 않는다.
	useEffect(() => {
		if (!stableItemId || !item) return
		mutate(
			`itemDetail|${stableItemId}`,
			(prev: Item | undefined) =>
				prev
					? {
							...prev,
							likes_count: item.likes_count ?? prev.likes_count,
							is_liked: item.is_liked ?? prev.is_liked,
							comments_count: item.comments_count ?? prev.comments_count,
							is_bookmarked: (item as Item & { is_bookmarked?: boolean }).is_bookmarked ?? (prev as Item & { is_bookmarked?: boolean }).is_bookmarked,
						}
					: prev,
			{ revalidate: false }
		)
		// item의 사용자 기준 값이 바뀔 때만 (다시 받기 완료 시점)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stableItemId, item?.likes_count, item?.is_liked, item?.comments_count, (item as Item & { is_bookmarked?: boolean })?.is_bookmarked])

	// 현재 사용자 조회 useEffect
	useEffect(() => {
		const fetchCurrentUser = async () => {
			setIsAuthLoading(true)
			const {
				data: { user },
			} = await supabase.auth.getUser()
			if (user) {
				const profile = await fetchProfileSummary(supabase, user.id)
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

	// 상세 열람 기록: auth 확인 뒤 비회원까지 GA4에 남긴다.
	// 로그인 사용자는 events.ts가 Supabase에도 쓰며, 본인 글 열람은 분석에서 제외한다.
	const loggedOpenRef = useRef<string | null>(null)
	useEffect(() => {
		if (isAuthLoading || !item?.user_id || !stableItemId || loggedOpenRef.current === stableItemId) return
		loggedOpenRef.current = stableItemId
		if (currentUser?.id === item.user_id) return
		logEvent("detail_open", stableItemId, cameFrom(window.location.pathname).surface)
	}, [isAuthLoading, currentUser?.id, item?.user_id, stableItemId])

	// 댓글 스크롤 useEffect
	useEffect(() => {
		if (window.location.hash === "#comments" && commentsRef.current) {
			setTimeout(() => {
				commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
			}, 500)
		}
	}, [comments])

	
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
					<p className="text-ink-soft text-meta">컨텐츠를 불러오는 중...</p>
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
						<h3 className="text-heading text-ink">콘텐츠를 불러올 수 없습니다</h3>
						<p className="text-ink-soft text-meta">잘못된 링크이거나 삭제된 콘텐츠일 수 있습니다.</p>
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
		
		
		
		// 1. 모든 목록·상세 캐시에서 바로 뺀다. 실패하면 rollback이 목록을 다시 받는다
		const rollback = await cacheManager.deleteItems([item.item_id])

		try {
	
			
			// 2. 실제 데이터베이스에서 삭제
			// 글이 지워지면 사진 목록도 사라지므로 먼저 모아 둔다
			const imageUrls = await collectItemImageUrls(supabase, [item.item_id])
			const { error } = await deleteOwnItem(supabase, item.item_id, currentUser.id) // 보안 검증
			
			if (error) throw error
			revalidateItemPage(item.item_id, item.tags ?? []) // 상세 + 검색 자산에서 즉시 제거
			removeItemImages(imageUrls) // 지운 글의 사진 파일도 지운다
			

			
			toast({
				title: `${isRecipe ? "레시피" : "레시피드"}가 삭제되었습니다.`,
			})
			
			router.push("/")
		} catch (error) {
			console.error("❌ ItemDetailView: Database deletion failed:", error)
			
			rollback()
			
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
		share({ ...shareData, itemId: stableItemId, origin: "detail" })
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
								"block rounded-t-[3px] bg-paper px-3 pb-3 pt-2 text-label shadow-sheet",
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

	// 다른 사람이 만든 기록(사람 수)과 사진, 이어진 레시피 수 — 작성자 본인의 글은 증거에서 뺀다
	const madeByOthers = (() => {
		const others = relations.made.filter((r) => r.user_id !== item.user_id)
		return { count: new Set(others.map((r) => r.user_id)).size, thumbs: others.map((r) => r.image_url).filter((u): u is string => !!u).slice(0, 3) }
	})()
	const continuedByOthers = relations.continued.filter((r) => r.user_id !== item.user_id).length
	const siblingRecords = sourceRelations.made.filter((r) => r.id !== stableItemId)

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
								<IntentLink href={`/posts/${made.id}`} className="block" onClick={() => logEvent("related_open", made.id, `recipe_made:${stableItemId}`)}>
									<div className="relative aspect-square overflow-hidden rounded-[2px] bg-muted">
										{made.image_url && <Photo src={made.image_url} sizes="112px" />}
									</div>
									<p className="mt-1 truncate text-meta text-ink-soft">{made.username}</p>
								</IntentLink>
							</li>
						))}
					</ul>
				)}
				<Button asChild variant="outline" className="mt-3 w-full">
					<IntentLink href={requireLogin(`/posts/new?source=${stableItemId}&origin=recipe_detail`)} onClick={() => logEvent("recipeed_start", stableItemId, "recipe_detail")}>이 레시피로 만들었어요</IntentLink>
				</Button>

				{relations.continued.length > 0 && (
					<>
						<h2 className="mt-6 text-heading text-ink">
							이어진 레시피 <span className="font-medium tabular-nums text-ink-soft">{relations.continued.length}</span>
						</h2>
						<ul className="mt-2 divide-y divide-border">
							{relations.continued.map((next) => (
								<li key={next.id}>
									<IntentLink href={`/recipes/${next.id}`} onClick={() => logEvent("related_open", next.id, `continued:${stableItemId}`)} className="flex min-h-12 items-center gap-2 py-2.5 text-label text-ink">
										<span className="min-w-0 truncate">
											{next.username}의 <span className="font-semibold">{next.title}</span>
										</span>
										{next.relation_type === "adapted" && <span className="flex-shrink-0 text-meta text-ink-soft">고친 버전</span>}
									</IntentLink>
								</li>
							))}
						</ul>
					</>
				)}
				<Link
					href={requireLogin(`/recipes/new?fork=${stableItemId}`)}
					className="mt-3 inline-flex min-h-11 items-center text-label font-medium text-ink underline underline-offset-4"
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
						<span className="flex-shrink-0 text-meta text-ink-soft">{isRecipe ? "레시피" : "레시피드"}</span>
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
							currentUser && <FollowButton userId={item.user_id} initialIsFollowing={item.is_following} eventOrigin="detail" />
						)}
					</div>
				</header>

				<div className="flex-1 px-3 pb-8 pt-3">
					{renderCitedPeek()}

					<Sheet className="relative z-10">
						{/* 레시피드: 어떤 레시피에서 나왔는지가 먼저 (성장 고리의 연결점) */}
						{!isRecipe && !citedRecipesLoading && <SourceRow recipes={citedRecipes} creationOrigin={item.creation_origin} className="border-t-0" />}

						{orderedImages.length > 0 && (
							<div className="relative overflow-hidden rounded-t-[3px]">
								<ImageCarousel
									images={orderedImages}
									alt={isRecipe ? item.title || "레시피 사진" : `${publicContentTitle(item)} — ${authorName}님의 레시피드 사진`}
									frame={isRecipe ? "recipe" : "recipeed"}
									discoverAll
									priority
									onDoubleClick={handleDoubleTapLike}
								/>
								{showHeartAnimation && (
									<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
										<Heart className="h-16 w-16 animate-ping fill-like text-like" aria-hidden />
									</div>
								)}
							</div>
						)}

						<div className="px-4 pb-1 pt-6">
							{isRecipe ? (
								<>
									{item.title && <h1 className="text-display text-ink [text-wrap:balance]">{item.title}</h1>}
									<p className="mt-2 text-label text-ink-soft">
										{[item.servings ? `${item.servings}인분` : null, cookingTime ? `조리 ${cookingTime}` : null, ingredientCount ? `재료 ${ingredientCount}가지` : null]
											.filter(Boolean)
											.join(" · ")}
										{" · "}
										<RelativeTime iso={item.created_at} />
									</p>
									{/* 다른 사람이 실제로 만든 기록: 누르면 아래 '만들어 본 기록'으로 */}
									{(madeByOthers.count > 0 || continuedByOthers > 0) && (
										<a href="#made-heading" className="mt-3 inline-flex min-h-11 items-center">
											<MadeProof madeCount={madeByOthers.count} continuedCount={continuedByOthers} thumbs={madeByOthers.thumbs} />
										</a>
									)}
									<RecipeActivity recipeId={stableItemId} userId={currentUser?.id} />
									{item.description && <p className="mt-4 whitespace-pre-wrap break-words text-body text-ink">{item.description}</p>}
								</>
							) : (
								<>
									{/* 레시피드는 사진과 글이 주인공이라 제목을 키우지 않는다 (DESIGN.md Interface Grammar 1) */}
									{item.title && <h1 className="mb-1.5 text-heading text-ink">{item.title}</h1>}
									<p className="whitespace-pre-wrap break-words text-body text-ink">{item.content}</p>
								</>
							)}

							{item.tags && item.tags.length > 0 && (
								<ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1" aria-label="태그">
									{item.tags.map((tag, idx) => (
										<li key={idx}>
											<IntentLink href={topicHref(tag)} className="inline-flex min-h-8 items-center text-label text-ink-soft hover:text-ink">#{tag}</IntentLink>
										</li>
									))}
								</ul>
							)}

							{!isRecipe && (
								<p className="mt-3 text-meta text-ink-soft">
									<RelativeTime iso={item.created_at} />
								</p>
							)}
						</div>

						<div className="flex items-center justify-between px-2 py-1">
							<div className="flex items-center gap-1 text-ink-soft">
								<LikeButton
									itemId={stableItemId}
									itemType={item.item_type}
									authorId={item.user_id}
									currentUserId={currentUser?.id}
									initialLikesCount={cachedItem?.likes_count ?? item?.likes_count ?? 0}
									initialHasLiked={cachedItem?.is_liked ?? item?.is_liked ?? false}
									cachedItem={cachedItem}
								/>
								<a href="#comments" className="flex h-11 items-center gap-1.5 px-2" aria-label={`댓글 ${cachedItem?.comments_count || 0}개`}>
									<MessageCircle className="h-5 w-5" aria-hidden />
									<span className="text-label font-medium tabular-nums">{cachedItem?.comments_count || 0}</span>
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

						{/* 레시피드: 같은 레시피로 만든 다른 기록 → 다른 사람의 결과와 작성자로 이어진다 */}
						{!isRecipe && siblingRecords.length > 0 && (
							<section aria-labelledby="siblings-heading" className="border-t border-border px-4 pb-5 pt-5">
								<SectionHeading id="siblings-heading" count={siblingRecords.length}>
									같은 레시피로 만든 다른 기록
								</SectionHeading>
								<ul className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
									{siblingRecords.map((made) => (
										<li key={made.id} className="w-28 flex-shrink-0">
											<IntentLink href={`/posts/${made.id}`} className="block" onClick={() => logEvent("related_open", made.id, `sibling:${stableItemId}`)}>
												<div className="relative aspect-square overflow-hidden rounded-[2px] bg-muted">{made.image_url && <Photo src={made.image_url} sizes="112px" />}</div>
												<p className="mt-1 truncate text-meta text-ink-soft">{made.username}</p>
											</IntentLink>
										</li>
									))}
								</ul>
							</section>
						)}

						{/* 작성자의 다른 레시피: 이 글을 보고 그 사람의 다른 레시피로 (작성자 발견) */}
						{authorRecipes.length > 0 && (
							<section aria-labelledby="author-recipes-heading" className="border-t border-border px-4 pb-5 pt-5">
								<SectionHeading id="author-recipes-heading">{authorName}의 {isRecipe ? "다른 " : ""}레시피</SectionHeading>
								<div className="mt-3 grid grid-cols-2 gap-3">
									{authorRecipes.map((recipe) => (
										<RecipeCard key={recipe.id} item={{ ...recipe, item_id: recipe.id } as Item} showColorLabel={false} />
									))}
								</div>
							</section>
						)}
					</Sheet>

					<div id="comments" ref={commentsRef} className="mt-3 scroll-mt-16 rounded-[3px] bg-paper p-4 shadow-sheet">
						<h2 className="mb-3 text-heading text-ink">
							댓글 {(cachedItem?.comments_count || 0) > 0 && <span className="font-medium tabular-nums text-ink-soft">{cachedItem?.comments_count}</span>}
						</h2>
						<CommentsSection currentUserId={currentUser?.id} itemId={stableItemId} cachedItem={cachedItem || item} />
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
