/**
 * 🚀 간단화된 CommentsSection - 업계 표준 방식
 * 통합 캐시 매니저 사용으로 복잡한 캐시 로직 제거
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { cacheManager } from "@/lib/unified-cache-manager"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Send, Trash2, CornerUpLeft } from "lucide-react"
import { Comment } from "@/types/item"
import { timeAgo } from "@/lib/utils"
import { notificationService } from "@/lib/notification-service"
import Link from "next/link"
import useSWR from "swr"

interface SimplifiedCommentsSectionProps {
  currentUserId?: string
  itemId: string
  onCommentsCountChange?: (count: number) => void
  cachedItem?: any // 🔑 전체 아이템 데이터 추가
}

export default function SimplifiedCommentsSection({ 
  currentUserId, 
  itemId, 
  onCommentsCountChange,
  cachedItem
}: SimplifiedCommentsSectionProps) {
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 🚀 대댓글 시스템 상태
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
        console.error('❌ SimplifiedCommentsSection: 댓글 로딩 실패:', error)
        throw error
      }
      
      // 🔄 데이터 변환 (user 배열을 단일 객체로 변환)
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
            display_name: userProfile?.display_name || '',
            avatar_url: userProfile?.avatar_url || null,
          },
        }
      }) as Comment[]
    }
  )

  const handleAddComment = async () => {
    if (!currentUserId || !newComment.trim() || isSubmitting) return

    const commentContent = newComment.trim()
    setIsSubmitting(true)
    setNewComment("")

    // 🚀 SSA 표준: 즉시 UI 업데이트 + 모든 캐시 동기화 (0ms)
    const rollback = await cacheManager.comment(itemId, currentUserId, 1, cachedItem)
    const activeCommentsCount = (comments || []).filter(c => !c.is_deleted).length
    onCommentsCountChange?.(activeCommentsCount + 1)

    try {
      // 🚀 STEP 2: 백그라운드 DB 업데이트
      const { error } = await supabase.from('comments').insert({
        item_id: itemId,
        user_id: currentUserId,
        content: commentContent,
        parent_comment_id: null // 최상위 댓글
      })

      if (error) throw error

      // 댓글 목록 새로고침
      mutateComments()
      
      // 🚀 알림 시스템 연동 - 게시글 작성자에게 알림
      await notificationService.notifyComment(itemId, currentUserId, "new_comment_id")
      

      toast({ title: "댓글이 추가되었습니다." })

    } catch (error) {
      // 🚀 STEP 3: 에러 시 자동 롤백
      console.error(`❌ Comment error for ${itemId}:`, error)
      
      setNewComment(commentContent) // 입력 내용 복원
      const activeCommentsCount = (comments || []).filter(c => !c.is_deleted).length
      onCommentsCountChange?.(activeCommentsCount)
      
      rollback() // 모든 캐시 자동 롤백
      
      toast({
        title: "댓글 추가 실패",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 🚀 대댓글 기능
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

    // 🚀 STEP 1: 즉시 UI 업데이트 + 모든 캐시 동기화 (0ms)
    const rollback = await cacheManager.comment(itemId, currentUserId, 1, cachedItem)
    const activeCommentsCount = (comments || []).filter(c => !c.is_deleted).length
    onCommentsCountChange?.(activeCommentsCount + 1)

    try {
      // 🚀 STEP 2: 백그라운드 DB 업데이트
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
      
      // 🚀 알림 시스템 연동 - 게시글 작성자 + 원댓글 작성자에게 알림
      await notificationService.notifyReply(itemId, parentCommentId, currentUserId, "new_reply_id")
      

      toast({ title: "답글이 추가되었습니다." })

    } catch (error) {
      console.error(`❌ Reply error for ${parentCommentId}:`, error)
      
      const activeCommentsCount = (comments || []).filter(c => !c.is_deleted).length
      onCommentsCountChange?.(activeCommentsCount)
      rollback() // 모든 캐시 자동 롤백
      
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

    // 🚀 STEP 1: 즉시 UI 업데이트 + 모든 캐시 동기화 (0ms)
    const rollback = await cacheManager.comment(itemId, currentUserId, -1, cachedItem)
    const activeCommentsCount = (comments || []).filter(c => !c.is_deleted).length
    onCommentsCountChange?.(Math.max(0, activeCommentsCount - 1))

    try {
      // 🚀 STEP 2: 백그라운드 DB 업데이트
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
      // 🚀 STEP 3: 에러 시 자동 롤백
      console.error(`❌ Delete comment error for ${itemId}:`, error)
      
      const activeCommentsCount = (comments || []).filter(c => !c.is_deleted).length
      onCommentsCountChange?.(activeCommentsCount)
      
      rollback() // 모든 캐시 자동 롤백
      
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
        {/* 🚀 대댓글 시스템: 부모 댓글과 대댓글 분리 */}
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
                {/* 🎯 프로필 이미지 + 링크 */}
                <Link href={`/profile/${comment.user?.public_id || comment.user?.username || comment.user_id}`}>
                  <Avatar className="h-8 w-8 border hover:opacity-80 transition-opacity">
                    <AvatarImage src={comment.user?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(comment.user?.username || comment.user?.display_name)?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {/* 🎯 유저네임 + 프로필 링크 */}
                    <Link
                      href={`/profile/${comment.user?.public_id || comment.user?.username || comment.user_id}`}
                      className="font-semibold text-gray-800 text-sm hover:underline transition-colors"
                    >
                      {comment.user?.display_name || comment.user?.username || '익명'}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  
                  {/* 댓글 내용 */}
                  {comment.is_deleted ? (
                    <p className="text-gray-500 text-sm italic whitespace-pre-wrap mt-1">
                      삭제된 댓글입니다.
                    </p>
                  ) : (
                    <>
                      <p className="text-gray-700 text-sm whitespace-pre-wrap mt-1 break-words">
                        {comment.content}
                      </p>

                      {/* 🚀 답글 버튼 (삭제되지 않은 댓글만) */}
                      {currentUserId && (
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-500 hover:text-gray-700 p-1 h-auto"
                            onClick={() => handleReply(comment.id)}
                          >
                            <CornerUpLeft className="w-3 h-3 mr-1" />
                            답글
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* 🚀 대댓글 입력 폼 (삭제되지 않은 댓글만) */}
                  {replyingTo === comment.id && !comment.is_deleted && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="답글을 입력하세요..."
                          value={replyTexts[comment.id] || ""}
                          onChange={(e) => setReplyTexts({ ...replyTexts, [comment.id]: e.target.value })}
                          className="text-sm"
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
                      <Button variant="ghost" size="sm" onClick={handleCancelReply} className="text-xs">
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
                    className="text-gray-400 hover:text-red-500 w-6 h-6 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* 🚀 대댓글들 렌더링 */}
              {replyMap[comment.id] && replyMap[comment.id].length > 0 && (
                <div className="ml-11 space-y-3 border-l-2 border-gray-100 pl-4">
                  {replyMap[comment.id]
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((reply) => (
                      <div key={reply.id} className="flex items-start gap-3">
                        {/* 대댓글 프로필 이미지 */}
                        <Link href={`/profile/${reply.user?.public_id || reply.user?.username || reply.user_id}`}>
                          <Avatar className="h-6 w-6 border hover:opacity-80 transition-opacity">
                            <AvatarImage src={reply.user?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(reply.user?.username || reply.user?.display_name)?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                        </Link>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <Link
                              href={`/profile/${reply.user?.public_id || reply.user?.username || reply.user_id}`}
                              className="font-semibold text-gray-800 text-xs hover:underline transition-colors"
                            >
                              {reply.user?.display_name || reply.user?.username || '익명'}
                            </Link>
                            <span className="text-xs text-gray-500">
                              {timeAgo(reply.created_at)}
                            </span>
                          </div>
                          
                          {/* 대댓글 내용 */}
                          {reply.is_deleted ? (
                            <p className="text-gray-500 text-xs italic whitespace-pre-wrap mt-1">
                              삭제된 댓글입니다.
                            </p>
                          ) : (
                            <p className="text-gray-700 text-xs whitespace-pre-wrap mt-1 break-words">
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
                            className="text-gray-400 hover:text-red-500 w-5 h-5 p-0"
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