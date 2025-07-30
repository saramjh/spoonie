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
  
  // 🚀 업계 표준: 초기 팔로우 상태 한 번만 로드
  initializeFollowState: async (currentUserId: string) => {
    const supabase = createSupabaseBrowserClient()
    set({ isLoading: true })
    
    try {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
      
      const followingSet = new Set(data?.map(f => f.following_id) || [])
      set({ followingUsers: followingSet })
      console.log(`✅ FollowStore: Initialized with ${followingSet.size} following users`)
    } catch (error) {
      console.error('❌ FollowStore: Failed to initialize follow state:', error)
    } finally {
      set({ isLoading: false })
    }
  },
  
  // 🚀 SSA 기반: Optimistic Updates + 통합 캐시 관리
  follow: async (targetUserId: string) => {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    // 1. 즉시 UI 업데이트 (Optimistic)
    const state = get()
    const newFollowingUsers = new Set([...Array.from(state.followingUsers), targetUserId])
    set({ followingUsers: newFollowingUsers })
    
    // 2. SSA 기반: 모든 캐시 옵티미스틱 업데이트
    const rollback = await cacheManager.follow(user.id, targetUserId, true)
    
    try {
      // 3. 서버 요청
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetUserId })
      
      if (error) throw error
      
      console.log(`✅ FollowStore: Successfully followed user ${targetUserId} via SSA`)
      return true
    } catch (error) {
      console.error('❌ FollowStore: Follow failed, rolling back via SSA:', error)
      
      // 4. 실패 시 SSA 롤백
      const rollbackUsers = new Set(state.followingUsers)
      rollbackUsers.delete(targetUserId)
      set({ followingUsers: rollbackUsers })
      rollback() // SSA 캐시 롤백
      return false
    }
  },
  
  // 🚀 SSA 기반: Optimistic Updates + 통합 캐시 관리
  unfollow: async (targetUserId: string) => {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    // 1. 즉시 UI 업데이트 (Optimistic)
    const state = get()
    const newFollowingUsers = new Set(state.followingUsers)
    newFollowingUsers.delete(targetUserId)
    set({ followingUsers: newFollowingUsers })
    
    // 2. SSA 기반: 모든 캐시 옵티미스틱 업데이트
    const rollback = await cacheManager.follow(user.id, targetUserId, false)
    
    try {
      // 3. 서버 요청
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
      
      if (error) throw error
      
      console.log(`✅ FollowStore: Successfully unfollowed user ${targetUserId} via SSA`)
      return true
    } catch (error) {
      console.error('❌ FollowStore: Unfollow failed, rolling back via SSA:', error)
      
      // 4. 실패 시 SSA 롤백
      const rollbackUsers = new Set([...Array.from(state.followingUsers), targetUserId])
      set({ followingUsers: rollbackUsers })
      rollback() // SSA 캐시 롤백
      return false
    }
  },
  
  // 🚀 빠른 상태 확인 (메모리에서)
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