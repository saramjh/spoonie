/**
 * 🚀 간단화된 실시간 동기화 - 통합 캐시 매니저 연동
 * 복잡한 로직 제거, 업계 표준 방식으로 간단하고 안정적
 */

"use client"

import { useEffect, useRef, useCallback } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { cacheManager } from "@/lib/unified-cache-manager"
import type { RealtimeChannel } from "@supabase/supabase-js"

type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE'
type TableName = 'items' | 'likes' | 'comments' | 'follows'

interface RealtimeChange {
  eventType: ChangeType
  table: TableName
  new?: any
  old?: any
  timestamp: string
}

export function useSimplifiedRealtimeSync() {
  const supabase = createSupabaseBrowserClient()
  const channelsRef = useRef<RealtimeChannel[]>([])

  /**
   * 🚀 실시간 변경사항 처리 (간단화)
   */
  const handleRealtimeChange = useCallback(async (change: RealtimeChange) => {
    console.log(`🔄 Realtime change detected:`, change)

    try {
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
    } catch (error) {
      console.error(`❌ Error handling realtime change:`, error)
    }
  }, [])

  /**
   * 📝 아이템 변경 처리
   */
  const handleItemChange = useCallback(async (change: RealtimeChange) => {
    const itemData = change.new || change.old
    if (!itemData?.id) return

    console.log(`📝 Item ${change.eventType}: ${itemData.id}`)

    if (change.eventType === 'DELETE') {
      // 아이템 삭제 시 모든 캐시에서 제거
      await cacheManager.invalidateAll()
    } else {
      // 아이템 생성/수정 시 관련 데이터 업데이트
      await cacheManager.updateItem(itemData.id, itemData)
    }
  }, [cacheManager])

  /**
   * ❤️ 좋아요 변경 처리
   */
  const handleLikeChange = useCallback(async (change: RealtimeChange) => {
    const likeData = change.new || change.old
    if (!likeData?.item_id) return

    const delta = change.eventType === 'INSERT' ? 1 : -1
    console.log(`❤️ Like ${change.eventType}: ${likeData.item_id} (${delta})`)

    // 통합 캐시 매니저를 통해 좋아요 상태 업데이트
    await cacheManager.like(likeData.item_id, likeData.user_id, delta > 0)
  }, [cacheManager])

  /**
   * 💬 댓글 변경 처리
   */
  const handleCommentChange = useCallback(async (change: RealtimeChange) => {
    const commentData = change.new || change.old
    if (!commentData?.item_id) return

    const delta = change.eventType === 'INSERT' ? 1 : -1
    console.log(`💬 Comment ${change.eventType}: ${commentData.item_id} (${delta})`)

    // 통합 캐시 매니저를 통해 댓글 수 업데이트
    await cacheManager.comment(commentData.item_id, commentData.user_id, delta)
  }, [cacheManager])

  /**
   * 👥 팔로우 변경 처리
   */
  const handleFollowChange = useCallback(async (change: RealtimeChange) => {
    const followData = change.new || change.old
    if (!followData?.following_id) return

    const isFollowing = change.eventType === 'INSERT'
    console.log(`👥 Follow ${change.eventType}: ${followData.following_id}`)

    // 통합 캐시 매니저를 통해 팔로우 상태 업데이트
    await cacheManager.follow(followData.follower_id, followData.following_id, isFollowing)
  }, [cacheManager])

  /**
   * 🔌 실시간 구독 설정
   */
  const setupRealtimeSubscription = useCallback(() => {
    console.log(`🔌 Setting up simplified realtime subscriptions...`)

    // 기존 구독 정리
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel)
    })
    channelsRef.current = []

    // 각 테이블별 실시간 구독 설정
    const tables: TableName[] = ['items', 'likes', 'comments', 'follows']
    
    tables.forEach(tableName => {
      const channel = supabase
        .channel(`realtime-${tableName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName
          },
          (payload) => {
            handleRealtimeChange({
              eventType: payload.eventType as ChangeType,
              table: tableName,
              new: payload.new,
              old: payload.old,
              timestamp: new Date().toISOString()
            })
          }
        )
        .subscribe((status) => {
          console.log(`📡 Realtime ${tableName} subscription:`, status)
        })

      channelsRef.current.push(channel)
    })

    console.log(`✅ Simplified realtime sync setup complete`)
  }, [handleRealtimeChange, supabase])

  // 컴포넌트 마운트 시 실시간 구독 설정
  useEffect(() => {
    setupRealtimeSubscription()

    // 컴포넌트 언마운트 시 구독 정리
    return () => {
      console.log(`🧹 Cleaning up realtime subscriptions...`)
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current = []
    }
  }, [setupRealtimeSubscription, supabase])

  return {
    isConnected: channelsRef.current.length > 0,
    reconnect: setupRealtimeSubscription
  }
} 