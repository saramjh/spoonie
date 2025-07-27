"use client"

import { ItemDetail } from "@/types/item"
import { useRouter, usePathname } from "next/navigation"
import { ArrowLeft, MessageCircle, Share2, ArrowUp, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import FollowButton from "@/components/feed/FollowButton"
import { LikeButton } from "@/components/feed/LikeButton"
import CommentsSection from "@/components/feed/CommentsSection"
import ImageCarousel from "@/components/common/ImageCarousel"
import { timeAgo } from "@/lib/utils"
import RecipeContentView from "@/components/recipe/RecipeContentView"
import { useShare } from "@/hooks/useShare"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import Link from "next/link"
import useSWR, { useSWRConfig } from "swr"
import { useState, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { useRefresh } from "@/contexts/RefreshContext"
import { format } from "date-fns"
import { useCitedRecipes } from "@/hooks/useCitedRecipes"
import { syncAllCaches } from "@/utils/feed-cache-sync"

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
	const { share } = useShare()
	const { toast } = useToast()
	const supabase = createSupabaseBrowserClient()
	const { mutate } = useSWRConfig()
	const { registerRefreshFunction, unregisterRefreshFunction, publishItemUpdate, subscribeToItemUpdates } = useRefresh()
	const pathname = usePathname()

	const isRecipe = item.item_type === "recipe"

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

	const [newComment, setNewComment] = useState("")
	const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
	const [commentsCount, setCommentsCount] = useState(item.comments_count)
	const [isAuthLoading, setIsAuthLoading] = useState(true) // 인증 상태 로딩
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const commentsRef = useRef<HTMLDivElement>(null)

	const comments = item.comments_data || []

	// 비회원 여부 확인
	const isGuest = !currentUser && !isAuthLoading
	
	// 작성자 여부 확인
	const isOwnItem = currentUser && currentUser.id === item.user_id
	
	// 수정 버튼 핸들러
	const handleEdit = () => {
		const editPath = isRecipe ? `/recipes/${item.item_id}/edit` : `/posts/${item.item_id}/edit`
		router.push(editPath)
	}
	
	// 삭제 확인 핸들러
	const handleDeleteConfirm = async () => {
		if (!currentUser || !isOwnItem) return
		
		setIsDeleting(true)
		try {
			const { error } = await supabase
				.from("items")
				.delete()
				.eq("id", item.item_id)
				.eq("user_id", currentUser.id) // 보안 검증
			
			if (error) throw error
			
			toast({
				title: `${isRecipe ? "레시피" : "게시물"}가 삭제되었습니다.`,
			})
			
			router.push("/")
		} catch (error) {
			console.error("Error deleting item:", error)
			toast({
				title: "삭제에 실패했습니다.",
				variant: "destructive",
			})
		} finally {
			setIsDeleting(false)
			setShowDeleteDialog(false)
		}
	}

	// cited_recipe_ids는 useCitedRecipes 훅에서 자동으로 관리됨

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

	useEffect(() => {
		const handleRefresh = async () => {
			await mutate(`item_details_${item.item_id}`)
		}
		registerRefreshFunction(pathname, handleRefresh)
		return () => unregisterRefreshFunction(pathname)
	}, [pathname, registerRefreshFunction, unregisterRefreshFunction, mutate, item.item_id])

	// 실시간 아이템 업데이트 구독 (상세페이지용)
	useEffect(() => {
		const unsubscribe = subscribeToItemUpdates((updateEvent) => {
			// 현재 아이템과 관련된 업데이트만 처리
			if (updateEvent.itemId !== item.item_id) return

			console.log(`🔄 ItemDetailView received update for ${item.item_id}:`, updateEvent)

			// 좋아요/댓글 수 즉시 갱신
			if (updateEvent.updateType === "like_add" || updateEvent.updateType === "like_remove") {
				// 좋아요 수는 LikeButton에서 자체적으로 관리하므로 SWR 캐시만 갱신
				mutate(`item_details_${item.item_id}`)
			} else if (updateEvent.updateType === "comment_add" || updateEvent.updateType === "comment_delete") {
				// 댓글 수 즉시 갱신
				setCommentsCount((prev) => Math.max(0, prev + updateEvent.delta))

				// SWR 캐시도 갱신
				mutate(`item_details_${item.item_id}`)
			}
		})

		return unsubscribe
	}, [subscribeToItemUpdates, item.item_id, mutate])

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
			title: `Spoonie에서 ${isRecipe ? item.title : (item.display_name || "사용자") + "님의 게시물"} 보기`,
			text: isRecipe ? item.description || "" : item.content || "",
			url: url,
		}
		share(shareData)
	}

	const handleAddComment = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!newComment.trim() || !currentUser) return

		const tempId = Date.now().toString()
		const newCommentData = {
			id: tempId,
			content: newComment,
			created_at: new Date().toISOString(),
			user: {
				id: currentUser.id,
				public_id: "", // 임시값, 서버에서 최신 데이터로 업데이트될 예정
				username: currentUser.display_name || "사용자",
				display_name: currentUser.display_name,
				avatar_url: currentUser.avatar_url,
			},
			is_deleted: false,
		}

		setNewComment("")

		try {
			const commentPayload = {
				content: newComment,
				user_id: currentUser.id,
				item_id: item.item_id,
			}

			const { data: insertedComment, error } = await supabase
				.from("comments")
				.insert(commentPayload)
				.select(`
					id, content, created_at, user_id, parent_comment_id, is_deleted,
					user:profiles!user_id(public_id, display_name, avatar_url, username)
				`)
				.single()

			if (error) throw error

			// 새 댓글을 올바른 형태로 변환
			const userProfile = Array.isArray(insertedComment.user) ? insertedComment.user[0] : insertedComment.user
			const transformedNewComment: Comment = {
				id: insertedComment.id,
				content: insertedComment.content,
				created_at: insertedComment.created_at,
				user_id: insertedComment.user_id,
				parent_comment_id: insertedComment.parent_comment_id,
				is_deleted: insertedComment.is_deleted,
				user: {
					id: insertedComment.user_id,
					public_id: userProfile?.public_id || "",
					username: userProfile?.username || "",
					display_name: userProfile?.display_name,
					avatar_url: userProfile?.avatar_url,
				},
			}

			// 실제 댓글로 optimistic update 교체
			mutate(
				`item_details_${item.item_id}`,
				(currentItem: ItemDetail | undefined) => {
					if (!currentItem) return currentItem
					const updatedComments = [...(currentItem.comments_data || [])]
					// 임시 댓글을 실제 댓글로 교체
					const tempIndex = updatedComments.findIndex(c => c.id === tempId)
					if (tempIndex !== -1) {
						updatedComments[tempIndex] = transformedNewComment
					} else {
						updatedComments.push(transformedNewComment)
					}
					return {
						...currentItem,
						comments_data: updatedComments,
					}
				},
				false
			)

			// CommentsSection의 SWR 캐시 새로고침 (댓글이 즉시 표시되도록)
			mutate(`comments_${item.item_id}`)

			// 🚀 통합 캐시 동기화 시스템 적용
			syncAllCaches({
				itemId: item.item_id,
				updateType: 'comment_add',
				delta: 1
			})

			// Publish update to other components
			publishItemUpdate({
				itemId: item.item_id,
				itemType: item.item_type,
				updateType: "comment_add",
				delta: 1,
			})

			toast({ title: "댓글이 추가되었습니다." })
		} catch (error) {
			console.error("Error adding comment:", error)
			toast({ title: "댓글 추가에 실패했습니다.", variant: "destructive" })

			// Rollback optimistic UI
			mutate(`item_details_${item.item_id}`)
			setCommentsCount((prev) => prev - 1)
		}
	}

	return (
		<div className="flex flex-col h-full relative">
			{/* 비회원 블러 오버레이 */}
			{isGuest && (
				<div className="absolute inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6">
					<div className="bg-white rounded-2xl p-8 max-w-sm mx-auto text-center shadow-2xl">
						<div className="mb-6">
							<h2 className="text-2xl font-bold text-gray-900 mb-3">회원만 볼 수 있습니다</h2>
							<p className="text-gray-600 leading-relaxed">
								{isRecipe ? "레시피의 전체 내용을" : "게시물의 전체 내용을"} 보시려면 로그인이 필요해요. Spoonie에서 더 많은 {isRecipe ? "레시피" : "게시물"}를 만나보세요!
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
										onClick={() => setShowDeleteDialog(true)} 
										className="text-red-600 focus:text-red-600 cursor-pointer"
									>
										<Trash2 className="mr-2 h-4 w-4" />
										삭제
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							/* 작성자가 아닌 경우: 팔로우 버튼 */
							currentUser && <FollowButton userId={item.user_id} initialIsFollowing={item.is_following} />
						)}
					</div>
				</header>

				<div className="flex-1 overflow-y-auto">
					{item.image_urls && item.image_urls.length > 0 && <ImageCarousel images={item.image_urls} alt={isRecipe ? item.title || "Recipe image" : `Post by ${item.display_name}`} priority />}
					<div className="p-4">
						{isRecipe ? (
							<>
								<div className="flex justify-between items-center mb-2">
									{item.title && <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>}
									<Button variant="ghost" size="icon" onClick={handleShare}>
										<Share2 className="h-6 w-6 text-gray-600" />
									</Button>
								</div>
								{item.description && <p className="text-sm text-gray-500 mb-2">{item.description}</p>}

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
												const recipeDate = citedRecipeItem.created_at ? format(new Date(citedRecipeItem.created_at), "yyyy.MM.dd") : ""

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
								<p className="text-base text-gray-800 whitespace-pre-wrap">{item.content}</p>

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
												const recipeDate = citedRecipeItem.created_at ? format(new Date(citedRecipeItem.created_at), "yyyy.MM.dd") : ""

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
								<p className="text-sm text-gray-500 mt-4 text-right">{timeAgo(item.created_at)}</p>
							</>
						)}
					</div>
					<div className="flex justify-between items-center p-4 border-t">
						<div className="flex items-center gap-2 text-gray-600">
							<LikeButton itemId={item.item_id} itemType={item.item_type} authorId={item.user_id} currentUserId={currentUser?.id} />
							<div className="flex items-center gap-1">
								<MessageCircle className="h-6 w-6" />
								<span className="text-base font-medium">{commentsCount}</span>
							</div>
						</div>
					</div>

					<div ref={commentsRef} className="p-4">
						<CommentsSection 
							currentUserId={currentUser?.id} 
							itemId={item.item_id} 
							itemType={item.item_type} 
							onCommentDelete={() => setCommentsCount((prev) => Math.max(0, prev - 1))} 
							onCommentDeleteRollback={() => setCommentsCount((prev) => prev + 1)}
							onCommentsCountChange={setCommentsCount}
						/>
					</div>
				</div>

				<div className="sticky bottom-0 bg-white dark:bg-gray-950 py-2 px-4 border-t">
					<form onSubmit={handleAddComment} className="flex items-center gap-2">
						<Avatar className="h-8 w-8">
							<AvatarImage src={currentUser?.avatar_url || undefined} />
							<AvatarFallback>{currentUser?.display_name?.charAt(0) || "U"}</AvatarFallback>
						</Avatar>
						<Input placeholder="댓글 추가..." value={newComment} onChange={(e) => setNewComment(e.target.value)} disabled={!currentUser} />
						<Button type="submit" size="icon" disabled={!newComment.trim() || !currentUser}>
							<ArrowUp className="h-5 w-5" />
						</Button>
					</form>
				</div>
			</div>
			
			{/* 삭제 확인 다이얼로그 */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>삭제 확인</AlertDialogTitle>
						<AlertDialogDescription>
							이 {isRecipe ? "레시피를" : "게시물을"} 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
