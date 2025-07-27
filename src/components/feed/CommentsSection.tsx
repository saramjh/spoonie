"use client"

import { Comment, ItemDetail } from "@/types/item"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { timeAgo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Trash2, Reply, Send } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import useSWR, { useSWRConfig } from "swr"
import { useRefresh } from "@/contexts/RefreshContext"
import { useState, useEffect } from "react"
import { getCommentCountConcurrencySafe } from "@/utils/concurrency-helpers"
import { syncAllCaches } from "@/utils/feed-cache-sync"

interface CommentsSectionProps {
	currentUserId?: string // 현재 로그인한 사용자 ID
	itemId: string // 상세 페이지의 아이템 ID (캐시 갱신용)
	itemType: "recipe" | "post" // 아이템 타입
	onCommentDelete?: () => void // 댓글 삭제 시 호출되는 콜백
	onCommentDeleteRollback?: () => void // 댓글 삭제 실패 시 롤백 콜백
	onCommentsCountChange?: (count: number) => void // 댓글 수 변화 알림 콜백
}

// 댓글 데이터를 가져오는 fetcher 함수
const commentsDataFetcher = async (key: string): Promise<Comment[]> => {
	const supabase = createSupabaseBrowserClient()
	const itemId = key.replace('comments_', '')
	
	const { data, error } = await supabase
		.from('comments')
		.select(`
			id, content, created_at, user_id, parent_comment_id, is_deleted,
			user:profiles!user_id(public_id, display_name, avatar_url, username)
		`)
		.eq('item_id', itemId)
		.order('created_at', { ascending: true })

	if (error) throw error

	// 데이터 변환
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
	})
}

