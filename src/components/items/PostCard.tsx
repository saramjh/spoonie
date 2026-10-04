import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Share2, MessageCircle, MoreVertical, Trash2, Edit, Heart } from "lucide-react"
import { formatCookingTime } from "@/features/recipe/domain/recipe-amount"
import FollowButton from "./FollowButton"
import { LikeButton } from "@/components/items/LikeButton"
import { BookmarkButton } from "@/components/items/BookmarkButton"
import { useRouter } from "@/shared/lib/navigation"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useShare } from "@/hooks/useShare"
import { useNavigation } from "@/hooks/useNavigation"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@supabase/supabase-js"
import type { Item } from "@/types/item"
import ImageCarousel from "@/components/common/ImageCarousel"
import { useCitedRecipes } from "@/features/recipe/hooks/useCitedRecipes"
import { enrichWithCachedAuthor, cacheAuthors } from "@/shared/infra/author-cache"
import { orderImagesForDisplay } from "@/shared/lib/thumbnail"
import { useItemCache } from "@/hooks/useItemCache"
import ExpandableText from "@/components/common/ExpandableText"
import { cacheManager } from "@/shared/infra/unified-cache-manager"
import LoginPromptSheet from "@/components/auth/LoginPromptSheet"
import { IntentLink, MadeProof, RelativeTime, Sheet, SourceRow } from "@/components/kit"
import { revalidateItemPage } from "@/shared/infra/revalidate-item"
import { collectItemImageUrls, removeItemImages } from "@/shared/infra/item-images"
import { topicHref } from "@/shared/lib/topics"
import { logEvent } from "@/shared/infra/events"

const loggedFeedImpressions = new Set<string>()

