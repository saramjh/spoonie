/**
 * 🔔 폴링 기반 알림 배지 훅
 * 
 * 실시간 연결 없이 주기적으로 읽지 않은 알림 수를 확인
 * 비용 효율적이고 배터리 친화적인 접근법
 */

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

export function useNotificationBadge() {
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  
  const fetchUnreadCount = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setUnreadCount(0)
        setIsLoading(false)
        return
      }
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      
      if (error) {
        console.error('❌ 알림 수 조회 실패:', error)
      } else {
        setUnreadCount(count || 0)
      }
    } catch (error) {
      console.error('❌ 알림 배지 처리 중 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    // 즉시 한 번 실행
    fetchUnreadCount()
    
    // 🎯 폴링 설정 (2분마다 - 배터리 절약)
    const pollInterval = setInterval(() => {
      // 페이지가 활성 상태일 때만 폴링
      if (!document.hidden) {
        fetchUnreadCount()
      }
    }, 120000) // 2분
    
    // 페이지가 다시 활성화될 때 즉시 업데이트
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUnreadCount()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
  
  // 수동 새로고침 함수 (알림 읽음 처리 후 호출용)
  const refreshCount = () => {
    fetchUnreadCount()
  }
  
  return {
    unreadCount,
    isLoading,
    refreshCount
  }
}