export default function CommentsSection({ currentUserId, itemId, itemType, onCommentDelete, onCommentDeleteRollback, onCommentsCountChange }: CommentsSectionProps) {
	const supabase = createSupabaseBrowserClient()
	const { toast } = useToast()
	const { mutate } = useSWRConfig()
	const { publishItemUpdate } = useRefresh()

	// SWR로 댓글 데이터 가져오기
	const { data: comments = [] } = useSWR(
		`comments_${itemId}`,
		commentsDataFetcher,
		{
			revalidateOnFocus: false,
			dedupingInterval: 5000,
		}
	)

	// 🔧 동시성 안전한 댓글 수 계산 및 부모에게 알림
	useEffect(() => {
		const updateCommentsCount = async () => {
			if (onCommentsCountChange) {
				try {
					// 서버 사이드 집계 쿼리로 정확한 댓글 수 조회
					const accurateCount = await getCommentCountConcurrencySafe(itemId)
					onCommentsCountChange(accurateCount)
				} catch (error) {
					console.error("❌ Failed to get accurate comment count:", error)
					// 폴백: 클라이언트 사이드 계산
					if (comments) {
						const fallbackCount = comments.filter(c => !c.is_deleted).length
						onCommentsCountChange(fallbackCount)
					}
				}
			}
		}

		updateCommentsCount()
	}, [comments, onCommentsCountChange, itemId])

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
	const [isDeleting, setIsDeleting] = useState(false)
	const [replyingTo, setReplyingTo] = useState<string | null>(null)
	const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
	const [isSubmittingReply, setIsSubmittingReply] = useState<Record<string, boolean>>({})
	const [forceUpdate, setForceUpdate] = useState(0) // 강제 리렌더링용

	const handleDeleteClick = (commentId: string) => {
		setCommentToDelete(commentId)
		setDeleteDialogOpen(true)
	}

	const handleDeleteConfirm = async () => {
		if (!commentToDelete) return

		setIsDeleting(true)

		// 낙관적 업데이트: 댓글 수 즉시 감소
		onCommentDelete?.()

		// 실시간 이벤트 발행 (즉시)
		publishItemUpdate({
			itemId,
			itemType,
			updateType: "comment_delete",
			delta: -1,
			userId: currentUserId,
		})

		// CommentsSection의 SWR 캐시 업데이트: 댓글을 삭제된 상태로 표시 (강화된 버전)
		console.log(`🔄 CommentsSection: Applying optimistic delete for comment ${commentToDelete}`)
		
		// 1. 즉시 캐시 업데이트 (더 확실한 방법)
		mutate(
			`comments_${itemId}`,
			(cachedComments: Comment[] | undefined) => {
				console.log(`🔍 CommentsSection: Current cached comments:`, cachedComments?.length || 0)
				if (!cachedComments) return cachedComments
				
				const updatedComments = cachedComments.map(c => {
					if (c.id === commentToDelete) {
						console.log(`✅ CommentsSection: Marking comment ${c.id} as deleted`)
						return { ...c, content: "삭제된 댓글입니다.", is_deleted: true }
					}
					return c
				})
				
				console.log(`🔄 CommentsSection: Updated comments count:`, updatedComments.length)
				return updatedComments
			},
			{ revalidate: false }
		)
		
		// 2. 추가 강제 리렌더링을 위한 상태 변경 트리거
		setForceUpdate(prev => prev + 1)
		setTimeout(() => {
			mutate(`comments_${itemId}`)
		}, 100)

		// ItemDetailView 캐시도 업데이트
		mutate(
			`item_details_${itemId}`,
			(cachedData: unknown) => {
				if (!cachedData || typeof cachedData !== "object") return cachedData
				const data = cachedData as { comments_data?: Comment[]; comments_count?: number }
				if (!data.comments_data) return cachedData
				const updatedComments = data.comments_data.map((c: Comment) =>
					c.id === commentToDelete ? { ...c, content: "삭제된 댓글입니다.", is_deleted: true } : c
				)
				return { ...data, comments_data: updatedComments, comments_count: Math.max(0, (data.comments_count || 0) - 1) }
			},
			false
		)

		// 🚀 통합 캐시 동기화 시스템 적용
		syncAllCaches({
			itemId,
			updateType: 'comment_delete',
			delta: -1
		})

		// 데이터베이스에서 댓글 soft delete (is_deleted = true)
		try {
			const { error } = await supabase
				.from("comments")
				.update({ is_deleted: true })
				.eq("id", commentToDelete)

			if (error) throw error

			// SWR 캐시 갱신 (서버에서 최신 데이터 가져오기)
			mutate(`item_details_${itemId}`)

			// 피드 리스트도 갱신
			mutate((key) => typeof key === "string" && key.startsWith("items|"))

			toast({ title: "댓글이 삭제되었습니다." })
		} catch (error) {
			console.error("Error deleting comment:", error)
			toast({ title: "댓글 삭제에 실패했습니다.", variant: "destructive" })

			// 롤백: 낙관적 업데이트 되돌리기
			onCommentDeleteRollback?.()
			publishItemUpdate({
				itemId,
				itemType,
				updateType: "comment_add", // 롤백이므로 add
				delta: 1,
				userId: currentUserId,
			})
			mutate(`item_details_${itemId}`)
		} finally {
			setIsDeleting(false)
			setDeleteDialogOpen(false)
			setCommentToDelete(null)
		}
	}

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

		// 임시 ID 생성
		const tempId = `temp_${Date.now()}_${Math.random()}`

		// 낙관적 업데이트용 임시 답글 데이터
		const tempReplyData: Comment = {
			id: tempId,
			content: replyText,
			created_at: new Date().toISOString(),
			user_id: currentUserId,
			parent_comment_id: parentCommentId,
			user: {
				id: currentUserId,
				public_id: "", // 임시값
				username: "사용자", // 임시값
				display_name: "사용자", // 임시값
				avatar_url: null,
			},
			is_deleted: false,
		}

		// 낙관적 업데이트 - 즉시 UI에 답글 표시
		mutate(
			`item_details_${itemId}`,
			(currentItem: ItemDetail | undefined) => {
				if (!currentItem || !currentItem.comments_data) return currentItem
				return {
					...currentItem,
					comments_data: [...currentItem.comments_data, tempReplyData],
				}
			},
			false
		)

		// 답글 입력 상태 즉시 초기화 (UI 반응성 향상)
		setReplyingTo(null)
		setReplyTexts({ ...replyTexts, [parentCommentId]: "" })

		try {
			const { data: newReply, error } = await supabase
				.from("comments")
				.insert({
					content: replyText,
					user_id: currentUserId,
					item_id: itemId,
					parent_comment_id: parentCommentId,
				})
				.select(`
					id, content, created_at, user_id, parent_comment_id, is_deleted,
					user:profiles!user_id(public_id, display_name, avatar_url, username)
				`)
				.single()

			if (error) throw error

			// 실제 답글 데이터로 변환
			const userProfile = Array.isArray(newReply.user) ? newReply.user[0] : newReply.user
			const transformedReply: Comment = {
				id: newReply.id,
				content: newReply.content,
				created_at: newReply.created_at,
				user_id: newReply.user_id,
				parent_comment_id: newReply.parent_comment_id,
				is_deleted: newReply.is_deleted,
				user: {
					id: newReply.user_id,
					public_id: userProfile?.public_id || "",
					username: userProfile?.username || "",
					display_name: userProfile?.display_name || "",
					avatar_url: userProfile?.avatar_url,
				},
			}

			// 임시 답글을 실제 답글로 교체
			mutate(
				`item_details_${itemId}`,
				(currentItem: ItemDetail | undefined) => {
					if (!currentItem || !currentItem.comments_data) return currentItem
					const updatedComments = [...currentItem.comments_data]
					const tempIndex = updatedComments.findIndex(c => c.id === tempId)
					if (tempIndex !== -1) {
						updatedComments[tempIndex] = transformedReply
					} else {
						updatedComments.push(transformedReply)
					}
					return {
						...currentItem,
						comments_data: updatedComments,
					}
				},
				false
			)

			// 댓글 수 증가 및 UI 갱신
			publishItemUpdate({
				itemId,
				itemType,
				updateType: "comment_add",
				delta: 1,
				userId: currentUserId,
			})

			// 🚀 통합 캐시 동기화 시스템 적용 (대댓글도 댓글 수에 포함)
			syncAllCaches({
				itemId,
				updateType: 'comment_add',
				delta: 1
			})

			// CommentsSection 캐시 새로고침 (대댓글이 즉시 표시되도록)
			mutate(`comments_${itemId}`)

			// 홈 피드의 댓글 수도 증가
			mutate(
				(key) => typeof key === "string" && key.startsWith("items|"),
				(data: unknown) => {
					if (!data || !Array.isArray(data)) return data
					return data.map((page: unknown) => {
						if (Array.isArray(page)) {
							return page.map((feedItem: { item_id: string; comments_count?: number }) =>
								feedItem.item_id === itemId
									? { ...feedItem, comments_count: (feedItem.comments_count || 0) + 1 }
									: feedItem
							)
						}
						return page
					})
				},
				false
			)

			toast({ title: "답글이 추가되었습니다." })
		} catch (error) {
			console.error("Error adding reply:", error)
			
			// 에러 발생 시 임시 답글 제거
			mutate(
				`item_details_${itemId}`,
				(currentItem: ItemDetail | undefined) => {
					if (!currentItem || !currentItem.comments_data) return currentItem
					return {
						...currentItem,
						comments_data: currentItem.comments_data.filter((c: Comment) => c.id !== tempId),
					}
				},
				false
			)

			toast({ title: "답글 추가에 실패했습니다.", variant: "destructive" })
		} finally {
			setIsSubmittingReply({ ...isSubmittingReply, [parentCommentId]: false })
		}
	}

	// 댓글을 부모 댓글과 답글로 구분
	const parentComments = (comments || []).filter(comment => !comment.parent_comment_id)
	
	// forceUpdate가 변경될 때마다 리렌더링 보장
	console.log(`🔄 CommentsSection: Rendering with ${parentComments.length} parent comments (forceUpdate: ${forceUpdate})`)
	
	const replyMap = (comments || []).reduce((acc, comment) => {
		if (comment.parent_comment_id) {
			if (!acc[comment.parent_comment_id]) {
				acc[comment.parent_comment_id] = []
			}
			acc[comment.parent_comment_id].push(comment)
		}
		return acc
	}, {} as Record<string, Comment[]>)

	// 최신순으로 정렬
	const sortedParentComments = [...parentComments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

	const renderComment = (comment: Comment, isReply = false) => (
		<div key={comment.id} className={`flex items-start gap-3 ${isReply ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
			<Link href={`/profile/${comment.user.public_id || comment.user.username || comment.user_id}`}>
				<Avatar className="h-8 w-8 border">
					<AvatarImage src={comment.user.avatar_url || undefined} />
					<AvatarFallback>{(comment.user.username || comment.user.display_name)?.charAt(0) || "U"}</AvatarFallback>
				</Avatar>
			</Link>
			<div className="flex-1">
				<div className="flex items-baseline gap-2">
					<Link
						href={`/profile/${comment.user.public_id || comment.user.username || comment.user_id}`}
						className="font-semibold text-gray-800 text-sm hover:underline">
						{comment.user.username || comment.user.display_name}
					</Link>
					<p className="text-xs text-gray-500">{timeAgo(comment.created_at)}</p>
				</div>
				{comment.is_deleted ? (
					<p className="text-gray-500 text-sm italic whitespace-pre-wrap mt-1">삭제된 댓글입니다.</p>
				) : (
					<>
						<p className="text-gray-700 text-sm whitespace-pre-wrap mt-1">{comment.content}</p>
						{!isReply && currentUserId && (
							<div className="flex items-center gap-2 mt-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleReply(comment.id)}
									className="text-xs text-gray-500 hover:text-gray-700 p-1 h-auto">
									<Reply className="w-3 h-3 mr-1" />
									답글
								</Button>
							</div>
						)}
					</>
				)}
				
				{/* 답글 입력 폼 */}
				{replyingTo === comment.id && (
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
								disabled={!replyTexts[comment.id]?.trim() || isSubmittingReply[comment.id]}>
								<Send className="w-4 h-4" />
							</Button>
						</div>
						<Button variant="ghost" size="sm" onClick={handleCancelReply} className="text-xs">
							취소
						</Button>
					</div>
				)}
			</div>
			{currentUserId && currentUserId === comment.user_id && !comment.is_deleted && (
				<Button
					variant="ghost"
					size="icon"
					onClick={() => handleDeleteClick(comment.id)}
					className="w-6 h-6 p-0 text-gray-400 hover:text-red-500">
					<Trash2 className="w-4 h-4" />
				</Button>
			)}
		</div>
	)

	return (
		<>
			<div className="space-y-4">
				{sortedParentComments && sortedParentComments.length > 0 ? (
					sortedParentComments.map((comment) => (
						<div key={comment.id} className="space-y-3">
							{renderComment(comment)}
							{/* 답글들 렌더링 */}
							{replyMap[comment.id] && replyMap[comment.id].length > 0 && (
								<div className="space-y-3">
									{replyMap[comment.id]
										.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
										.map((reply) => renderComment(reply, true))}
								</div>
							)}
						</div>
					))
				) : (
					<p className="text-gray-500 text-sm text-center py-4">아직 댓글이 없습니다.</p>
				)}
			</div>

			{/* 댓글 삭제 확인 다이얼로그 */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>댓글 삭제</AlertDialogTitle>
						<AlertDialogDescription>
							정말로 이 댓글을 삭제하시겠습니까? 삭제된 댓글은 복구할 수 없습니다.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							disabled={isDeleting}
							className="bg-red-600 hover:bg-red-700">
							{isDeleting ? "삭제 중..." : "삭제"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