/**
 * 검증된 홈 피드 게시물 카드 컴포넌트
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
  priority = false,
  surface = "home",
}: { 
  item: Item; 
  currentUser?: User | null;
  onItemUpdate?: () => Promise<void> | void;
  priority?: boolean;
  surface?: "home" | "bookmarks";
}) {
  const supabase = createSupabaseBrowserClient()
  const { toast } = useToast()
  const router = useRouter()
  const { share } = useShare()
  const { createLinkWithOrigin } = useNavigation()

  // 아이템 기본 정보
  const isRecipe = item.item_type === "recipe"
  const detailUrl = isRecipe ? `/recipes/${item.item_id}` : `/posts/${item.item_id}`
  const isOwnItem = currentUser && currentUser.id === item.user_id

  // 안전한 네비게이션 핸들러 (Origin 정보 포함)
  const handleEditClick = useCallback(async () => {
    try {
      const editPath = createLinkWithOrigin(`${detailUrl}/edit`)
      await router.push(editPath)
    } catch (error) {
      console.error('Navigation error:', error)
    }
  }, [router, detailUrl, createLinkWithOrigin])

  // Hook 안정성을 위한 값 안정화
  const stableItemId = useMemo(() => item.item_id || item.id, [item.item_id, item.id])
  const cardRef = useRef<HTMLElement | null>(null)
  const impressionLogged = useRef(false)

  useEffect(() => {
    if (surface !== "home" || impressionLogged.current || loggedFeedImpressions.has(stableItemId) || !cardRef.current) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.5 || impressionLogged.current || loggedFeedImpressions.has(stableItemId)) return
      impressionLogged.current = true
      loggedFeedImpressions.add(stableItemId)
      logEvent("feed_impression", stableItemId, "home")
      observer.disconnect()
    }, { threshold: 0.5 })
    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [stableItemId, surface])
  const stableFallbackData = useMemo(() => ({
    ...item,
    likes_count: item.likes_count || 0,
    comments_count: item.comments_count || 0,
    is_liked: item.is_liked || false
  }), [item])

  // 썸네일 관리 - SSA 캐시된 데이터 사용 (캐시 데이터를 먼저 가져옴)
  const cachedItem = useItemCache(stableItemId, stableFallbackData)
  // 표시용 값: 수정 직후 즉시 갱신되는 개별 항목 캐시를 우선하고, 캐시에 없는 값만 목록 데이터를 쓴다.
  // (홈 피드 목록 캐시는 새로고침 전까지 갱신되지 않아 수정한 제목, 본문 등이 이전 값으로 남던 문제 방지)
  const displayItem: Item = { ...item, ...cachedItem }
  

  

  

  
  const orderedImages = orderImagesForDisplay(cachedItem.image_urls, cachedItem.thumbnail_index)



  // 참고 레시피 로딩
  const { citedRecipes, isLoading: citedRecipesLoading } = useCitedRecipes(item.cited_recipe_ids)

  // 작성자 정보 캐시 적용
  const enrichedItem = enrichWithCachedAuthor(item)

  	// 삭제 관련 상태
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	
	// 더블탭 좋아요 상태 관리
	const [showHeartAnimation, setShowHeartAnimation] = useState(false)
	const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // SSA: 캐시된 좋아요 데이터 사용
  const likesCount = cachedItem.likes_count
  const hasLiked = cachedItem.is_liked
  


  // 작성자 정보 캐시 저장
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

  // 더블탭 좋아요 핸들러 (프로필 그리드와 동일한 SSA 기반 로직)
  const handleDoubleTapLike = async () => {
    // 비로그인 사용자 회원가입 유도 (토스 UX 스타일 - 바텀시트)
    if (!currentUser?.id) {
      setShowLoginPrompt(true)
      return
    }
    
    try {
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

  // SSA 기반 삭제 처리 (즉시 홈화면에서 사라짐)
  const handleDelete = async () => {
    if (!isOwnItem || isDeleting) return

    setIsDeleting(true)


    try {
      // 1. 모든 목록·상세 캐시에서 바로 뺀다. 실패하면 rollback이 목록을 다시 받는다
      const rollback = await cacheManager.deleteItems([item.item_id || item.id])
      
      // SSA STEP 2: 백그라운드 DB 삭제
      try {
        // 글이 지워지면 사진 목록도 사라지므로 먼저 모아 둔다
        const imageUrls = await collectItemImageUrls(supabase, [item.item_id || item.id])
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', item.item_id || item.id)
          .eq('user_id', currentUser?.id) // 보안: 자신의 아이템만 삭제

        if (error) throw error
        revalidateItemPage(item.item_id || item.id, item.tags ?? []) // 상세 + 검색 자산에서 즉시 제거
        removeItemImages(imageUrls) // 지운 글의 사진 파일도 지운다


        
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

  // 댓글 페이지로 이동
  const handleCommentClick = () => {
    router.push(detailUrl)
  }

  // 공유하기
  const handleShare = () => {
    const url = `${window.location.origin}${detailUrl}`
    const text = displayItem.title || displayItem.content?.substring(0, 100) || '맛있는 레시피'
    share({ title: 'Spoonie에서 보기', text, url, itemId: stableItemId, origin: surface })
  }

  const cookingTime = formatCookingTime(displayItem.cooking_time_minutes)
  const profileHref = `/profile/${enrichedItem.user_public_id || enrichedItem.user_id}`
  // 카드 글 영역을 누르면 상세로 (안의 링크를 누른 경우는 링크가 이동을 맡는다)
  const goDetail = (e: React.MouseEvent) => {
    if ((e.target as Element).closest("a")) return
    router.push(detailUrl)
  }

  return (
    <Sheet ref={cardRef} as="article" className="relative">

      <header className="flex items-center justify-between gap-2 py-2 pl-4 pr-1.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <IntentLink href={profileHref} aria-hidden tabIndex={-1}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={enrichedItem.avatar_url || undefined} alt="" />
              <AvatarFallback>{(enrichedItem.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </IntentLink>
          <div className="min-w-0">
            {/* 누르는 영역 24px: 위아래로 넓히되 같은 만큼 바깥 여백을 줄여 모양은 그대로 */}
            <IntentLink href={profileHref} className="-my-[1.5px] block truncate py-[1.5px] text-label font-semibold text-ink">
              {enrichedItem.username || "알 수 없는 사용자"}
            </IntentLink>
            <p className="text-meta text-ink-soft">
              <span>{isRecipe ? "레시피" : "레시피드"}</span>
              {" · "}
              {/* 시간은 글자로만 둔다: 바로 위 이름 링크와 1px 간격이라 누르는 영역이 겹친다. 글로 가는 길은 제목·사진에 있다 */}
              <RelativeTime iso={item.created_at} />
              {!displayItem.is_public && <span> · 비공개</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center">
          {!isOwnItem && <FollowButton userId={item.user_id} initialIsFollowing={item.is_following} eventOrigin={surface} />}
          {isOwnItem && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="더보기">
                  <MoreVertical className="h-5 w-5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[8rem]">
                <DropdownMenuItem onClick={handleEditClick} className="min-h-11 cursor-pointer gap-2">
                  <Edit className="h-4 w-4" aria-hidden />
                  수정
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="min-h-11 cursor-pointer gap-2 text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4" aria-hidden />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* 레시피(자산)는 글이 먼저: 제목·메타가 사진 위에 온다 */}
      {isRecipe && (
        <div className="cursor-pointer px-4 pb-3" onClick={goDetail}>
          <h2 className="text-title text-ink [text-wrap:balance]">
            <IntentLink href={detailUrl}>{displayItem.title}</IntentLink>
          </h2>
          {(displayItem.servings || cookingTime) && (
            <p className="mt-1 text-label text-ink-soft">
              {[displayItem.servings ? `${displayItem.servings}인분` : null, cookingTime ? `조리 ${cookingTime}` : null].filter(Boolean).join(" · ")}
            </p>
          )}
          {/* 핵심 재료: 사진 없이도 무엇을 만드는 글인지 읽힌다 */}
          {!!displayItem.key_ingredients?.length && (
            <p className="mt-0.5 truncate text-label text-ink">
              <span className="text-ink-soft">재료 {displayItem.ingredient_count}가지 · </span>
              {displayItem.key_ingredients.join(", ")}
              {(displayItem.ingredient_count || 0) > displayItem.key_ingredients.length && <span className="text-ink-soft"> 외</span>}
            </p>
          )}
        </div>
      )}

      {/* 레시피드(활동)는 어떤 레시피에서 나왔는지가 먼저: 출처 행 */}
      {!isRecipe && !citedRecipesLoading && <SourceRow recipes={citedRecipes} creationOrigin={displayItem.creation_origin} />}

      {orderedImages.length > 0 && (
        <div className="relative">
          <ImageCarousel
            images={orderedImages}
            frame={isRecipe ? "recipe" : "recipeed"}
            alt={displayItem.title || `${enrichedItem.username || "작성자"}님의 레시피드 사진`}
            priority={priority}
            onSingleClick={() => router.push(detailUrl)}
            onDoubleClick={handleDoubleTapLike}
          />
          {showHeartAnimation && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
              <Heart className="h-16 w-16 animate-ping fill-like text-like" aria-hidden />
            </div>
          )}
        </div>
      )}

      <div className="cursor-pointer px-4 pt-3" onClick={goDetail}>
        {isRecipe ? (
          <>
            {displayItem.description && (
              <ExpandableText text={displayItem.description} maxLines={2} onExpand={() => router.push(detailUrl)} className="text-label text-ink" />
            )}
            {/* 다른 사람이 실제로 만든 기록: 레시피의 신뢰 증거 */}
            <MadeProof
              madeCount={displayItem.made_count}
              continuedCount={displayItem.continued_count}
              thumbs={displayItem.made_thumbs}
              className={displayItem.description ? "mt-2.5" : ""}
            />
          </>
        ) : (
          <>
            {displayItem.title && <p className="mb-1 text-label font-semibold text-ink">{displayItem.title}</p>}
            <ExpandableText text={displayItem.content || ""} maxLines={3} onExpand={() => router.push(detailUrl)} className="text-body text-ink" />
          </>
        )}

        {displayItem.tags && displayItem.tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1" aria-label="태그">
            {displayItem.tags.map((tag, idx) => (
              <li key={idx}>
                <IntentLink href={topicHref(tag)} className="inline-flex min-h-8 items-center text-meta text-ink-soft hover:text-ink">#{tag}</IntentLink>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-between px-2 pb-1 pt-1">
        <div className="flex items-center text-ink-soft">
          <LikeButton
            itemId={item.item_id || item.id}
            itemType={item.item_type}
            authorId={item.user_id}
            currentUserId={currentUser?.id}
            initialLikesCount={likesCount}
            initialHasLiked={hasLiked}
            cachedItem={cachedItem}
          />
          <button type="button" onClick={handleCommentClick} className="flex h-11 items-center gap-1.5 px-2" aria-label={`댓글 ${cachedItem.comments_count || 0}개`}>
            <MessageCircle className="h-5 w-5" aria-hidden />
            <span className="text-label font-medium tabular-nums">{cachedItem.comments_count || 0}</span>
          </button>
        </div>
        <div className="flex items-center">
          <BookmarkButton
            itemId={item.item_id || item.id}
            itemType={item.item_type}
            currentUserId={currentUser?.id}
            initialBookmarksCount={(cachedItem as Item & { bookmarks_count?: number }).bookmarks_count || 0}
            initialIsBookmarked={(cachedItem as Item & { is_bookmarked?: boolean }).is_bookmarked || false}
            size="icon"
            className="h-11 w-11"
            cachedItem={cachedItem}
          />
          <Button variant="ghost" size="icon" onClick={handleShare} className="h-11 w-11 text-ink-soft" aria-label="공유하기">
            <Share2 className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </footer>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>이 {isRecipe ? "레시피" : "레시피드"}를 삭제하면 되돌릴 수 없어요.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LoginPromptSheet isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} action="like" />
    </Sheet>
  )
}
