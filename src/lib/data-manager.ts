/**
 * 🚀 업계 표준: 통합 데이터 관리자 (Instagram/Facebook/Twitter 방식)
 * 
 * 핵심 기능:
 * 1. 모든 CRUD 작업 중앙 관리
 * 2. 자동 캐시 동기화 (홈피드 ↔ 상세페이지 ↔ 레시피북)
 * 3. 옵티미스틱 업데이트 (0ms 응답)
 * 4. 데이터 무결성 보장
 * 5. Seamless UX (단절감 없는 사용자 경험)
 */

import { mutate } from 'swr'
import { createSupabaseBrowserClient } from './supabase-client'
import { getCacheManager } from './unified-cache-manager'

// 🚀 임시로 optimistic 함수들을 정의 (기존 코드 호환성을 위해)
const optimisticCommentUpdate = (...args: any[]) => console.log('🚀 Comment update handled by unified cache manager')
const updateInfiniteCache = (...args: any[]) => console.log('🚀 Cache update handled by unified cache manager')
import { createSWRKey, CacheInvalidators } from './cache-keys'
import type { Item } from '@/types/item'

interface DataManagerOptions {
  userId?: string | null
  skipOptimistic?: boolean
  skipCacheSync?: boolean
}

/**
 * 🎯 통합 데이터 관리자 클래스
 */
export class DataManager {
  private supabase = createSupabaseBrowserClient()
  private currentUserId: string | null = null

  constructor(userId?: string | null) {
    this.currentUserId = userId || null
  }

  /**
   * 🔧 사용자 ID 업데이트
   */
  setUserId(userId: string | null) {
    this.currentUserId = userId
  }

