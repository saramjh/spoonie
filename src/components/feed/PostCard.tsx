import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageCircle, Share2, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { timeAgo } from "@/lib/utils"
import FollowButton from "./FollowButton"
import { LikeButton } from "./LikeButton"
import clsx from "clsx"
import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useState, useEffect } from "react"
import { useShare } from "@/hooks/useShare"
import { useRefresh } from "@/contexts/RefreshContext"
import { useToast } from "@/hooks/use-toast"
import { useSWRConfig } from "swr"
import type { User } from "@supabase/supabase-js"
import type { FeedItem } from "@/types/item" // 통합 타입 임포트
import ImageCarousel from "@/components/common/ImageCarousel"
import { format } from "date-fns" // 날짜 포맷팅을 위해 date-fns 임포트
import { useCitedRecipes } from "@/hooks/useCitedRecipes"

export default function PostCard({ item }: { item: FeedItem }) {
  const supabase = createSupabaseBrowserClient()
  const { subscribeToItemUpdates, triggerRefresh } = useRefresh()
  const { toast } = useToast()
  const { mutate } = useSWRConfig()
  const router = useRouter()

  const isRecipe = item.item_type === "recipe"
  // 아이템 타입에 따라 올바른 상세 페이지 경로 설정
  const detailUrl = isRecipe ? `/recipes/${item.item_id}` : `/posts/${item.item_id}`

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 로컬 상태 관리
  const [localCommentsCount, setLocalCommentsCount] = useState(item.comments_count)

	// 인용된 레시피 캐싱된 로딩
	const { citedRecipes, isLoading: citedRecipesLoading } = useCitedRecipes(item.cited_recipe_ids)

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getCurrentUser()

		// cited recipes는 useCitedRecipes 훅에서 자동으로 관리됨
	}, [supabase.auth])

  useEffect(() => {
		const unsubscribe = subscribeToItemUpdates((event) => {
      if (event.itemId !== item.item_id) return
      if (event.updateType.startsWith("comment")) {
				setLocalCommentsCount((prev) => Math.max(0, prev + event.delta))
			}
			// 좋아요 관련 상태는 LikeButton에서 자체적으로 관리
    })
    return () => unsubscribe()
	}, [item.item_id, subscribeToItemUpdates])

  useEffect(() => {
    setLocalCommentsCount(item.comments_count)
	}, [item.comments_count, item.item_id])

  const isOwnItem = currentUser && currentUser.id === item.user_id
  const { share } = useShare()

  const handleShare = () => {
    const url = `${window.location.origin}${detailUrl}`
    share({ title: `Spoonie에서 보기`, text: item.title || item.content || "", url })
  }

  const handleEdit = () => {
    router.push(`/${item.item_type}s/${item.item_id}/edit`)
  }

  const handleCommentClick = () => {
    router.push(`${detailUrl}#comments`)
  }

  const handleDeleteConfirm = async () => {
    if (!currentUser) return
    
    setIsDeleting(true)
    
    console.log(`🗑️ PostCard: Deleting ${item.item_type} ${item.item_id}`)
    
    // 1. 먼저 Optimistic Update로 UI에서 즉시 제거
    console.log("🔄 PostCard: Applying optimistic delete")
    mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      (cachedData: FeedItem[] | FeedItem[][] | undefined) => {
        if (!cachedData || !Array.isArray(cachedData)) return cachedData
        
        // useSWRInfinite의 페이지 구조 처리
        if (Array.isArray(cachedData) && cachedData.every(page => Array.isArray(page))) {
          console.log(`🔍 PostCard: Removing item ${item.item_id} from infinite cache`)
          return cachedData.map(page => 
            page.filter((feedItem: FeedItem) => feedItem.item_id !== item.item_id)
          )
        }
        
        // 일반 배열 구조 처리
        console.log(`🔍 PostCard: Removing item ${item.item_id} from regular cache`)
        return cachedData.filter((feedItem: FeedItem) => feedItem.item_id !== item.item_id)
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
      
      console.log(`✅ PostCard: ${item.item_type} deleted successfully`)
      
      // 3. 성공 후 캐시 완전 갱신
      await mutate((key) => typeof key === "string" && key.startsWith("items|"))
      await triggerRefresh("/")
      await mutate("posts")
      await mutate("feed")
      
      toast({
        title: `${isRecipe ? "레시피" : "게시물"}가 삭제되었습니다.`,
      })
      
    } catch (error) {
      console.error("❌ PostCard: Delete failed:", error)
      
      // 4. 실패 시 Optimistic Update 롤백
      console.log("🔄 PostCard: Rolling back optimistic delete")
      await mutate((key) => typeof key === "string" && key.startsWith("items|"))
      
      toast({
        title: "삭제에 실패했습니다.",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
		<Card key={item.item_id} className={clsx("overflow-hidden shadow-bauhaus hover:shadow-bauhaus-lg transition-all duration-300 border transform hover:scale-[1.02]", isRecipe ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white")}>
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <Link href={`/profile/${item.user_public_id || item.user_id}`}>
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={item.avatar_url || undefined} alt={item.display_name || "User"} />
            <AvatarFallback>{item.display_name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-grow">
          <Link href={`/profile/${item.user_public_id || item.user_id}`}>
            <p className="font-semibold text-gray-800">{item.display_name || "사용자"}</p>
          </Link>
          <p className="text-xs text-gray-500">{timeAgo(item.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isOwnItem && <FollowButton userId={item.user_id} initialIsFollowing={item.is_following} />}
          {isOwnItem && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                  <Edit className="mr-2 h-4 w-4" /> 수정
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <Trash2 className="mr-2 h-4 w-4" /> 삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <div onClick={() => router.push(detailUrl)} className="cursor-pointer">
				{item.image_urls && item.image_urls.length > 0 && <ImageCarousel images={item.image_urls} alt={item.title || `Post by ${item.display_name}`} priority={true} />}

        <CardContent className="p-4">
          {isRecipe ? (
            <>
              <h3 className="text-lg font-bold mb-1 text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-700 line-clamp-2">{item.description}</p>
            </>
          ) : (
            <>
							{item.title && <h3 className="text-lg font-bold mb-2 text-gray-900">{item.title}</h3>}
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.content}</p>
            </>
          )}
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
										<Link key={citedRecipeItem.id} href={`/recipes/${citedRecipeItem.id}`} className="block group" onClick={(e) => e.stopPropagation()}>
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
            <div className="flex flex-wrap gap-2 mt-3">
              {item.tags.map((tag, idx) => (
								<span key={idx} className="bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full text-xs font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </div>

      <CardFooter className="flex justify-between items-center p-4 pt-2">
        <div className="flex items-center gap-1 text-gray-600">
					<LikeButton itemId={item.item_id} itemType={item.item_type} authorId={item.user_id} currentUserId={currentUser?.id} />
          <Button variant="ghost" size="sm" onClick={handleCommentClick} className="flex items-center gap-1 h-auto p-1 hover:bg-gray-100">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{localCommentsCount}</span>
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={handleShare}>
          <Share2 className="h-5 w-5 text-gray-600" />
        </Button>
      </CardFooter>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 확인</AlertDialogTitle>
						<AlertDialogDescription>이 {isRecipe ? "레시피를" : "게시물을"} 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
