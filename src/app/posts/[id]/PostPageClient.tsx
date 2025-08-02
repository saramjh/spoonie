"use client"

/**
 * 🚀 클라이언트 사이드 포스트 페이지
 * 서버사이드 인증 문제 해결을 위해 클라이언트에서 데이터 로딩
 */

import { useEffect, useState } from "react"
import { notFound } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import ItemDetailView from "@/components/common/ItemDetailView"
import { ItemDetail } from "@/types/item"

interface PostPageClientProps {
  postId: string
}

export default function PostPageClient({ postId }: PostPageClientProps) {
  const [post, setPost] = useState<ItemDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPost = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        
        // 🔐 사용자 인증은 Supabase RLS로 처리됨
        
        // 🚀 클라이언트에서 데이터 조회 (브라우저 세션 인증 사용)
        const { data: postData, error: postError } = await supabase
          .from('items')
          .select(`
            *,
            profiles!items_user_id_fkey (
              id,
              username,
              display_name,
              avatar_url,
              public_id
            )
          `)
          .eq('id', postId)
          .eq('item_type', 'post')
          .single()
        


        if (postError) {
          console.error('❌ Post query error:', postError)
          setError(postError.message)
          return
        }

        if (!postData) {
          console.error('❌ Post not found')
          setError('Post not found')
          return
        }

        setPost(postData as ItemDetail)
      } catch (err) {
        console.error('❌ Post loading error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    loadPost()
  }, [postId])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (error) {
    console.error('🚨 Post page error:', error)
    notFound()
  }

  if (!post) {
    notFound()
  }

  return <ItemDetailView item={post} />
}