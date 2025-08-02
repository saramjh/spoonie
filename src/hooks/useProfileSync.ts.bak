"use client"

import { useEffect, useCallback } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useSessionStore } from "@/store/sessionStore"
import { cacheManager, getCacheManager } from "@/lib/unified-cache-manager"

/**
 * 🚀 프로필 실시간 동기화 훅
 * Seamless sync architecture와 통합된 프로필 변경사항 실시간 반영
 */
export function useProfileSync() {
  const supabase = createSupabaseBrowserClient()
  const { profile, setProfile } = useSessionStore()

  /**
   * 🎯 다른 사용자의 프로필 변경사항을 실시간으로 감지하고 캐시 업데이트
   */
  const handleProfileUpdate = useCallback(async (payload: any) => {
    const { new: newProfile, old: oldProfile } = payload
    
    if (!newProfile) return

    // 🚀 현재 사용자의 프로필이 변경된 경우 세션 스토어 업데이트
    if (profile && profile.id === newProfile.id) {
      setProfile({
        ...profile,
        username: newProfile.username,
        avatar_url: newProfile.avatar_url,
      })
    }

    // 🎯 캐시 매니저를 통해 프로필 관련 캐시 무효화/갱신
    try {
      const manager = getCacheManager()
      await manager.smartUpdate({
        type: 'update',
        itemId: newProfile.id,
        userId: newProfile.id,
        data: {
          display_name: newProfile.display_name,
          username: newProfile.username,
          avatar_url: newProfile.avatar_url
        }
      })
    } catch (error) {
      console.warn('프로필 캐시 업데이트 실패:', error)
    }

    console.log(`🔄 Profile updated in real-time: ${newProfile.username}`)
  }, [profile, setProfile])

  /**
   * 🎯 프로필 실시간 구독 시작
   */
  useEffect(() => {
    if (!profile) return

    const profileChannel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        handleProfileUpdate
      )
      .subscribe()

    return () => {
      supabase.removeChannel(profileChannel)
    }
  }, [supabase, profile, handleProfileUpdate])

  return {
    isConnected: true // 연결 상태 (향후 확장 가능)
  }
}