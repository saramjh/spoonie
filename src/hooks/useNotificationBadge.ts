/**
 * 🔔 무료 플랜 최적화: 폴링 기반 알림 배지 훅
 * 
 * 실시간 연결 없이 주기적으로 읽지 않은 알림 수를 확인
 * Netlify + Supabase 무료 플랜에 최적화된 비용 효율적 접근법
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
      
      // 💰 무료 플랜 최적화: count 쿼리 사용 (데이터 전송량 최소화)
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      
      if (error) {
        // 💰 무료 플랜: 제한 도달 시 조용한 처리
        if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
          console.warn('📱 무료 플랜 제한 도달, 다음 주기에 재시도')
        } else {
          console.error('❌ 알림 수 조회 실패:', error)
        }
        // 에러 시에도 UI 업데이트는 계속 진행
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
    
    // 🎯 무료 플랜 최적화: 폴링 설정 (3분마다 - API 호출 절약)
    const pollInterval = setInterval(() => {
      // 페이지가 활성 상태일 때만 폴링
      if (!document.hidden) {
        fetchUnreadCount()
      }
    }, 180000) // 3분 (무료 플랜 최적화)
    
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