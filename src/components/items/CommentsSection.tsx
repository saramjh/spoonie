
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { cacheManager } from "@/shared/infra/unified-cache-manager"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { Send, Trash2, CornerUpLeft } from "lucide-react"
import { Comment } from "@/types/item"
import { timeAgo } from "@/lib/utils"
import useSWR, { mutate } from "swr"
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh"
import type { Item } from "@/types/item"
import { IntentLink } from "@/components/kit"

interface CommentsSectionProps {
  currentUserId?: string
  itemId: string
  cachedItem?: Item // 전체 아이템 데이터 추가
}

export default function CommentsSection({ 
  currentUserId, 
  itemId, 
  cachedItem
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 대댓글 시스템 상태
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [isSubmittingReply, setIsSubmittingReply] = useState<Record<string, boolean>>({})
  
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  // 댓글 데이터 로드 (itemId가 없으면 요청하지 않음)
  const { data: comments, mutate: mutateComments } = useSWR(
    itemId ? `comments_${itemId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id, content, created_at, user_id, parent_comment_id, is_deleted,
          user:profiles!user_id(
            id,
            username,
            display_name,
            avatar_url,
            public_id
          )
        `)
        .eq('item_id', itemId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ CommentsSection: 댓글 로딩 실패:', error)
        throw error
      }
      
      // 데이터 변환 (user 배열을 단일 객체로 변환)
      return (data || []).map(comment => {
        const userProfile = Array.isArray(comment.user) ? comment.user[0] : comment.user
        return {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user_id: comment.user_id,
          parent_comment_id: comment.parent_comment_id,
          is_deleted: comment.is_deleted,
          user: {
            id: comment.user_id,
            public_id: userProfile?.public_id || '',
            username: userProfile?.username || '',
            display_name: userProfile?.username || '',
            avatar_url: userProfile?.avatar_url || null,
          },
        }
      }) as Comment[]
    }
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
    if (!currentUserId || !newComment.trim() || isSubmitting) return

    const commentContent = newComment.trim()
    setIsSubmitting(true)
    setNewComment("")

    // 댓글 수는 먼저 올리고 mutation 실패 시 rollback한다.
    const rollback = await cacheManager.comment(itemId, currentUserId, 1, cachedItem)

    try {
      // DB mutation은 화면 반영 뒤 수행한다.
      const { error } = await supabase.from('comments').insert({
        item_id: itemId,
        user_id: currentUserId,
        content: commentContent,
        parent_comment_id: null // 최상위 댓글
      })

      if (error) throw error

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
    if (!replyText || !currentUserId) return

    setIsSubmittingReply({ ...isSubmittingReply, [parentCommentId]: true })

    // 댓글 수는 먼저 반영하고 mutation 실패 시 rollback한다.
    const rollback = await cacheManager.comment(itemId, currentUserId, 1, cachedItem)

    try {
      // DB mutation은 화면 반영 뒤 수행한다.
      const { error } = await supabase.from('comments').insert({
        item_id: itemId,
        user_id: currentUserId,
        content: replyText,
        parent_comment_id: parentCommentId // 대댓글
      })

      if (error) throw error

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
      const { error } = await supabase
        .from('comments')
        .update({ is_deleted: true })
        .eq('id', commentId)
        .eq('user_id', currentUserId)

      if (error) throw error

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

  return (
    <div className="space-y-4">
      {/* 댓글 목록 */}
      <div className="space-y-4">
        {/* 대댓글 시스템: 부모 댓글과 대댓글 분리 */}
        {(() => {
          // 부모 댓글과 대댓글 분리
          const parentComments = (comments || []).filter(comment => !comment.parent_comment_id)
          const replyMap = (comments || []).reduce((acc, comment) => {
            if (comment.parent_comment_id) {
              if (!acc[comment.parent_comment_id]) {
                acc[comment.parent_comment_id] = []
              }
              acc[comment.parent_comment_id].push(comment)
            }
            return acc
          }, {} as Record<string, Comment[]>)

          return parentComments.map((comment) => (
            <div key={comment.id} className="space-y-3">
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
                      <p className="text-ink text-label whitespace-pre-wrap mt-1 break-words">
                        {comment.content}
                      </p>

                      {/* 답글 버튼 (삭제되지 않은 댓글만) */}
                      {currentUserId && (
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-meta text-ink-soft hover:text-ink p-1 h-auto"
                            onClick={() => handleReply(comment.id)}
                          >
                            <CornerUpLeft className="w-3 h-3 mr-1" />
                            답글
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* 대댓글 입력 폼 (삭제되지 않은 댓글만) */}
                  {replyingTo === comment.id && !comment.is_deleted && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="답글을 입력하세요..."
                          value={replyTexts[comment.id] || ""}
                          onChange={(e) => setReplyTexts({ ...replyTexts, [comment.id]: e.target.value })}
                          className="text-label"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleReplySubmit(comment.id)
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleReplySubmit(comment.id)}
                          disabled={!replyTexts[comment.id]?.trim() || isSubmittingReply[comment.id]}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
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
                <div className="ml-11 space-y-3 border-l-2 border-border pl-4">
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
                              {reply.content}
                            </p>
                          )}
                        </div>
                        
                        {/* 대댓글 삭제 버튼 (삭제되지 않은 댓글만) */}
                        {reply.user_id === currentUserId && !reply.is_deleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteComment(reply.id)}
                            className="text-ink-soft hover:text-like w-5 h-5 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))
        })()}
      </div>

      {/* 댓글 작성 */}
      {currentUserId && (
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            disabled={isSubmitting}
          />
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim() || isSubmitting}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
} 