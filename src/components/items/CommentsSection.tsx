"use client"

import LinkifiedText from "@/components/common/LinkifiedText"

import { useEffect, useState, useId } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { cacheManager } from "@/shared/infra/unified-cache-manager"
import { addComment, fetchComments, softDeleteComment } from "@/features/social/data/comment-repository"
import { Send, Trash2, CornerDownRight } from "lucide-react"
import { Comment } from "@/types/item"
import { cn, timeAgo } from "@/lib/utils"
import useSWR, { mutate } from "swr"
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh"
import type { Item } from "@/types/item"
import { IntentLink, SectionHeading } from "@/components/kit"
import LoginPromptSheet from "@/components/auth/LoginPromptSheet"

const composerClass = "flex items-end gap-2 rounded-xl border border-ink/30 bg-paper p-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
const composerInputClass = "min-h-14 flex-1 resize-none rounded-none border-0 bg-transparent px-1 py-1.5 text-body focus-visible:ring-0"

interface CommentsSectionProps {
  currentUserId?: string
  itemId: string
  cachedItem?: Item // 전체 아이템 데이터 추가
  hidden?: boolean
}

export default function CommentsSection({
  currentUserId,
  itemId,
  cachedItem,
  hidden = false,
}: CommentsSectionProps) {
  const composerId = useId()
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [returnTo, setReturnTo] = useState<string | undefined>()
  const [draftRestored, setDraftRestored] = useState(false)
  const [showOlderComments, setShowOlderComments] = useState(false)

  // 대댓글 시스템 상태
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [isSubmittingReply, setIsSubmittingReply] = useState<Record<string, boolean>>({})

  const { toast } = useToast()
  // Guest drafts belong to one item and browser tab. Authentication never
  // submits them automatically; the user must still press Send afterward.
  const key = "spoonie-comment-draft:" + itemId
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
    if (!active) return
    try {
      const stored = sessionStorage.getItem(key)
      if (stored) {
        const draft = JSON.parse(stored) as {
          at: number; text?: string; replyTo?: string; replies?: Record<string, string>
        }
        if (Number.isFinite(draft.at) && Date.now() - draft.at < 86_400_000) {
          if (typeof draft.text === "string") setNewComment(draft.text.slice(0, 5000))
          if (typeof draft.replyTo === "string") {
            setReplyingTo(draft.replyTo)
            setShowOlderComments(true)
          }
          if (draft.replies && typeof draft.replies === "object") {
            setReplyTexts(Object.fromEntries(Object.entries(draft.replies)
              .filter(([id, value]) => id.length < 120 && typeof value === "string")
              .map(([id, value]) => [id, value.slice(0, 5000)])))
          }
        } else sessionStorage.removeItem(key)
      }
    } catch { /* Disabled storage: keep the draft for this mount. */ }
    setDraftRestored(true)
    })
    return () => { active = false }
  }, [key])

  useEffect(() => {
    if (!draftRestored) return
    try {
      if (newComment || replyingTo || Object.values(replyTexts).some(Boolean)) {
        sessionStorage.setItem(key, JSON.stringify({
          at: Date.now(), text: newComment, replyTo: replyingTo, replies: replyTexts,
        }))
      } else sessionStorage.removeItem(key)
    } catch { /* Text remains in memory. */ }
  }, [draftRestored, key, newComment, replyingTo, replyTexts])

  const loginForComment = () => {
    setReturnTo(window.location.pathname + window.location.search + "#comments")
    setShowLoginPrompt(true)
  }

  // 댓글 데이터 로드 (itemId가 없으면 요청하지 않음)
  const { data: comments, isLoading, error, mutate: mutateComments } = useSWR(
    itemId ? `comments_${itemId}` : null,
    () => fetchComments(itemId)
  )

  // 이 게시물의 댓글 추가/삭제(소프트 삭제는 UPDATE)를 구독해 다른 사용자의 댓글을 즉시 반영한다.
  // 댓글 수는 증감 계산 대신 새 목록에서 다시 세어, 내 댓글이 두 번 반영되지 않게 한다.
  useRealtimeRefresh({
    channel: `comments:${itemId}`,
    table: "comments",
    filter: itemId ? `item_id=eq.${itemId}` : null,
    events: ["INSERT", "UPDATE"],
    onChange: async () => {
      const fresh = await mutateComments()
      if (!fresh) return
      const visibleCount = fresh.filter((comment) => !comment.is_deleted).length
      await mutate(
        `itemDetail|${itemId}`,
        (current: Item | undefined) => (current ? { ...current, comments_count: visibleCount } : current),
        { revalidate: false }
      )
    },
  })

  const handleAddComment = async () => {
    if (!newComment.trim() || isSubmitting) return
    if (!currentUserId) { loginForComment(); return }

    const commentContent = newComment.trim()
    setIsSubmitting(true)
    setNewComment("")

    // 댓글 수는 먼저 올리고 mutation 실패 시 rollback한다.
    const rollback = await cacheManager.comment(itemId, currentUserId, 1, cachedItem)

    try {
      // DB mutation은 화면 반영 뒤 수행한다.
      await addComment(itemId, currentUserId, commentContent, null)

      // 댓글 목록 새로고침
      mutateComments()

      // 댓글/답글 알림과 푸시는 DB 트리거가 서버에서 처리한다


      toast({ title: "댓글이 추가되었습니다." })

    } catch (error) {
      // 실패하면 앞서 반영한 댓글 수를 되돌린다.
      console.error(`❌ Comment error for ${itemId}:`, error)

      setNewComment(commentContent) // 입력 내용 복원
      rollback() // 모든 캐시 자동 롤백 (UI 자동 되돌림)

      toast({
        title: "댓글 추가 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 대댓글 기능
  const handleReply = (commentId: string) => {
    setReplyingTo(commentId)
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
    setReplyTexts({})
  }

  const handleReplySubmit = async (parentCommentId: string) => {
    const replyText = replyTexts[parentCommentId]?.trim()
    if (!replyText) return
    if (!currentUserId) { loginForComment(); return }

    setIsSubmittingReply({ ...isSubmittingReply, [parentCommentId]: true })

    // 댓글 수는 먼저 반영하고 mutation 실패 시 rollback한다.
    const rollback = await cacheManager.comment(itemId, currentUserId, 1, cachedItem)

    try {
      // DB mutation은 화면 반영 뒤 수행한다.
      await addComment(itemId, currentUserId, replyText, parentCommentId)

      // 댓글 목록 새로고침
      mutateComments()

      // 입력 상태 초기화
      setReplyTexts({ ...replyTexts, [parentCommentId]: "" })
      setReplyingTo(null)

      // 댓글/답글 알림과 푸시는 DB 트리거가 서버에서 처리한다


      toast({ title: "답글이 추가되었습니다." })

    } catch (error) {
      console.error(`❌ Reply error for ${parentCommentId}:`, error)

      rollback() // 모든 캐시 자동 롤백 (UI 자동 되돌림)

      toast({
        title: "답글 추가 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive"
      })
    } finally {
      setIsSubmittingReply({ ...isSubmittingReply, [parentCommentId]: false })
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) return

    // 댓글 수는 먼저 반영하고 mutation 실패 시 rollback한다.
    const rollback = await cacheManager.comment(itemId, currentUserId, -1, cachedItem)

    try {
      // DB mutation은 화면 반영 뒤 수행한다.
      await softDeleteComment(commentId, currentUserId)

      // 댓글 목록 새로고침
      mutateComments()


      toast({ title: "댓글이 삭제되었습니다." })

    } catch (error) {
      // 실패하면 앞서 반영한 댓글 수를 되돌린다.
      console.error(`❌ Delete comment error for ${itemId}:`, error)

      rollback() // 모든 캐시 자동 롤백 (UI 자동 되돌림)

      toast({
        title: "댓글 삭제 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive"
      })
    }
  }

  const replyMap: Record<string, Comment[]> = {}
  for (const comment of comments ?? []) {
    if (comment.parent_comment_id) (replyMap[comment.parent_comment_id] ??= []).push(comment)
  }

  const parentComments = (comments ?? []).filter(comment =>
    !comment.parent_comment_id && (!comment.is_deleted || replyMap[comment.id]?.some(reply => !reply.is_deleted))
  )
  const olderCount = Math.max(0, parentComments.length - 3)
  const visibleComments = showOlderComments ? parentComments : parentComments.slice(olderCount)
  const count = comments ? comments.filter(comment => !comment.is_deleted).length : cachedItem?.comments_count

  return (
    <section id="comments" tabIndex={-1} aria-labelledby="comments-heading" hidden={hidden} className="scroll-mt-16 border-t border-border px-4 py-6">
      <SectionHeading id="comments-heading" count={count || undefined}>댓글</SectionHeading>
      <form data-comment-composer className={cn(composerClass, "mt-3")} onSubmit={(event) => { event.preventDefault(); void handleAddComment() }}>
          <label htmlFor={composerId} className="sr-only">댓글</label>
          <Textarea id={composerId} rows={2} value={newComment} onChange={(event) => setNewComment(event.target.value)} placeholder="댓글을 남겨 보세요" disabled={isSubmitting} className={composerInputClass} />
          <Button type="submit" aria-label="댓글 올리기" size="icon" className="shrink-0" disabled={!newComment.trim() || isSubmitting}><Send className="h-5 w-5" aria-hidden /></Button>
      </form>

      {isLoading && <p role="status" className="mt-4 text-caption text-ink-soft">댓글을 불러오는 중…</p>}
      {error && parentComments.length === 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p role="status" className="text-caption text-ink-soft">댓글을 불러오지 못했어요.</p>
          <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => void mutateComments()}>다시 시도</Button>
        </div>
      )}
      {!isLoading && !error && parentComments.length === 0 && (
        <p className="mt-4 text-caption text-ink-soft">아직 댓글이 없어요.</p>
      )}

      {olderCount > 0 && (
        <Button type="button" variant="ghost" className="mt-3 min-h-11 px-0 text-ink-soft" aria-expanded={showOlderComments}
          onClick={() => setShowOlderComments(value => !value)}>
          {showOlderComments ? "이전 댓글 접기" : "이전 댓글 " + olderCount + "개 더 보기"}
        </Button>
      )}

      {visibleComments.length > 0 && <ul className="mt-4 space-y-5">
        {visibleComments.map((comment) => (
          <li key={comment.id} className="space-y-3">
            {/* 부모 댓글 */}
            <div className="flex items-start gap-3">
              {/* 프로필 이미지 + 링크 */}
              <IntentLink href={`/profile/${comment.user?.public_id || comment.user?.username || comment.user_id}`}>
                <Avatar className="h-8 w-8 border hover:opacity-80 transition-opacity">
                  <AvatarImage src={comment.user?.avatar_url || undefined} />
                  <AvatarFallback className="text-meta">
                    {comment.user?.username?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </IntentLink>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  {/* 유저네임 + 프로필 링크 */}
                  <IntentLink
                    href={`/profile/${comment.user?.public_id || comment.user?.username || comment.user_id}`}
                    className="font-semibold text-ink text-label hover:underline transition-colors"
                  >
                    {comment.user?.username || '익명'}
                  </IntentLink>
                  <span className="text-meta text-ink-soft">
                    {timeAgo(comment.created_at)}
                  </span>
                </div>

                {/* 댓글 내용 */}
                {comment.is_deleted ? (
                  <p className="text-ink-soft text-meta italic whitespace-pre-wrap mt-1">
                    삭제된 댓글입니다.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 whitespace-pre-wrap break-words text-body text-ink">
                      <LinkifiedText text={comment.content} />
                    </p>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 min-h-11 px-1 text-meta text-ink-soft hover:text-ink"
                      onClick={() => handleReply(comment.id)}
                    >
                      <CornerDownRight className="h-3 w-3" aria-hidden />
                      답글
                    </Button>
                  </>
                )}

                {/* 대댓글 입력 폼 (삭제되지 않은 댓글만) */}
                {replyingTo === comment.id && !comment.is_deleted && (
                  <div className="mt-3 space-y-2">
                    <form className={composerClass} onSubmit={(event) => { event.preventDefault(); void handleReplySubmit(comment.id) }}>
                      <Textarea rows={2} aria-label={`${comment.user.username}님에게 답글`} placeholder="답글을 남겨 보세요" value={replyTexts[comment.id] || ""} onChange={(event) => setReplyTexts({ ...replyTexts, [comment.id]: event.target.value })} disabled={isSubmittingReply[comment.id]} className={composerInputClass} />
                      <Button type="submit" size="icon" className="shrink-0" aria-label="답글 올리기" disabled={!replyTexts[comment.id]?.trim() || isSubmittingReply[comment.id]}><Send className="h-5 w-5" aria-hidden /></Button>
                    </form>
                    <Button variant="ghost" size="sm" onClick={handleCancelReply} className="text-meta">
                      취소
                    </Button>
                  </div>
                )}
              </div>

              {/* 삭제 버튼 (본인 댓글만 + 삭제되지 않은 댓글만) */}
              {comment.user_id === currentUserId && !comment.is_deleted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteComment(comment.id)}
                  aria-label="내 댓글 지우기"
                  className="h-11 w-11 p-0 text-ink-soft hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" aria-hidden />
                </Button>
              )}
            </div>

            {/* 대댓글들 렌더링 */}
            {replyMap[comment.id] && replyMap[comment.id].length > 0 && (
              <div className="ml-11 space-y-4 border-l border-border pl-4">
                {replyMap[comment.id]
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                  .map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3">
                      {/* 대댓글 프로필 이미지 */}
                      <IntentLink href={`/profile/${reply.user?.public_id || reply.user?.username || reply.user_id}`}>
                        <Avatar className="h-6 w-6 border hover:opacity-80 transition-opacity">
                          <AvatarImage src={reply.user?.avatar_url || undefined} />
                          <AvatarFallback className="text-meta">
                            {reply.user?.username?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </IntentLink>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <IntentLink
                            href={`/profile/${reply.user?.public_id || reply.user?.username || reply.user_id}`}
                            className="font-semibold text-ink text-meta hover:underline transition-colors"
                          >
                            {reply.user?.username || '익명'}
                          </IntentLink>
                          <span className="text-meta text-ink-soft">
                            {timeAgo(reply.created_at)}
                          </span>
                        </div>

                        {/* 대댓글 내용 */}
                        {reply.is_deleted ? (
                          <p className="text-ink-soft text-meta italic whitespace-pre-wrap mt-1">
                            삭제된 댓글입니다.
                          </p>
                        ) : (
                          <p className="text-ink text-meta whitespace-pre-wrap mt-1 break-words">
                            <LinkifiedText text={reply.content} />
                          </p>
                        )}
                      </div>

                      {/* 대댓글 삭제 버튼 (삭제되지 않은 댓글만) */}
                      {reply.user_id === currentUserId && !reply.is_deleted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(reply.id)}
                          aria-label="내 답글 지우기"
                          className="h-11 w-11 p-0 text-ink-soft hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </li>
        ))}
      </ul>}

      <LoginPromptSheet action="comment" isOpen={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} returnTo={returnTo} />
    </section>
  )
}
