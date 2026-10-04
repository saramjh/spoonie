import { create } from 'zustand'
import { createSupabaseBrowserClient } from '@/shared/infra/supabase-client'
import { cacheManager } from '@/shared/infra/unified-cache-manager'

interface FollowStore {
  followingUsers: Set<string>
  isLoading: boolean
  
  // 액션들
  initializeFollowState: (userId: string) => Promise<void>
  follow: (userId: string) => Promise<boolean>
  unfollow: (userId: string) => Promise<boolean>
  isFollowing: (userId: string) => boolean
  
  // 내부 상태 관리
  setFollowing: (userId: string, isFollowing: boolean) => void
  setLoading: (loading: boolean) => void
}

export const useFollowStore = create<FollowStore>((set, get) => ({
  followingUsers: new Set(),
  isLoading: false,
  
  // 같은 세션에서 전체 팔로우 목록을 반복 조회하지 않는다.
  initializeFollowState: async (currentUserId: string) => {
    const supabase = createSupabaseBrowserClient()
    set({ isLoading: true })
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
      
      if (error) throw error
      
      const followingSet = new Set(data?.map(f => f.following_id) || [])
      set({ followingUsers: followingSet })
      
    } catch (error) {
      console.error('❌ FollowStore: Failed to initialize follow state:', error)
      set({ followingUsers: new Set() })
    } finally {
      set({ isLoading: false })
    }
  },
  
  follow: async (targetUserId: string) => {
    
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('❌ [FollowStore] No authenticated user found')
      return false
    }
    
    try {
      // 1. 즉시 UI 업데이트 (Optimistic)
      const state = get()
      
      const newFollowingUsers = new Set(state.followingUsers)
      newFollowingUsers.add(targetUserId)
      set({ followingUsers: newFollowingUsers })
      
      // DB mutation과 관련 캐시 무효화는 cacheManager가 맡는다.
      await cacheManager.follow(user.id, targetUserId, true)
      return true
    } catch (error) {
      console.error('❌ FollowStore: Follow failed:', error)
      
      // store의 optimistic 상태만 원래대로 되돌린다.
      const state = get()
      const rollbackUsers = new Set(state.followingUsers)
      rollbackUsers.delete(targetUserId)
      set({ followingUsers: rollbackUsers })
      
      return false
    }
  },
  
  unfollow: async (targetUserId: string) => {
    
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('❌ [FollowStore] No authenticated user found')
      return false
    }
    
    try {
      // 1. 즉시 UI 업데이트 (Optimistic)
      const state = get()
      
      const newFollowingUsers = new Set(state.followingUsers)
      newFollowingUsers.delete(targetUserId)
      set({ followingUsers: newFollowingUsers })
      
      // DB mutation과 관련 캐시 무효화는 cacheManager가 맡는다.
      await cacheManager.follow(user.id, targetUserId, false)
      return true
    } catch (error) {
      console.error('❌ FollowStore: Unfollow failed:', error)
      
      // store의 optimistic 상태만 원래대로 되돌린다.
      const state = get()
      const rollbackUsers = new Set(state.followingUsers)
      rollbackUsers.add(targetUserId)
      set({ followingUsers: rollbackUsers })
      
      return false
    }
  },
  
  // 빠른 상태 확인 (메모리에서)
  isFollowing: (userId: string) => {
    return get().followingUsers.has(userId)
  },
  
  // 내부 헬퍼 메서드들
  setFollowing: (userId: string, isFollowing: boolean) => {
    const state = get()
    const newFollowingUsers = new Set(state.followingUsers)
    
    if (isFollowing) {
      newFollowingUsers.add(userId)
    } else {
      newFollowingUsers.delete(userId)
    }
    
    set({ followingUsers: newFollowingUsers })
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  }
})) 