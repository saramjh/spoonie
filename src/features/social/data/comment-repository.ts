/** 댓글의 읽기·작성·소프트 삭제는 기존 Supabase RLS가 결정한다. */
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import type { Comment } from "@/types/item"

export async function fetchComments(itemId: string): Promise<Comment[]> {
  const { data, error } = await createSupabaseBrowserClient()
    .from("comments")
    .select(`
      id, content, created_at, user_id, parent_comment_id, is_deleted,
      user:profiles!user_id(id, username, display_name, avatar_url, public_id)
    `)
    .eq("item_id", itemId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data || []).map((comment) => {
    const user = Array.isArray(comment.user) ? comment.user[0] : comment.user
    return {
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      user_id: comment.user_id,
      parent_comment_id: comment.parent_comment_id,
      is_deleted: comment.is_deleted,
      user: {
        id: comment.user_id,
        public_id: user?.public_id || "",
        username: user?.username || "",
        display_name: user?.username || "",
        avatar_url: user?.avatar_url || null,
      },
    }
  })
}

export async function addComment(itemId: string, userId: string, content: string, parentId: string | null): Promise<void> {
  const { error } = await createSupabaseBrowserClient().from("comments").insert({
    item_id: itemId,
    user_id: userId,
    content,
    parent_comment_id: parentId,
  })
  if (error) throw error
}

export async function softDeleteComment(commentId: string, userId: string): Promise<void> {
  const { error } = await createSupabaseBrowserClient()
    .from("comments")
    .update({ is_deleted: true })
    .eq("id", commentId)
    .eq("user_id", userId)
  if (error) throw error
}
