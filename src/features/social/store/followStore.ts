import { create } from 'zustand'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { cacheManager } from '@/lib/unified-cache-manager'

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
  
  // SSA 표준: 초기 팔로우 상태 한 번만 로드
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
  
  // SSA 표준: 모든 로직을 cacheManager에 위임
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
      
      // 2. SSA 표준: cacheManager가 모든 것을 처리 (DB 연산 + 캐시 관리 + 자동 롤백)
      await cacheManager.follow(user.id, targetUserId, true)
      return true
    } catch (error) {
      console.error('❌ FollowStore: Follow failed:', error)
      
      // 3. 실패 시 롤백 (SSA가 캐시는 알아서 롤백함)
      const state = get()
      const rollbackUsers = new Set(state.followingUsers)
      rollbackUsers.delete(targetUserId)
      set({ followingUsers: rollbackUsers })
      
      return false
    }
  },
  
  // SSA 표준: 모든 로직을 cacheManager에 위임
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
      
      // 2. SSA 표준: cacheManager가 모든 것을 처리 (DB 연산 + 캐시 관리 + 자동 롤백)
      await cacheManager.follow(user.id, targetUserId, false)
      return true
    } catch (error) {
      console.error('❌ FollowStore: Unfollow failed:', error)
      
      // 3. 실패 시 롤백 (SSA가 캐시는 알아서 롤백함)
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