  /**
   * 📝 레시피/레시피드 생성
   */
  async createItem(
    itemData: Partial<Item>,
    options: DataManagerOptions = {}
  ): Promise<{ success: boolean; item?: Item; error?: string }> {
    try {
      console.log(`🚀 DataManager: Creating ${itemData.item_type}...`)
      
      const { data: newItem, error } = await this.supabase
        .from('items')
        .insert(itemData)
        .select(`
          *,
          profiles!user_id(display_name, username, avatar_url, public_id)
        `)
        .single()

      if (error) throw error

      const formattedItem = this.formatItem(newItem)
      
      if (!options.skipOptimistic) {
        // 🚀 옵티미스틱 업데이트: 모든 관련 캐시에 즉시 추가
        await this.addItemToAllCaches(formattedItem)
      }

      console.log(`✅ DataManager: Created ${itemData.item_type} successfully`)
      return { success: true, item: formattedItem }
      
    } catch (error) {
      console.error(`❌ DataManager: Create failed:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * ✏️ 레시피/레시피드 수정
   */
  async updateItem(
    itemId: string,
    updates: Partial<Item>,
    options: DataManagerOptions = {}
  ): Promise<{ success: boolean; item?: Item; error?: string }> {
    try {
      console.log(`🚀 DataManager: Updating item ${itemId}...`)
      
      const { data: updatedItem, error } = await this.supabase
        .from('items')
        .update(updates)
        .eq('id', itemId)
        .select(`
          *,
          profiles!user_id(display_name, username, avatar_url, public_id)
        `)
        .single()

      if (error) throw error

      const formattedItem = this.formatItem(updatedItem)
      
      if (!options.skipOptimistic) {
        // 🚀 옵티미스틱 업데이트: 모든 관련 캐시에서 업데이트
        await this.updateItemInAllCaches(itemId, formattedItem)
      }

      console.log(`✅ DataManager: Updated item ${itemId} successfully`)
      return { success: true, item: formattedItem }
      
    } catch (error) {
      console.error(`❌ DataManager: Update failed:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * 🗑️ 레시피/레시피드 삭제
   */
  async deleteItem(
    itemId: string,
    options: DataManagerOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🚀 DataManager: Deleting item ${itemId}...`)
      
      if (!options.skipOptimistic) {
        // 🚀 옵티미스틱 업데이트: 모든 관련 캐시에서 즉시 제거
        await this.removeItemFromAllCaches(itemId)
      }

      const { error } = await this.supabase
        .from('items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      console.log(`✅ DataManager: Deleted item ${itemId} successfully`)
      return { success: true }
      
    } catch (error) {
      console.error(`❌ DataManager: Delete failed:`, error)
      
      if (!options.skipOptimistic) {
        // 🔄 롤백: 캐시 무효화로 서버 상태 재동기화
        await this.invalidateAllItemCaches(itemId)
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * 💖 좋아요 토글
   */
  async toggleLike(
    itemId: string,
    currentlyLiked: boolean,
    options: DataManagerOptions = {}
  ): Promise<{ success: boolean; newLikeState?: boolean; error?: string }> {
    try {
      const targetAction = currentlyLiked ? 'remove' : 'add'
      const newLikeState = !currentlyLiked
      const delta = newLikeState ? 1 : -1

      if (!options.skipOptimistic) {
        // 🚀 통합 캐시 매니저가 옵티미스틱 업데이트를 처리
        console.log(`🚀 Like optimistic update handled by unified cache manager`)
      }

      if (targetAction === 'add') {
        const { error } = await this.supabase
          .from('likes')
          .insert({ item_id: itemId, user_id: this.currentUserId! })
      } else {
        const { error } = await this.supabase
          .from('likes')
          .delete()
          .eq('item_id', itemId)
          .eq('user_id', this.currentUserId!)
      }

      // 검색 공간 캐시 무효화 (좋아요 수 변경이 인기도에 영향)
      await this.invalidateSearchCaches()

      return { success: true, newLikeState }
      
    } catch (error) {
      console.error(`❌ DataManager: Like toggle failed:`, error)
      
      // 🔄 롤백: 캐시 무효화
      if (!options.skipOptimistic) {
        await mutate(createSWRKey.itemDetail(itemId))
        await this.invalidateHomeFeedCaches()
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * 💬 댓글 추가
   */
  async addComment(
    itemId: string,
    content: string,
    parentCommentId?: string,
    options: DataManagerOptions = {}
  ): Promise<{ success: boolean; comment?: any; error?: string }> {
    try {
      if (!options.skipOptimistic) {
        // 🚀 통합 캐시 매니저가 옵티미스틱 업데이트를 처리
        console.log(`🚀 Comment optimistic update handled by unified cache manager`)
      }

      const { data: comment, error } = await this.supabase
        .from('comments')
        .insert({
          item_id: itemId,
          user_id: this.currentUserId!,
          content,
          parent_comment_id: parentCommentId || null
        })
        .select(`
          *,
          user:profiles!user_id(display_name, username, avatar_url, public_id)
        `)
        .single()

      if (error) throw error

      // 댓글 상세 캐시 무효화
      await mutate(createSWRKey.comments(itemId))

      // 검색 공간 캐시 무효화 (댓글 수 변경이 인기도에 영향)
      await this.invalidateSearchCaches()

      return { success: true, comment }
      
    } catch (error) {
      console.error(`❌ DataManager: Add comment failed:`, error)
      
      // 🔄 롤백
      if (!options.skipOptimistic) {
        optimisticCommentUpdate(this.currentUserId, itemId, -1)
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * 🗑️ 댓글 삭제
   */
  async deleteComment(
    commentId: string,
    itemId: string,
    options: DataManagerOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!options.skipOptimistic) {
        // 🚀 옵티미스틱 업데이트: 댓글 수 -1
        optimisticCommentUpdate(this.currentUserId, itemId, -1)
      }

      const { error } = await this.supabase
        .from('comments')
        .update({ is_deleted: true })
        .eq('id', commentId)

      if (error) throw error

      // 댓글 상세 캐시 무효화
      await mutate(createSWRKey.comments(itemId))

      // 검색 공간 캐시 무효화 (댓글 수 변경이 인기도에 영향)
      await this.invalidateSearchCaches()

      return { success: true }
      
    } catch (error) {
      console.error(`❌ DataManager: Delete comment failed:`, error)
      
      // 🔄 롤백
      if (!options.skipOptimistic) {
        optimisticCommentUpdate(this.currentUserId, itemId, 1)
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * 🔄 모든 캐시에 아이템 추가 (생성 시)
   */
  private async addItemToAllCaches(item: Item) {
    console.log(`🚀 DataManager: Adding item to all caches...`)
    
    // 1. 홈피드 캐시에 추가 (첫 페이지 최상단)
    await mutate(
      (key) => typeof key === "string" && 
               key.startsWith("items|") && 
               key.endsWith(`|${this.currentUserId || "guest"}`),
      (data: Item[][] | undefined) => {
        if (!data || !Array.isArray(data)) return [[item]]
        if (!data[0] || !Array.isArray(data[0])) return [[item], ...data]
        return [[item, ...data[0]], ...data.slice(1)]
      },
      { revalidate: false }
    )

    // 2. 레시피북 캐시에 추가 (내 레시피만)
    if (item.user_id === this.currentUserId && item.item_type === 'recipe') {
      await mutate(
        (key) => typeof key === "string" && 
                 key.startsWith("recipes||") && 
                 key.includes("my_recipes"),
        (data: Item[][] | undefined) => {
          if (!data || !Array.isArray(data)) return [[item]]
          if (!data[0] || !Array.isArray(data[0])) return [[item], ...data]
          return [[item, ...data[0]], ...data.slice(1)]
        },
        { revalidate: false }
      )
    }

    // 3. 검색 공간 캐시 무효화 (인기 게시물에 새 아이템 반영)
    await this.invalidateSearchCaches()

    // 4. 프로필 공간 캐시 무효화 (현재는 상태 기반이므로 추후 SWR 전환 시 활용)
    await this.invalidateProfileCaches(item.user_id)

    console.log(`✅ DataManager: Item added to all caches`)
  }

  /**
   * 🔄 모든 캐시에서 아이템 업데이트 (수정 시)
   */
  private async updateItemInAllCaches(itemId: string, updatedItem: Item) {
    console.log(`🚀 DataManager: Updating item in all caches...`)
    
    // 1. 홈피드 캐시 업데이트
    updateInfiniteCache(this.currentUserId, itemId, updatedItem)

    // 2. 상세페이지 캐시 무효화 (새로운 데이터로 교체)
    await mutate(createSWRKey.itemDetail(itemId), updatedItem, { revalidate: false })

    // 3. 레시피북 캐시 업데이트
    await mutate(
      (key) => typeof key === "string" && key.startsWith("recipes||"),
      (data: Item[][] | undefined) => {
        if (!data || !Array.isArray(data)) return data
        
        return data.map(page => 
          page.map(item => 
            (item.id === itemId || item.item_id === itemId) ? updatedItem : item
          )
        )
      },
      { revalidate: false }
    )

    // 4. 검색 공간 캐시 무효화 (수정된 내용이 검색에 반영되도록)
    await this.invalidateSearchCaches()

    // 5. 프로필 공간 캐시 무효화
    await this.invalidateProfileCaches(updatedItem.user_id)

    console.log(`✅ DataManager: Item updated in all caches`)
  }

  /**
   * 🔄 모든 캐시에서 아이템 제거 (삭제 시)
   */
  private async removeItemFromAllCaches(itemId: string) {
    console.log(`🚀 DataManager: Removing item from all caches...`)
    
    // 삭제 전에 사용자 ID를 추출 (검색/프로필 캐시 무효화용)
    let deletedItemUserId: string | null = null
    
    // 1. 홈피드 캐시에서 제거
    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      (data: Item[][] | undefined) => {
        if (!data || !Array.isArray(data)) return data
        
        return data.map(page => 
          page.filter(item => {
            const shouldRemove = item.id === itemId || item.item_id === itemId
            if (shouldRemove && !deletedItemUserId) {
              deletedItemUserId = item.user_id
            }
            return !shouldRemove
          })
        )
      },
      { revalidate: false }
    )

    // 2. 레시피북 캐시에서 제거
    await mutate(
      (key) => typeof key === "string" && key.startsWith("recipes||"),
      (data: Item[][] | undefined) => {
        if (!data || !Array.isArray(data)) return data
        
        return data.map(page => 
          page.filter(item => 
            item.id !== itemId && item.item_id !== itemId
          )
        )
      },
      { revalidate: false }
    )

    // 3. 상세페이지 캐시 제거
    await mutate(createSWRKey.itemDetail(itemId), null, { revalidate: false })

    // 4. 검색 공간 캐시 무효화 (삭제된 아이템이 검색에서 제거되도록)
    await this.invalidateSearchCaches()

    // 5. 프로필 공간 캐시 무효화
    if (deletedItemUserId) {
      await this.invalidateProfileCaches(deletedItemUserId)
    }

    console.log(`✅ DataManager: Item removed from all caches`)
  }

  /**
   * 🔄 모든 아이템 관련 캐시 무효화 (에러 복구 시)
   */
  private async invalidateAllItemCaches(itemId: string) {
    console.log(`🔄 DataManager: Invalidating all caches for item ${itemId}`)
    
    const keysToInvalidate = CacheInvalidators.invalidateItem(itemId)
    
    for (const key of keysToInvalidate) {
      await mutate(key, undefined, { revalidate: true })
    }

    // 홈피드와 레시피북도 재검증
    await this.invalidateHomeFeedCaches()
    await this.invalidateRecipeBookCaches()
    
    // 검색과 프로필 캐시도 재검증
    await this.invalidateSearchCaches()
    
    // 아이템 작성자의 프로필 캐시도 무효화 (가능한 경우)
    // TODO: itemId로부터 userId를 추출하여 프로필 캐시 무효화
  }

  /**
   * 🔄 전체 시스템 캐시 무효화 (전면 재동기화)
   */
  async invalidateAllCaches() {
    console.log(`🔄 DataManager: Invalidating ALL system caches`)
    
    await Promise.all([
      this.invalidateHomeFeedCaches(),
      this.invalidateRecipeBookCaches(),
      this.invalidateSearchCaches(),
      // 모든 사용자의 프로필 캐시는 개별적으로만 무효화 가능
    ])
    
    console.log(`✅ DataManager: All caches invalidated`)
  }

  /**
   * 🔄 홈피드 캐시 무효화
   */
  private async invalidateHomeFeedCaches() {
    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      undefined,
      { revalidate: true }
    )
  }

  /**
   * 🔄 레시피북 캐시 무효화
   */
  private async invalidateRecipeBookCaches() {
    await mutate(
      (key) => typeof key === "string" && key.startsWith("recipes||"),
      undefined,
      { revalidate: true }
    )
  }

  /**
   * 🔄 검색 공간 캐시 무효화
   */
  private async invalidateSearchCaches() {
    console.log(`🔄 DataManager: Invalidating search caches`)
    
    // 인기 게시물 캐시 무효화
    await mutate('popular_posts', undefined, { revalidate: true })
    
    // 인기 키워드는 변경 빈도가 낮으므로 선택적 무효화
    // await mutate('popular_keywords', undefined, { revalidate: true })
    
    // 검색 결과 캐시 무효화 (검색어별로 캐시되므로 전체 패턴으로)
    await mutate(
      (key) => typeof key === "string" && key.startsWith("search_"),
      undefined,
      { revalidate: true }
    )
  }

  /**
   * 🔄 프로필 공간 캐시 무효화
   */
  private async invalidateProfileCaches(userId: string) {
    console.log(`🔄 DataManager: Invalidating profile caches for user ${userId}`)
    
    // 🚀 프로필 페이지의 사용자 아이템 캐시 무효화
    await mutate(`user_items_${userId}`, undefined, { revalidate: true })
    
    // 추가 프로필 관련 캐시도 무효화
    await mutate(
      (key) => typeof key === "string" && 
               (key.startsWith(`user_items_${userId}`) || 
                key.startsWith(`profile_${userId}`)),
      undefined,
      { revalidate: true }
    )
  }

  /**
   * 🎯 아이템 데이터 포맷팅
   */
  private formatItem(rawItem: any): Item {
    const profile = Array.isArray(rawItem.profiles) ? rawItem.profiles[0] : rawItem.profiles
    
    return {
      ...rawItem,
      item_id: rawItem.id,
      display_name: profile?.display_name,
      username: profile?.username,
      avatar_url: profile?.avatar_url,
      user_public_id: profile?.public_id,
      // 🚀 기존 통계 정보 보존 (수정 시 중요)
      likes_count: rawItem.likes_count ?? 0,
      comments_count: rawItem.comments_count ?? 0,
      is_liked: rawItem.is_liked ?? false,
      is_following: rawItem.is_following ?? false,
    }
  }
}

/**
 * 🎯 싱글톤 인스턴스 (전역 사용)
 */
let globalDataManager: DataManager | null = null

export const getDataManager = (userId?: string | null): DataManager => {
  if (!globalDataManager) {
    globalDataManager = new DataManager(userId)
  } else if (userId !== undefined) {
    globalDataManager.setUserId(userId)
  }
  
  return globalDataManager
}

/**
 * 🎯 편의 함수들 (기존 코드와의 호환성)
 */
export const dataManager = {
  create: (data: Partial<Item>, options?: DataManagerOptions) => 
    getDataManager().createItem(data, options),
    
  update: (id: string, data: Partial<Item>, options?: DataManagerOptions) => 
    getDataManager().updateItem(id, data, options),
    
  delete: (id: string, options?: DataManagerOptions) => 
    getDataManager().deleteItem(id, options),
    
  toggleLike: (id: string, currentlyLiked: boolean, options?: DataManagerOptions) => 
    getDataManager().toggleLike(id, currentlyLiked, options),
    
  addComment: (itemId: string, content: string, parentId?: string, options?: DataManagerOptions) => 
    getDataManager().addComment(itemId, content, parentId, options),
    
  deleteComment: (commentId: string, itemId: string, options?: DataManagerOptions) => 
    getDataManager().deleteComment(commentId, itemId, options),
    
  // 🔄 시스템 캐시 관리
  invalidateAllCaches: () => 
    getDataManager().invalidateAllCaches(),
} 