"use client"

import { useEffect, useRef, useCallback } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useSWRConfig } from "swr"
import type { RealtimeChannel } from "@supabase/supabase-js"
import type { Item } from "@/types/item"

/**
 * 🔄 실시간 데이터 동기화 훅
 * 레시피/레시피드 변경사항을 즉시 반영하여 심리스한 사용자 경험 제공
 */

type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE'
type TableName = 'items' | 'likes' | 'comments' | 'follows'

interface RealtimeChange {
  eventType: ChangeType
  table: TableName
  new?: any
  old?: any
  timestamp: string
}

interface OptimisticUpdate {
  id: string
  type: 'like' | 'comment' | 'follow' | 'item'
  action: 'add' | 'remove' | 'update'
  data: any
  timestamp: number
}

export function useRealtimeSync() {
  const supabase = createSupabaseBrowserClient()
  const { mutate } = useSWRConfig()
  const channelsRef = useRef<RealtimeChannel[]>([])
  const optimisticUpdatesRef = useRef<Map<string, OptimisticUpdate>>(new Map())

  /**
   * 🚀 Optimistic UI 업데이트 (즉시 반영)
   * 사용자 액션을 서버 응답 전에 즉시 UI에 반영
   */
  const applyOptimisticUpdate = useCallback(async (update: OptimisticUpdate) => {
    console.log(`🚀 Applying optimistic update:`, update)
    
    // 중복 업데이트 방지
    const key = `${update.type}_${update.id}_${update.action}`
    optimisticUpdatesRef.current.set(key, update)

    // 5초 후 자동 정리 (서버 확인 시간 충분히 확보)
    setTimeout(() => {
      optimisticUpdatesRef.current.delete(key)
    }, 5000)

    try {
      switch (update.type) {
        case 'like':
          await handleOptimisticLike(update)
          break
        case 'comment':
          await handleOptimisticComment(update)
          break
        case 'follow':
          await handleOptimisticFollow(update)
          break
        case 'item':
          await handleOptimisticItem(update)
          break
      }
    } catch (error) {
      console.error(`❌ Optimistic update failed:`, error)
      // 실패 시 롤백 (다음 실시간 업데이트에서 수정됨)
    }
  }, [mutate])

  /**
   * ❤️ 좋아요 Optimistic 업데이트
   */
  const handleOptimisticLike = useCallback(async (update: OptimisticUpdate) => {
    const { id: itemId, action, data } = update
    
    // 홈피드 캐시 업데이트
    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      (cachedData: Item[][] | undefined) => {
        if (!cachedData) return cachedData

        return cachedData.map(page => 
          page.map(item => {
            if (item.id === itemId || item.item_id === itemId) {
              const currentLikes = item.likes_count || 0
              const newLikesCount = action === 'add' ? currentLikes + 1 : currentLikes - 1
              
              return {
                ...item,
                likes_count: Math.max(0, newLikesCount),
                user_has_liked: action === 'add'
              }
            }
            return item
          })
        )
      },
      { revalidate: false }
    )

    // 상세 페이지 캐시도 업데이트
    await mutate(`item_details_${itemId}`, undefined, { revalidate: false })
    
    console.log(`❤️ Optimistic like ${action} for item ${itemId}`)
  }, [mutate])

  /**
   * 💬 댓글 Optimistic 업데이트
   */
  const handleOptimisticComment = useCallback(async (update: OptimisticUpdate) => {
    const { id: itemId, action, data } = update
    
    // 홈피드 댓글 수 업데이트
    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      (cachedData: Item[][] | undefined) => {
        if (!cachedData) return cachedData

        return cachedData.map(page => 
          page.map(item => {
            if (item.id === itemId || item.item_id === itemId) {
              const currentComments = item.comments_count || 0
              const newCommentsCount = action === 'add' ? currentComments + 1 
                                     : action === 'remove' ? currentComments - 1 
                                     : currentComments
              
              return {
                ...item,
                comments_count: Math.max(0, newCommentsCount)
              }
            }
            return item
          })
        )
      },
      { revalidate: false }
    )

    // 댓글 목록 캐시 업데이트
    if (action === 'add' && data.comment) {
      await mutate(`comments_${itemId}`, (cached: any) => {
        if (!cached) return cached
        return [...(cached || []), data.comment]
      }, { revalidate: false })
    }
    
    console.log(`💬 Optimistic comment ${action} for item ${itemId}`)
  }, [mutate])

  /**
   * 👥 팔로우 Optimistic 업데이트
   */
  const handleOptimisticFollow = useCallback(async (update: OptimisticUpdate) => {
    const { id: userId, action } = update
    
    // 홈피드에서 해당 사용자 게시물의 팔로우 상태 업데이트
    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      (cachedData: Item[][] | undefined) => {
        if (!cachedData) return cachedData

        return cachedData.map(page => 
          page.map(item => {
            if (item.user_id === userId) {
              return {
                ...item,
                is_following_author: action === 'add'
              }
            }
            return item
          })
        )
      },
      { revalidate: false }
    )
    
    console.log(`👥 Optimistic follow ${action} for user ${userId}`)
  }, [mutate])

  /**
   * 📝 아이템 Optimistic 업데이트 (생성/수정/삭제)
   */
  const handleOptimisticItem = useCallback(async (update: OptimisticUpdate) => {
    const { action, data } = update
    
    if (action === 'add' && data.item) {
      // 새 아이템을 홈피드 최상단에 추가
      await mutate(
        (key) => typeof key === "string" && key.startsWith("items|"),
        (cachedData: Item[][] | undefined) => {
          if (!cachedData || cachedData.length === 0) {
            return [[data.item]]
          }
          
          const updatedData = [...cachedData]
          updatedData[0] = [data.item, ...updatedData[0]]
          return updatedData
        },
        { revalidate: false }
      )
      
      console.log(`📝 Optimistic item added:`, data.item.title)
    } else if (action === 'remove' && data.itemId) {
      // 아이템을 홈피드에서 제거
      await mutate(
        (key) => typeof key === "string" && key.startsWith("items|"),
        (cachedData: Item[][] | undefined) => {
          if (!cachedData) return cachedData

          return cachedData.map(page => 
            page.filter(item => 
              item.id !== data.itemId && item.item_id !== data.itemId
            )
          )
        },
        { revalidate: false }
      )
      
      console.log(`📝 Optimistic item removed: ${data.itemId}`)
    }
  }, [mutate])

  /**
   * 🔄 실시간 변경사항 처리
   * 서버에서 확인된 변경사항을 실제 데이터로 반영
   */
  const handleRealtimeChange = useCallback(async (change: RealtimeChange) => {
    console.log(`🔄 Realtime change received:`, change)
    
    // 3초 이내의 optimistic 업데이트는 무시 (중복 방지)
    const recentOptimistic = Array.from(optimisticUpdatesRef.current.values())
      .find(opt => Date.now() - opt.timestamp < 3000)
    
    if (recentOptimistic) {
      console.log(`⏭️ Skipping realtime update (recent optimistic update exists)`)
      return
    }

    switch (change.table) {
      case 'items':
        await handleItemChange(change)
        break
      case 'likes':
        await handleLikeChange(change)
        break
      case 'comments':
        await handleCommentChange(change)
        break
      case 'follows':
        await handleFollowChange(change)
        break
    }
  }, [mutate])

  /**
   * 📝 아이템 변경사항 처리
   */
  const handleItemChange = useCallback(async (change: RealtimeChange) => {
    const { eventType, new: newData, old: oldData } = change
    
    if (eventType === 'INSERT' && newData) {
      // 새 아이템이 공개되면 홈피드에 추가
      if (newData.is_public) {
        await mutate(
          (key) => typeof key === "string" && key.startsWith("items|"),
          (cachedData: Item[][] | undefined) => {
            if (!cachedData || cachedData.length === 0) {
              return [[newData as Item]]
            }
            
            // 중복 확인
            const exists = cachedData.some(page => 
              page.some(item => item.id === newData.id)
            )
            
            if (!exists) {
              const updatedData = [...cachedData]
              updatedData[0] = [newData as Item, ...updatedData[0]]
              return updatedData
            }
            
            return cachedData
          },
          { revalidate: false }
        )
      }
    } else if (eventType === 'UPDATE' && newData && oldData) {
      // 아이템 업데이트
      await mutate(
        (key) => typeof key === "string" && key.startsWith("items|"),
        (cachedData: Item[][] | undefined) => {
          if (!cachedData) return cachedData

          return cachedData.map(page => 
            page.map(item => {
              if (item.id === newData.id) {
                return { ...item, ...newData }
              }
              return item
            })
          )
        },
        { revalidate: false }
      )
      
      // 상세 페이지 캐시도 업데이트
      await mutate(`item_details_${newData.id}`, undefined, { revalidate: true })
    } else if (eventType === 'DELETE' && oldData) {
      // 아이템 삭제
      await mutate(
        (key) => typeof key === "string" && key.startsWith("items|"),
        (cachedData: Item[][] | undefined) => {
          if (!cachedData) return cachedData

          return cachedData.map(page => 
            page.filter(item => item.id !== oldData.id)
          )
        },
        { revalidate: false }
      )
    }
    
    console.log(`📝 Item ${eventType} processed: ${newData?.id || oldData?.id}`)
  }, [mutate])

  /**
   * ❤️ 좋아요 변경사항 처리
   */
  const handleLikeChange = useCallback(async (change: RealtimeChange) => {
    const { eventType, new: newData, old: oldData } = change
    const itemId = newData?.item_id || oldData?.item_id
    
    if (!itemId) return

    // 좋아요 수 다시 계산 및 업데이트
    const { count: likesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', itemId)

    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      (cachedData: Item[][] | undefined) => {
        if (!cachedData) return cachedData

        return cachedData.map(page => 
          page.map(item => {
            if (item.id === itemId || item.item_id === itemId) {
                             return {
                 ...item,
                 likes_count: likesCount || 0
               }
            }
            return item
          })
        )
      },
      { revalidate: false }
    )
    
    console.log(`❤️ Like ${eventType} processed for item ${itemId}`)
  }, [mutate, supabase])

  /**
   * 💬 댓글 변경사항 처리
   */
  const handleCommentChange = useCallback(async (change: RealtimeChange) => {
    const { eventType, new: newData, old: oldData } = change
    const itemId = newData?.item_id || oldData?.item_id
    
    if (!itemId) return

    // 댓글 수 다시 계산 및 업데이트 (삭제된 댓글 제외)
    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', itemId)
      .eq('is_deleted', false)

    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      (cachedData: Item[][] | undefined) => {
        if (!cachedData) return cachedData

        return cachedData.map(page => 
          page.map(item => {
            if (item.id === itemId || item.item_id === itemId) {
                             return {
                 ...item,
                 comments_count: commentsCount || 0
               }
            }
            return item
          })
        )
      },
      { revalidate: false }
    )

    // 댓글 목록 캐시도 업데이트
    await mutate(`comments_${itemId}`, undefined, { revalidate: true })
    
    console.log(`💬 Comment ${eventType} processed for item ${itemId}`)
  }, [mutate, supabase])

  /**
   * 👥 팔로우 변경사항 처리
   */
  const handleFollowChange = useCallback(async (change: RealtimeChange) => {
    const { eventType, new: newData, old: oldData } = change
    
    // 팔로우 관련 데이터 새로고침
    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      undefined,
      { revalidate: true }
    )
    
    console.log(`👥 Follow ${eventType} processed`)
  }, [mutate])

  /**
   * 🎧 실시간 구독 설정
   */
  const setupRealtimeSubscriptions = useCallback(() => {
    console.log(`🎧 Setting up realtime subscriptions...`)
    
    // 기존 채널 정리
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel)
    })
    channelsRef.current = []

    // 아이템 변경사항 구독
    const itemsChannel = supabase
      .channel('items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload) => handleRealtimeChange({
          eventType: payload.eventType as ChangeType,
          table: 'items',
          new: payload.new,
          old: payload.old,
          timestamp: new Date().toISOString()
        })
      )
      .subscribe()

    // 좋아요 변경사항 구독
    const likesChannel = supabase
      .channel('likes_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        (payload) => handleRealtimeChange({
          eventType: payload.eventType as ChangeType,
          table: 'likes',
          new: payload.new,
          old: payload.old,
          timestamp: new Date().toISOString()
        })
      )
      .subscribe()

    // 댓글 변경사항 구독
    const commentsChannel = supabase
      .channel('comments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        (payload) => handleRealtimeChange({
          eventType: payload.eventType as ChangeType,
          table: 'comments',
          new: payload.new,
          old: payload.old,
          timestamp: new Date().toISOString()
        })
      )
      .subscribe()

    // 팔로우 변경사항 구독
    const followsChannel = supabase
      .channel('follows_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'follows' },
        (payload) => handleRealtimeChange({
          eventType: payload.eventType as ChangeType,
          table: 'follows',
          new: payload.new,
          old: payload.old,
          timestamp: new Date().toISOString()
        })
      )
      .subscribe()

    channelsRef.current = [itemsChannel, likesChannel, commentsChannel, followsChannel]
    
    console.log(`✅ Realtime subscriptions active: ${channelsRef.current.length} channels`)
  }, [handleRealtimeChange])

  /**
   * 🧹 정리 함수
   */
  const cleanup = useCallback(() => {
    console.log(`🧹 Cleaning up realtime subscriptions...`)
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel)
    })
    channelsRef.current = []
    optimisticUpdatesRef.current.clear()
  }, [supabase])

  // 컴포넌트 마운트 시 구독 설정
  useEffect(() => {
    setupRealtimeSubscriptions()
    return cleanup
  }, [setupRealtimeSubscriptions, cleanup])

  return {
    applyOptimisticUpdate,
    handleRealtimeChange,
    setupRealtimeSubscriptions,
    cleanup,
    isConnected: channelsRef.current.length > 0
  }
} 