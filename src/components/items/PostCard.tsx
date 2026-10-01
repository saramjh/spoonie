import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Share2, MessageCircle, MoreVertical, Trash2, Edit, Heart } from "lucide-react"
import { timeAgo } from "@/lib/utils"
import FollowButton from "./FollowButton"
import { SimplifiedLikeButton } from "@/components/items/SimplifiedLikeButton"
import { BookmarkButton } from "@/components/items/BookmarkButton"
import { useRouter } from "@/lib/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useShare } from "@/hooks/useShare"
import { useNavigation } from "@/hooks/useNavigation"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@supabase/supabase-js"
import type { Item } from "@/types/item"
import ImageCarousel from "@/components/common/ImageCarousel"
import { useCitedRecipes } from "@/hooks/useCitedRecipes"
import { enrichWithCachedAuthor, cacheAuthors } from "@/utils/author-cache"
import { useThumbnail } from "@/hooks/useThumbnail"
import { useSSAItemCache } from "@/hooks/useSSAItemCache"
import ExpandableText from "@/components/common/ExpandableText"
import { cacheManager } from "@/lib/unified-cache-manager"
import LoginPromptSheet from "@/components/auth/LoginPromptSheet"

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
  onItemUpdate,
  priority = false
}: { 
  item: Item; 
  currentUser?: User | null;
  onItemUpdate?: () => Promise<void> | void;
  priority?: boolean;
}) {
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast()
  const router = useRouter()
  const { share } = useShare()
  const { createLinkWithOrigin } = useNavigation()

  // 🎯 아이템 기본 정보
  const isRecipe = item.item_type === "recipe"
  const detailUrl = isRecipe ? `/recipes/${item.item_id}` : `/posts/${item.item_id}`
  const isOwnItem = currentUser && currentUser.id === item.user_id

  // 🛡️ 안전한 네비게이션 핸들러 (Origin 정보 포함)
  const handleEditClick = useCallback(async () => {
    try {
      const editPath = createLinkWithOrigin(`${detailUrl}/edit`)
      await router.push(editPath)
    } catch (error) {
      console.error('Navigation error:', error)
    }
  }, [router, detailUrl, createLinkWithOrigin])

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
  // 표시용 값: 수정 직후 즉시 갱신되는 개별 항목 캐시를 우선하고, 캐시에 없는 값만 목록 데이터를 쓴다.
  // (홈 피드 목록 캐시는 새로고침 전까지 갱신되지 않아 수정한 제목, 본문 등이 이전 값으로 남던 문제 방지)
  const displayItem: Item = { ...item, ...cachedItem }
  

  

  

  
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
	
	// 🎯 더블탭 좋아요 상태 관리
	const [showHeartAnimation, setShowHeartAnimation] = useState(false)
	const [showLoginPrompt, setShowLoginPrompt] = useState(false)

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

  // 🎯 더블탭 좋아요 핸들러 (프로필 그리드와 동일한 SSA 기반 로직)
  const handleDoubleTapLike = async () => {
    // 🔐 비로그인 사용자 회원가입 유도 (토스 UX 스타일 - 바텀시트)
    if (!currentUser?.id) {
      setShowLoginPrompt(true)
      return
    }
    
    try {
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

  // 🗑️ SSA 기반 삭제 처리 (즉시 홈화면에서 사라짐)
  const handleDelete = async () => {
    if (!isOwnItem || isDeleting) return

    setIsDeleting(true)


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
    const text = displayItem.title || displayItem.content?.substring(0, 100) || '맛있는 레시피'
    share({ title: 'Spoonie에서 보기', text, url })
  }

  return (
    <article>
    <Card className="w-full max-w-md mx-auto bg-white border border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <Link href={`/profile/${enrichedItem.user_public_id || enrichedItem.user_id}`}>
            <Avatar className="w-10 h-10 cursor-pointer">
              <AvatarImage 
                src={enrichedItem.avatar_url || undefined} 
                alt={enrichedItem.username || "사용자"} 
              />
              <AvatarFallback>
                {(enrichedItem.username || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex flex-col">
            <Link href={`/profile/${enrichedItem.user_public_id || enrichedItem.user_id}`}>
              <p className="text-sm font-semibold text-gray-900 cursor-pointer hover:underline">
                {enrichedItem.username || "알 수 없는 사용자"}
              </p>
            </Link>
            <p className="text-xs text-gray-500">
              <Link href={detailUrl} className="hover:underline">
                <time dateTime={item.created_at}>{timeAgo(item.created_at)}</time>
              </Link>
              {" · "}
              <span className={isRecipe ? "font-medium text-orange-700" : undefined}>{isRecipe ? "레시피" : "레시피드"}</span>
            </p>
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

      {/* 🎯 이미지 영역: 프로필 그리드와 동일한 더블탭 좋아요 */}
      {orderedImages.length > 0 && (
        <div className="relative">
          <ImageCarousel 
            images={orderedImages} 
            alt={displayItem.title || `Post by ${item.username}`} 
            priority={priority}
            onSingleClick={() => router.push(detailUrl)}  // 단일탭 = 상세페이지
            onDoubleClick={handleDoubleTapLike}           // 더블탭 = 좋아요
          />
          
          {/* 🎉 토스식 더블탭 좋아요 애니메이션 */}
          {showHeartAnimation && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <Heart className="w-16 h-16 fill-red-500 text-red-500 animate-ping" />
            </div>
          )}
          
          {/* 비공개 표시 - 업계표준 Privacy UX */}
          {!displayItem.is_public && (
            <div className="absolute top-3 right-3 z-20">
              <div className="bg-black/75 text-white text-xs px-2 py-1 rounded">
                비공개
              </div>
            </div>
          )}
        </div>
      )}

        {/* 🎯 텍스트 영역: 기존처럼 클릭으로 상세페이지 이동 */}
        <CardContent 
          className="p-4 cursor-pointer"
          onClick={(e) => {
            // 제목 링크처럼 카드 안의 링크를 누른 경우는 링크가 이동을 처리한다
            if ((e.target as Element).closest("a")) return
            router.push(detailUrl)
          }}
        >
          {isRecipe ? (
            <>
              <h2 className="text-lg font-bold text-gray-900 leading-tight mb-1">
                <Link href={detailUrl}>{displayItem.title}</Link>
              </h2>

              {/* 조리 시간과 분량 */}
              {(displayItem.cooking_time_minutes || displayItem.servings) && (
                <p className="text-sm text-gray-600 mb-2">
                  {[
                    displayItem.cooking_time_minutes ? `${displayItem.cooking_time_minutes}분` : null,
                    displayItem.servings ? `${displayItem.servings}인분` : null,
                  ].filter(Boolean).join(" · ")}
                </p>
              )}

              <ExpandableText 
                text={displayItem.description || ""} 
                maxLines={2}
                onExpand={() => router.push(detailUrl)}
                className="text-gray-700"
              />
            </>
          ) : (
            <ExpandableText 
              text={displayItem.content || ""} 
              maxLines={3}
              onExpand={() => router.push(detailUrl)}
            />
          )}

          {/* 참고 레시피 표시 */}
          {!citedRecipesLoading && citedRecipes && citedRecipes.length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-800 mb-2">참고 레시피 {citedRecipes.length}개</p>
              <div className="space-y-1">
                {citedRecipes.slice(0, 2).map((recipe) => {
                  // author 정보 안전하게 추출
                  const authorProfile = Array.isArray(recipe.author) ? recipe.author[0] : recipe.author
                  const authorName = authorProfile?.username || "익명"
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
          {displayItem.tags && displayItem.tags.length > 0 && (
            <div className="flex flex-wrap gap-x-2 gap-y-1 mt-3">
              {displayItem.tags.map((tag, idx) => (
                <span key={idx} className="text-sm text-gray-500">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>

      <CardFooter className="flex justify-between items-center p-4 pt-2">
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
      
      {/* 🎨 토스 스타일 로그인 유도 바텀시트 */}
      <LoginPromptSheet
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        action="like"
      />
    </Card>
    </article>
  )
}
