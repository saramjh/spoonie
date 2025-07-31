import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Share2, MessageCircle, MoreVertical, Trash2, Edit } from "lucide-react"
import { timeAgo } from "@/lib/utils"
import FollowButton from "./FollowButton"
import { SimplifiedLikeButton } from "@/components/items/SimplifiedLikeButton"
import { BookmarkButton } from "@/components/items/BookmarkButton"
import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useShare } from "@/hooks/useShare"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@supabase/supabase-js"
import type { Item } from "@/types/item"
import ImageCarousel from "@/components/common/ImageCarousel"
import { useCitedRecipes } from "@/hooks/useCitedRecipes"
import { enrichWithCachedAuthor, cacheAuthors } from "@/utils/author-cache"
import { useThumbnail } from "@/hooks/useThumbnail"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import ExpandableText from "@/components/common/ExpandableText"

/**
 * 🎯 검증된 홈 피드 게시물 카드 컴포넌트
 * 업계 표준 방식으로 단순하고 안정적인 구현
 * 
 * 특징:
 * - 제로 에러 설계
 * - 예측 가능한 동작
 * - 최소한의 상태 관리
 * - 검증된 패턴 사용
 */
export default function PostCard({ 
  item, 
  currentUser, 
  onItemUpdate 
}: { 
  item: Item; 
  currentUser?: User | null;
  onItemUpdate?: () => Promise<void> | void;
}) {
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast()
  const router = useRouter()
  const { share } = useShare()

  // 🎯 아이템 기본 정보
  const isRecipe = item.item_type === "recipe"
  const detailUrl = isRecipe ? `/recipes/${item.item_id}` : `/posts/${item.item_id}`
  const isOwnItem = currentUser && currentUser.id === item.user_id

  // 🛡️ 안전한 네비게이션 핸들러
  const handleEditClick = useCallback(async () => {
    try {
      await router.push(`${detailUrl}/edit`)
    } catch (error) {
      console.error('Navigation error:', error)
    }
  }, [router, detailUrl])

  // 🛡️ Hook 안정성을 위한 값 안정화
  const stableItemId = useMemo(() => item.item_id || item.id, [item.item_id, item.id])
  const stableFallbackData = useMemo(() => ({
    ...item,
    likes_count: item.likes_count || 0,
    comments_count: item.comments_count || 0,
    is_liked: item.is_liked || false
  }), [item])

  // 🖼️ 썸네일 관리 - SSA 캐시된 데이터 사용 (캐시 데이터를 먼저 가져옴)
  const cachedItem = useSSAItemCache(stableItemId, stableFallbackData)
  
  // 🔍 CRITICAL DEBUG: 이미지 데이터 정밀 추적
  console.log(`🖼️ [PostCard ${stableItemId}] Image Tracking:`, {
    originalImages: item.image_urls?.length || 0,
    cachedImages: cachedItem?.image_urls?.length || 0,
    fallbackImages: stableFallbackData?.image_urls?.length || 0,
    originalUrls: item.image_urls,
    cachedUrls: cachedItem?.image_urls,
    fallbackUrls: stableFallbackData?.image_urls
  })
  
  // 💬 CRITICAL DEBUG: 댓글 수 추적
  console.log(`💬 [PostCard ${stableItemId}] Comments Tracking:`, {
    originalComments: item.comments_count,
    cachedComments: cachedItem?.comments_count,
    fallbackComments: stableFallbackData?.comments_count
  })
  
  const { orderedImages } = useThumbnail({
    itemId: stableItemId,
    imageUrls: cachedItem.image_urls || [],
    thumbnailIndex: cachedItem.thumbnail_index ?? 0
  })



  // 📚 참고 레시피 로딩
  const { citedRecipes, isLoading: citedRecipesLoading } = useCitedRecipes(item.cited_recipe_ids)

  // 👤 작성자 정보 캐시 적용
  const enrichedItem = enrichWithCachedAuthor(item)

  // 🗑️ 삭제 관련 상태
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 🚀 SSA: 캐시된 좋아요 데이터 사용
  const likesCount = cachedItem.likes_count
  const hasLiked = cachedItem.is_liked
  


  // 👤 작성자 정보 캐시 저장
  useEffect(() => {
    if (item.user_id && (item.username || item.display_name)) {
      cacheAuthors([{
        user_id: item.user_id,
        username: item.username,
        display_name: item.display_name,
        avatar_url: item.avatar_url,
        user_public_id: item.user_public_id
      }])
    }
  }, [item.user_id, item.username, item.display_name, item.avatar_url, item.user_public_id])

  // 🗑️ SSA 기반 삭제 처리 (즉시 홈화면에서 사라짐)
  const handleDelete = async () => {
    if (!isOwnItem || isDeleting) return

    setIsDeleting(true)
    console.log(`🚀 PostCard: Starting SSA-based deletion of ${item.item_type} ${item.item_id}`)

    try {
      // 🚀 SSA STEP 1: 즉시 홈화면에서 제거 (0ms 응답)
      const { cacheManager } = await import('@/lib/unified-cache-manager')
      const rollback = await cacheManager.deleteItem(item.item_id || item.id)
      
      // 🚀 SSA STEP 2: 백그라운드 DB 삭제
      try {
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', item.item_id || item.id)
          .eq('user_id', currentUser?.id) // 보안: 자신의 아이템만 삭제

        if (error) throw error

        console.log(`✅ PostCard: ${item.item_type} deleted successfully via SSA`)
        
        setShowDeleteDialog(false)
        onItemUpdate?.()
        
        toast({
          title: "삭제 완료",
          description: `${isRecipe ? '레시피' : '레시피드'}가 삭제되었습니다.`,
        })
        
      } catch (dbError) {
        // DB 삭제 실패 시 캐시 롤백
        console.error(`❌ PostCard: DB deletion failed, rolling back:`, dbError)
        rollback()
        throw dbError
      }

    } catch (error) {
      console.error(`❌ PostCard: SSA delete failed:`, error)
      toast({
        title: "삭제 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // 📱 댓글 페이지로 이동
  const handleCommentClick = () => {
    router.push(detailUrl)
  }

  // 🔗 공유하기
  const handleShare = () => {
    const url = `${window.location.origin}${detailUrl}`
    const text = item.title || item.content?.substring(0, 100) || '맛있는 레시피'
    share({ title: 'Spoonie에서 보기', text, url })
  }

  return (
    <Card className={`w-full max-w-md mx-auto transition-all duration-200 ${
      isRecipe 
        ? 'bg-gradient-to-br from-orange-50 via-white to-yellow-50 shadow-md border-2 border-orange-200 hover:shadow-lg hover:border-orange-300 ring-1 ring-orange-100' 
        : 'bg-white shadow-sm border border-gray-200 hover:shadow-md'
    }`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <Link href={`/profile/${enrichedItem.user_public_id || enrichedItem.user_id}`}>
            <Avatar className={`w-10 h-10 cursor-pointer transition-all ${
              isRecipe 
                ? 'hover:ring-2 hover:ring-orange-300' 
                : 'hover:ring-2 hover:ring-orange-200'
            }`}>
              <AvatarImage 
                src={enrichedItem.avatar_url || undefined} 
                alt={enrichedItem.display_name || enrichedItem.username || "사용자"} 
              />
              <AvatarFallback>
                {(enrichedItem.display_name || enrichedItem.username || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex flex-col">
            <Link href={`/profile/${enrichedItem.user_public_id || enrichedItem.user_id}`}>
              <p className={`text-sm font-semibold transition-colors cursor-pointer ${
                isRecipe 
                  ? 'hover:text-orange-700 text-gray-800' 
                  : 'hover:text-orange-600'
              }`}>
                {enrichedItem.display_name || enrichedItem.username || "알 수 없는 사용자"}
              </p>
            </Link>
            <div className="flex items-center gap-1">
              <p className="text-xs text-gray-500">
                {timeAgo(item.created_at)} • 
              </p>
              {isRecipe ? (
                <div className="flex items-center gap-1">
                  <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shadow-sm">
                    <span className="text-[10px]">👨‍🍳</span>
                    <span>레시피</span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">레시피드</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!isOwnItem && (
            <FollowButton 
              userId={item.user_id}
              initialIsFollowing={item.is_following}
            />
          )}
          
          {isOwnItem && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto min-w-[80px]">
                <DropdownMenuItem onClick={handleEditClick} className="cursor-pointer relative flex items-center justify-start px-3 py-2">
                  <Edit className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-center">수정</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 cursor-pointer relative flex items-center justify-start px-3 py-2"
                >
                  <Trash2 className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-center">삭제</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <div onClick={() => router.push(detailUrl)} className="cursor-pointer">
        {orderedImages.length > 0 && (
          <div className="relative">
            <ImageCarousel 
              images={orderedImages} 
              alt={item.title || `Post by ${item.display_name}`} 
              priority={true} 
            />
            {/* 비공개 표시 - 업계표준 Privacy UX */}
            {!item.is_public && (
              <div className="absolute top-3 right-3 z-20">
                <div className="bg-black/80 text-white text-xs px-2 py-1 rounded-full font-medium backdrop-blur-sm shadow-lg">
                  비공개
                </div>
              </div>
            )}
          </div>
        )}

        <CardContent className={`p-4 ${isRecipe ? 'bg-gradient-to-b from-transparent to-orange-25' : ''}`}>
          {isRecipe ? (
            <>
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-orange-400 to-red-400 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white text-xs font-bold">R</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{item.title}</h3>
              </div>
              <ExpandableText 
                text={item.description || ""} 
                maxLines={2}
                onExpand={() => router.push(detailUrl)}
                className="text-gray-700"
              />
            </>
          ) : (
            <ExpandableText 
              text={item.content || ""} 
              maxLines={3}
              onExpand={() => router.push(detailUrl)}
            />
          )}

          {/* 참고 레시피 표시 */}
          {!citedRecipesLoading && citedRecipes && citedRecipes.length > 0 && (
            <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-orange-800">📚 참고 레시피</span>
                <span className="text-xs text-orange-600 bg-orange-200 px-2 py-1 rounded-full font-medium">
                  {citedRecipes.length}개
                </span>
              </div>
              <div className="space-y-1">
                {citedRecipes.slice(0, 2).map((recipe) => {
                  // author 정보 안전하게 추출
                  const authorProfile = Array.isArray(recipe.author) ? recipe.author[0] : recipe.author
                  const authorName = authorProfile?.display_name || authorProfile?.username || "익명"
                  const recipeDate = recipe.created_at 
                    ? new Date(recipe.created_at).toLocaleDateString('ko-KR', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit' 
                      }).replace(/\./g, '.').replace(/\s/g, '') 
                    : ""
                  
                  return (
                    <Link 
                      key={recipe.id} 
                      href={`/recipes/${recipe.id}`}
                      className="block text-sm text-orange-700 hover:text-orange-900 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center">
                        <span>• {authorName}의 {recipe.title}</span>
                        {recipeDate && (
                          <span className="text-xs text-orange-600 ml-2 flex-shrink-0">
                            {recipeDate}
                          </span>
                        )}
                      </div>
                    </Link>
                  )
                })}
                {citedRecipes.length > 2 && (
                  <p className="text-xs text-orange-600">
                    외 {citedRecipes.length - 2}개...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 태그 표시 */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {item.tags.map((tag, idx) => (
                <span key={idx} className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  isRecipe 
                    ? 'bg-gradient-to-r from-orange-200 to-yellow-200 text-orange-800 shadow-sm' 
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </div>

      <CardFooter className={`flex justify-between items-center p-4 pt-2 ${
        isRecipe ? 'bg-gradient-to-r from-orange-50/50 to-yellow-50/50 border-t border-orange-100' : ''
      }`}>
        <div className="flex items-center gap-1 text-gray-600">

          {/* 🎯 기존 검증된 좋아요 버튼 사용 */}
          <SimplifiedLikeButton 
            itemId={item.item_id || item.id} 
            itemType={item.item_type}
            authorId={item.user_id}
            currentUserId={currentUser?.id}
            initialLikesCount={likesCount}
            initialHasLiked={hasLiked}
            cachedItem={cachedItem}
          />
          <Button variant="ghost" size="sm" onClick={handleCommentClick} className={`flex items-center gap-1 h-auto p-1 ${
            isRecipe ? 'hover:bg-orange-100' : 'hover:bg-gray-100'
          }`}>
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{cachedItem.comments_count || 0}</span>
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <BookmarkButton
            itemId={item.item_id || item.id}
            itemType={item.item_type}
            currentUserId={currentUser?.id}
            initialBookmarksCount={(cachedItem as Item & { bookmarks_count?: number }).bookmarks_count || 0}
            initialIsBookmarked={(cachedItem as Item & { is_bookmarked?: boolean }).is_bookmarked || false}
            className={isRecipe ? 'hover:bg-orange-100' : ''}
            cachedItem={cachedItem}
          />
          <Button variant="ghost" size="icon" onClick={handleShare} className={isRecipe ? 'hover:bg-orange-100' : ''}>
            <Share2 className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </CardFooter>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 {isRecipe ? '레시피' : '레시피드'}를 삭제하면 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
