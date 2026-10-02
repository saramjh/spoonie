/**
 * 업계 표준 통합 캐시 관리 시스템
 * Instagram/Twitter/Facebook 방식의 심리스한 사용자 경험
 * 
 * 핵심 원칙:
 * 1. 즉시 UI 반응 (0ms 옵티미스틱 업데이트)
 * 2. 자동 에러 롤백
 * 3. 백그라운드 동기화
 * 4. 단일 진실 공급원
 */

import { mutate } from 'swr'
import { mutateMatching, revalidateStartingWith, updateStartingWith } from '@/lib/swr-cache'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { Item } from '@/types/item'

interface CacheOperation {
  type: 'like' | 'comment' | 'follow' | 'bookmark' | 'create' | 'update' | 'add_new'
  itemId: string
  userId?: string | null
  delta?: number
  data?: Partial<Item>
  timestamp?: number
}

interface RollbackData {
  operation: CacheOperation
  previousState: unknown
  timestamp: number
}

/**
 * 통합 캐시 관리자 - 모든 캐시 연산의 단일 진입점
 */
class UnifiedCacheManager {
  private supabase = createSupabaseBrowserClient()
  private rollbackStack: Map<string, RollbackData> = new Map()
  private batchTimer: NodeJS.Timeout | null = null
  
  // SSA 아키텍처에 업계 표준 Request Deduplication 추가
  private pendingOperations = new Map<string, {
    operation: CacheOperation
    resolve: (rollback: (() => void) | null) => void
    reject: (error: unknown) => void
    timestamp: number
  }>()

  /**
   * 즉시 옵티미스틱 업데이트 (0ms 응답)
   */
  async optimisticUpdate(operation: CacheOperation): Promise<() => void> {
    const operationId = `${operation.type}_${operation.itemId}_${Date.now()}`
    
    // 현재 상태 백업 (롤백용)
    const rollbackData = await this.captureCurrentState(operation)
    this.rollbackStack.set(operationId, rollbackData)
    
    // 즉시 UI 업데이트
    await this.updateAllCaches(operation)
    
    // 롤백 함수 반환
    return () => this.rollback(operationId)
  }



  /**
   * SSA 기반 스마트 업데이트 (Request Deduplication + Batch Processing)
   * 기존 SSA 패턴 유지하면서 서버 효율성 극대화
   */
  async smartUpdate(operation: CacheOperation): Promise<() => void> {
    const { type, itemId, userId } = operation
    const operationKey = `${type}_${itemId}_${userId || 'guest'}`
    

    
    // 업계 표준: Idempotent Operations (중복 실행 방지)
    if (this.pendingOperations.has(operationKey)) {
      return () => {} // 중복 연산은 즉시 반환
    }
    
    // STEP 1: 즉시 옵티미스틱 업데이트 (한 번만 실행)
    const rollback = await this.optimisticUpdate(operation)
    
    // STEP 2: 백그라운드 DB 처리 스케줄링 (즉시 rollback 반환)
    this.pendingOperations.set(operationKey, {
      operation: { ...operation, timestamp: Date.now() },
      resolve: () => {}, // 더미 함수
      reject: () => {},  // 더미 함수
      timestamp: Date.now()
    })
    
    // 배치 처리 스케줄링 (100ms 후 실행)
    this.scheduleBatchProcessing()
    

    
    // 즉시 rollback 함수 반환 (UI 차단 방지)
    return rollback
  }

  /**
   * ⏰ 배치 처리 스케줄링 (Instagram/Twitter 방식)
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }
    
    // 100ms 후에 배치 처리 (서버 부담 최소화)
    this.batchTimer = setTimeout(() => {
      this.processPendingOperations()
    }, 100)
  }

  /**
   * 대기 중인 연산들을 배치로 처리
   */
  private async processPendingOperations(): Promise<void> {
    if (this.pendingOperations.size === 0) return
    
    const operations = Array.from(this.pendingOperations.values()).map(pending => pending.operation)
    this.pendingOperations.clear()
    
    // Removed excessive log
    
    // 배치 처리를 위한 중복 제거
    const uniqueOperations = new Map<string, CacheOperation>()
    
    for (const operation of operations) {
      const itemKey = `${operation.type}_${operation.itemId}`
      if (uniqueOperations.has(itemKey)) {
        // Removed excessive log
        continue
      }
      uniqueOperations.set(itemKey, operation)
    }
    
    // 병렬 DB 연산 실행
    const dbPromises = Array.from(uniqueOperations.values()).map(op => 
      this.executeDbOperation(op).catch(error => {
        console.error(`❌ SSA: DB operation failed for ${op.type}_${op.itemId}:`, error)
        // 에러 발생 시 해당 연산 무시하고 계속 진행
      })
    )
    
    await Promise.all(dbPromises)
    
    // 최종 상태 검증 (3초 후)
    setTimeout(() => {
      uniqueOperations.forEach(op => this.verifyFinalState(op))
    }, 3000)
    
    // Removed excessive log
  }

  /**
   * 실제 DB 연산 실행
   */
  private async executeDbOperation(operation: CacheOperation): Promise<void> {
    const { type, itemId, userId, delta } = operation
    
    switch (type) {
      case 'like':
        const isLike = delta && delta > 0
        if (isLike) {
          const { error } = await this.supabase.from('likes').upsert({
            item_id: itemId,
            user_id: userId
          }, { onConflict: 'user_id,item_id' })
          if (error) throw error
        } else {
          const { error } = await this.supabase.from('likes').delete()
            .eq('item_id', itemId)
            .eq('user_id', userId)
          if (error) throw error
        }
        break
        
      case 'bookmark':
        const isBookmark = delta && delta > 0
        if (isBookmark) {
          const { error } = await this.supabase.from('bookmarks').upsert({
            item_id: itemId,
            user_id: userId
          }, { onConflict: 'user_id,item_id' })
          if (error) throw error
        } else {
          const { error } = await this.supabase.from('bookmarks').delete()
            .eq('item_id', itemId)
            .eq('user_id', userId)
          if (error) throw error
        }
        break
        
      case 'comment':
        // TODO: 댓글 DB 연산
        break
        
      case 'follow':
        const isFollow = delta && delta > 0

        
        if (isFollow) {
          
          const { error } = await this.supabase.from('follows').upsert({
            follower_id: userId,
            following_id: itemId // itemId가 targetUserId
          }, { 
            onConflict: 'follower_id,following_id',
            ignoreDuplicates: false 
          })
          
          if (error) {
            console.error(`❌ [executeDbOperation] Follow insert failed:`, error)
            throw error
          }
        } else {
          const { error, count } = await this.supabase.from('follows').delete({ count: 'exact' })
            .eq('follower_id', userId)
            .eq('following_id', itemId)
          
          if (error) {
            console.error(`❌ [executeDbOperation] Unfollow delete failed:`, error)
            throw error
          }
          
          if (count === 0) {
            console.warn(`⚠️ [executeDbOperation] No follow record found to delete for userId: ${userId}, targetUserId: ${itemId}`)
          }
        }
        break
        
      default:
        console.warn(`🚧 SSA: Unsupported operation type: ${type}`)
    }
  }

  /**
   * 최종 상태 검증 (Instagram 방식)
   */
  private async verifyFinalState(operation: CacheOperation): Promise<void> {
    const { type, itemId, userId } = operation
    
    try {
      // Removed excessive log - only keep for critical errors
      
      if (type === 'like') {
        // 서버의 실제 값(좋아요 수, 내가 눌렀는지)으로 화면을 덮는다. 몇 번 실행돼도 결과가 같다.
        // (예전에는 서버 값을 확인하고도 ±1을 다시 더해, 좋아요 뒤 3초쯤에 숫자가 하나 더 올라갈 수 있었다)
        const [countResult, mineResult] = await Promise.all([
          this.supabase.from('likes').select('item_id', { count: 'exact', head: true }).eq('item_id', itemId),
          this.supabase.from('likes').select('user_id').eq('item_id', itemId).eq('user_id', userId).maybeSingle(),
        ])
        if (countResult.error || mineResult.error) return
        await this.updateAllCaches({
          type: 'update',
          itemId,
          userId,
          data: { likes_count: countResult.count ?? 0, is_liked: !!mineResult.data },
        })
      }
    } catch (error) {
      console.error(`❌ SSA: State verification failed for ${itemId}:`, error)
    }
  }

  /**
   * 모든 관련 캐시 업데이트 (홈피드, 상세페이지, 검색, 프로필)
   */
  private async updateAllCaches(operation: CacheOperation): Promise<void> {
    

    // 팔로우/언팔로우 시 팔로우 수 캐시 즉시 무효화 (비용 최적화)
    if (operation.type === 'follow') {
      const { itemId: targetUserId, userId: currentUserId, delta } = operation
      
      try {
        // 비용 최적화: DB 요청 대신 로컬 계산으로 캐시 업데이트
        const isFollow = delta && delta > 0
        
        // 팔로우한 사용자의 팔로워 수 캐시 업데이트 (DB 요청 없이)
        await mutate(
          `follow_counts_${targetUserId}`,
          (current: { followers: number; following: number } | undefined) => {
            if (!current) return current
            return {
              ...current,
              followers: Math.max(0, current.followers + (isFollow ? 1 : -1))
            }
          },
          { revalidate: false } // DB 재요청 안함
        )
        
        // 팔로우를 실행한 사용자의 팔로잉 수 캐시 업데이트 (DB 요청 없이)
        await mutate(
          `follow_counts_${currentUserId}`,
          (current: { followers: number; following: number } | undefined) => {
            if (!current) return current
            return {
              ...current,
              following: Math.max(0, current.following + (isFollow ? 1 : -1))
            }
          },
          { revalidate: false } // DB 재요청 안함
        )
      } catch (error) {
        console.error('❌ Follow count cache invalidation failed:', error)
      }
    }
    
    try {
      // 1. 홈피드 캐시 업데이트

      await this.updateHomeFeedCache(operation)

    } catch {

    }
    
    try {
      // 2. 상세페이지 캐시 업데이트

      await this.updateItemDetailCache(operation)

    } catch {

    }
    
    try {
      // 3. 검색 결과 캐시 업데이트

      await this.updateSearchCache(operation)

    } catch {

    }
    
    // 프로필 목록의 카드는 글별 캐시(itemDetail|)를 따르므로 따로 갱신하지 않는다
    
    try {
      // 5. 레시피북 캐시 업데이트 (해당하는 경우)

      await this.updateRecipeBookCache(operation)

    } catch {

    }
    
    try {
      // 6. 북마크 캐시 업데이트 (모든 사용자별 북마크 뷰)
      await this.updateBookmarkCache(operation)
    } catch {

    }
    

  }

  /**
   * 홈피드 캐시 업데이트 (useSWRInfinite 구조)
   */
  private async updateHomeFeedCache(operation: CacheOperation): Promise<void> {
    const { type, itemId, delta, data } = operation



    // 팔로우는 피드 목록을 다시 받지 않는다: 팔로우 상태는 followStore가 들고, 카드는 그것을 따른다
    if (type === 'follow') return
    


    // Debug: HomeFeedCache update started

    await mutateMatching(
      (key) => typeof key === 'string' && key.startsWith('items|'),
      (cacheData: Item[][] | undefined) => {
        // Debug: Cache data checked

        if (!cacheData || !Array.isArray(cacheData)) {
          // Debug: No cache data found
          return cacheData
        }

        // CRITICAL FIX: 홈피드 캐시 구조 정상화
        let normalizedCacheData = cacheData;
        const hasCorruptedPages = cacheData.some(page => !Array.isArray(page));
        
        if (hasCorruptedPages) {
          // Debug: Fixing corrupted cache structure
          normalizedCacheData = cacheData.map((page) => {
            if (!Array.isArray(page)) {
              // 페이지가 단일 객체이거나 다른 형태라면 배열로 감싸기
              if (page && typeof page === 'object' && 'id' in page) {
                return [page as Item]; // 단일 아이템이면 배열로 감싸기
              } else {
                return []; // 잘못된 데이터면 빈 배열
              }
            }
            return page as Item[];
          });
          // Debug: Cache structure normalized
        }
        
        // 새로운 아이템 추가 (홈피드 맨 위에 즉시 표시)
        if (type === 'add_new' && data) {
          const newCacheData = [...normalizedCacheData]
          
          if (newCacheData.length > 0) {
            // 타입 안전성: 첫 번째 페이지가 배열인지 확인
            const firstPageData = newCacheData[0]
            const firstPage = Array.isArray(firstPageData) ? [...firstPageData] : []
            
            firstPage.unshift(data as Item)
            newCacheData[0] = firstPage
          } else {
            // 페이지가 없으면 첫 번째 페이지 생성
            newCacheData.push([data as Item])
          }
          
          return newCacheData
        }
        
                // 기존 아이템 업데이트 로직
        let itemFound = false

        // Debug: Searching for item

        const result = normalizedCacheData.map((page) => {
          if (!Array.isArray(page)) {
            // Debug: Page is not an array
            return page // page가 배열인지 안전하게 확인
          }
          
          // Debug: Checking page
          
          return page.map((item) => {
            // 더 관대한 ID 매칭 (다양한 ID 필드 확인)
            const itemMatches = item.id === itemId || 
                              item.item_id === itemId ||
                              (item.id && item.id.toString() === itemId) ||
                              (item.item_id && item.item_id.toString() === itemId)
            
            if (itemMatches) {
              itemFound = true
              // Debug: Found item in cache
              
              const calculateUpdates = this.calculateUpdates(type, delta, operation.data)
              const updates = calculateUpdates(item)
              
              // CRITICAL DEBUG: 업데이트 과정 추적
                              // Debug: Updating item in cache
              
              // 핵심 수정: 이미지 데이터 완전 보존
              const updatedItem = { 
                ...item,  // 모든 기존 데이터 보존 (이미지, 메타데이터 등)
                ...updates  // 좋아요/북마크 상태만 업데이트
              }
              
              // CRITICAL DEBUG: 업데이트 결과 확인
                              // Debug: Item updated successfully
              
              return updatedItem
            }
            return item
          })
        })
        
        // Debug: Search complete
        
        if (!itemFound) {
          // Debug: Item not found in cache
          // SSA 업계표준: 홈피드에 없어도 정상 (다른 페이지에 있을 수 있음)
          return normalizedCacheData // 정상화된 캐시 반환
        }
        
        // Debug: Successfully updated cache
        return result
      },
      { revalidate: false, populateCache: true }
    )
  }

  /**
   * 상세페이지 캐시 업데이트
   */
  private async updateItemDetailCache(operation: CacheOperation): Promise<void> {
    const { itemId, type, delta, data } = operation
    

    // CRITICAL DEBUG: ItemDetailCache 시작 상태 확인
    // Debug: ItemDetailCache update started

    await mutate(
      `itemDetail|${itemId}`,
      (currentItem: Item | undefined) => {
        // SSA 업계표준: 개별 캐시 없으면 홈피드에서 데이터 가져오기
        if (!currentItem) {
          // Debug: No cached item, searching home feed
          
          // 홈피드 캐시에서 완전한 아이템 데이터 찾기
          let foundItem: Item | null = null
          
          // operation data에서 완전한 아이템 데이터 확인
          try {
                    // Debug: Checking operation data
            
            // operation data에 완전한 아이템 정보가 있는지 확인
            if (data && typeof data === 'object' && 'image_urls' in data) {
              
              foundItem = data as Item
            }
          } catch {
    
          }
          
          if (foundItem) {
            // 홈피드에서 찾은 완전한 데이터 사용
            currentItem = { ...foundItem }
          } else {
            // Debug: Item not found, creating fallback
            // 최소한의 fallback (좋아요/북마크만 업데이트, 이미지는 없음)
            currentItem = {
              id: itemId,
              item_id: itemId,
              user_id: (data as { userId?: string; user_id?: string } | undefined)?.userId || (data as { user_id?: string } | undefined)?.user_id || '',
              item_type: 'post',
              created_at: new Date().toISOString(),
              title: null,
              content: null,
              description: null,
              image_urls: null, // 홈피드에서도 찾지 못한 경우에만 null
              thumbnail_index: null,
              tags: null,
              is_public: true,
              color_label: null,
              servings: null,
              cooking_time_minutes: null,
              recipe_id: null,
              cited_recipe_ids: null,
              likes_count: 0,
              comments_count: 0,
              is_liked: false,
              is_following: false,
              bookmarks_count: 0,
              is_bookmarked: false,
            }
          }
        }

        // Normal update for existing cached item

        const calculateUpdates = this.calculateUpdates(type, delta, data)
        const updates = calculateUpdates(currentItem)
        const result = { ...currentItem, ...updates }

        
        // Only log for like operations
        if (type === 'like') {
          
        }
        return result
      },
      { revalidate: false, populateCache: true }
    )
    
    // Only log final result for like operations
    if (type === 'like') {
      
    }
  }

  /**
   * 검색 캐시 업데이트 (모든 검색 뷰와 필터 포함)
   */
  private async updateSearchCache(operation: CacheOperation): Promise<void> {
    const { type, itemId, delta } = operation
    
    // SSA 표준: 검색 결과의 개별 아이템 실시간 업데이트
    await mutateMatching(
      (key) => typeof key === 'string' && (
        key.startsWith('search_page|')                    // 검색 결과 (무한 스크롤). 탐색 목록의 카드는 글별 캐시(itemDetail|)를 따른다
      ),
      (cacheData: Item[] | Item[][] | undefined) => {
        if (!cacheData) return cacheData
        
        // 배열 구조 정규화 (무한스크롤 vs 단일 배열)
        const isInfiniteScroll = Array.isArray(cacheData) && Array.isArray(cacheData[0])
        
        if (isInfiniteScroll) {
          // 무한스크롤 구조: Item[][]
          const pages = cacheData as Item[][]
          return pages.map(page => {
            if (!Array.isArray(page)) return page
            return page.map(item => {
              if (item.id === itemId || item.item_id === itemId) {
                const calculateUpdates = this.calculateUpdates(type, delta, operation.data)
                const updates = calculateUpdates(item)
                return { ...item, ...updates }
              }
              return item
            })
          })
        } else {
          // 단일 배열 구조: Item[]
          const items = cacheData as Item[]
          return items.map(item => {
            if (item.id === itemId || item.item_id === itemId) {
              const calculateUpdates = this.calculateUpdates(type, delta, operation.data)
              const updates = calculateUpdates(item)
              return { ...item, ...updates }
            }
            return item
          })
        }
      },
      { revalidate: false, populateCache: true }
    )
    
    // 사용자 검색 결과는 개별 처리 (다른 구조)
    await mutateMatching(
      (key) => typeof key === 'string' && key.startsWith('search_users|'),
      undefined,  // 사용자 검색은 무효화만 (구조가 다름)
      { revalidate: false }
    )
  }

  /**
   * 북마크 캐시 업데이트 (모든 사용자별 북마크 뷰 포함)
   */
  private async updateBookmarkCache(operation: CacheOperation): Promise<void> {
    const { itemId } = operation
    
    // 모든 북마크 관련 캐시 업데이트
    await mutateMatching(
      (key) => typeof key === 'string' && (
        key.startsWith('bookmarks_') ||              // 사용자별 북마크 목록
        key.includes('bookmark_list') ||             // 북마크 리스트 뷰
        key.includes('user_bookmarks')               // 사용자 북마크 컬렉션
      ),
      (cacheData: Item[] | undefined) => {
        if (!cacheData || !Array.isArray(cacheData)) return cacheData
        
        // 기존 아이템 업데이트
        return cacheData.map(item => {
          if (item.id === itemId || item.item_id === itemId) {
            const calculateUpdates = this.calculateUpdates(operation.type, operation.delta, operation.data)
            const updates = calculateUpdates(item)
            const updatedItem = { ...item, ...updates }
            return updatedItem
          }
          return item
        })
      },
      { revalidate: false, populateCache: true }
    )
  }

  /**
   * 레시피북 캐시 업데이트 (모든 탭과 뷰 모드 포함)
   */
  private async updateRecipeBookCache(operation: CacheOperation): Promise<void> {
    const { type, itemId, delta, data } = operation
    

    
    // "모두의 레시피"는 팔로우한 사람의 레시피라 팔로우가 바뀌면 내용이 바뀐다. 비우지 않고 다시 받기만 한다
    if (type === 'follow') {
      await revalidateStartingWith(['recipes||all_recipes'])
      return
    }
    

    
    // 다른 액션들 (like, comment 등)에 대한 기존 캐시 업데이트 로직
    await mutateMatching(
      (key) => typeof key === 'string' && (
        key.startsWith('recipes|') ||                     // 기존 패턴
        key.startsWith('recipes||') ||                    // 새로운 패턴 (나의/모두의 레시피)
        key.includes('my_recipes') ||                     // 나의 레시피 탭
        key.includes('all_recipes') ||                    // 모두의 레시피 탭  
        key.includes('recipe_grid') ||                    // 그리드 뷰
        key.includes('recipe_list')                       // 목록 뷰
      ),
      (cacheData: Item[][] | undefined) => {
        if (!cacheData || !Array.isArray(cacheData)) return cacheData
        
        // 새로운 레시피 추가
        if (type === 'add_new' && data) {
          // Removed excessive log
          const newCacheData = [...cacheData]
          
          if (newCacheData.length > 0) {
            const firstPageData = newCacheData[0]
            const firstPage = Array.isArray(firstPageData) ? [...firstPageData] : []
            
            firstPage.unshift(data as Item)
            newCacheData[0] = firstPage
          } else {
            newCacheData.push([data as Item])
          }
          
          return newCacheData
        }
        
        // 기존 아이템 업데이트
        return cacheData.map(page => {
          if (!Array.isArray(page)) return page
          
          return page.map(item => {
            if (item.id === itemId || item.item_id === itemId) {

              const calculateUpdates = this.calculateUpdates(type, delta, operation.data)
              const updates = calculateUpdates(item)
              const updatedItem = { ...item, ...updates }

              return updatedItem
            }
            return item
          })
        })
      },
      { revalidate: false, populateCache: true }
    )
  }

  /**
   * 업데이트 값 계산 (현재 아이템 기준)
   */
  private calculateUpdates(type: string, delta?: number, data?: Partial<Item>): (item: Item) => Partial<Item> {
    return (currentItem: Item) => {
      const updates: Partial<Item> = {}
      
      // Debug: calculateUpdates processing
      
      switch (type) {
        case 'like':
          if (delta !== undefined) {
            // 업계 표준: 절대 상태 기반 (한 유저당 1개 좋아요 원칙)
            const newIsLiked = delta > 0
            const currentIsLiked = currentItem.is_liked || false
            
            // 상태 변화가 있을 때만 likes_count 조정
            if (newIsLiked !== currentIsLiked) {
              const oldCount = currentItem.likes_count || 0
              const newCount = Math.max(0, oldCount + (newIsLiked ? 1 : -1))
              updates.likes_count = newCount
              updates.is_liked = newIsLiked
            }
            // 상태 변화가 없으면 업데이트 안함 (중복 방지)
          }
          break
          
        case 'bookmark':
          if (delta !== undefined) {
            // 북마크: 절대 상태 기반 (한 유저당 1개 북마크 원칙)
            const newIsBookmarked = delta > 0
            const currentIsBookmarked = currentItem.is_bookmarked || false
            
            // 상태 변화가 있을 때만 bookmarks_count 조정
            if (newIsBookmarked !== currentIsBookmarked) {
              updates.bookmarks_count = Math.max(0, (currentItem.bookmarks_count || 0) + (newIsBookmarked ? 1 : -1));
              updates.is_bookmarked = newIsBookmarked
            }
            // 상태 변화가 없으면 업데이트 안함 (중복 방지)
          }
          break
          
        case 'comment':
          if (delta !== undefined) {
            updates.comments_count = Math.max(0, (currentItem.comments_count || 0) + delta)
          }
          break
          
        case 'follow':
          updates.is_following = delta ? delta > 0 : true
          break
          
        case 'thumbnail_update':
          if (data) {
            // Debug: Thumbnail update processing
            updates.thumbnail_index = data.thumbnail_index
            updates.image_urls = data.image_urls
          }
          break
          
        case 'update':
          if (data) {
            // Debug: Applying SSA update
            // 이미지 보존: 기존 이미지가 있고 새 데이터에 이미지가 없으면 기존 이미지 유지
            if (currentItem.image_urls && currentItem.image_urls.length > 0 && 
                (!data.image_urls || data.image_urls.length === 0)) {
              Object.assign(updates, { ...data, image_urls: currentItem.image_urls })
            } else {
              Object.assign(updates, data)
            }
          }
          break
      }
      

      
      return updates
    }
  }

  /**
   * 현재 상태 백업 (롤백용)
   */
  private async captureCurrentState(operation: CacheOperation): Promise<RollbackData> {
    // 실제 구현에서는 현재 캐시 상태를 캡처
    return {
      operation,
      previousState: {}, // 현재 상태 스냅샷
      timestamp: Date.now()
    }
  }

  /**
   * ↩️ 에러 시 자동 롤백
   */
  async rollback(operationId: string): Promise<void> {
    const rollbackData = this.rollbackStack.get(operationId)
    if (!rollbackData) return
    
    
    
    // 모든 캐시를 이전 상태로 복원
    await this.restorePreviousState(rollbackData)
    
    // 롤백 데이터 정리
    this.rollbackStack.delete(operationId)
  }

  /**
   * 이전 상태 복원
   */
  private async restorePreviousState(rollbackData: RollbackData): Promise<void> {
    const { operation } = rollbackData
    
    // 역방향 연산으로 롤백
    const reverseOperation: CacheOperation = {
      ...operation,
      delta: operation.delta ? -operation.delta : undefined
    }
    
    await this.updateAllCaches(reverseOperation)
  }

}

// 글 목록을 담는 캐시 키 (docs/architecture.md 화면 상태)
const LIST_KEY_PREFIXES = ['items|', 'recipes||', 'search_page|', 'bookmarks_', 'user_items_', 'explore|']

/**
 * 싱글톤 인스턴스
 */
let globalCacheManager: UnifiedCacheManager | null = null

export const getCacheManager = (): UnifiedCacheManager => {
  if (!globalCacheManager) {
    globalCacheManager = new UnifiedCacheManager()
  }
  return globalCacheManager
}

/**
 * 편의 함수들 - 컴포넌트에서 쉽게 사용
 */
export const cacheManager = {
  // SSA 기반 스마트 좋아요 토글 (Request Deduplication + Batch Processing)
  like: async (itemId: string, userId: string, liked: boolean, data?: Partial<Item>) => {
    const manager = getCacheManager()
    const rollback = await manager.smartUpdate({
      type: 'like',
      itemId,
      userId,
      delta: liked ? 1 : -1,
      data // 이미지 데이터 보존하면서 SSA 패턴 유지
    })
    return rollback
  },
  
  // SSA 기반 스마트 북마크 토글 (Request Deduplication + Batch Processing)
  bookmark: async (itemId: string, userId: string, bookmarked: boolean, data?: Partial<Item>) => {
    const manager = getCacheManager()
    const rollback = await manager.smartUpdate({
      type: 'bookmark',
      itemId,
      userId,
      delta: bookmarked ? 1 : -1,
      data // 이미지 데이터 보존하면서 SSA 패턴 유지
    })
    return rollback
  },
  
  // SSA 기반 스마트 댓글 토글 (Request Deduplication + Batch Processing)
  comment: async (itemId: string, userId: string, delta: number, data?: Partial<Item>) => {
    const manager = getCacheManager()
    const rollback = await manager.smartUpdate({
      type: 'comment',
      itemId,
      userId,
      delta,
      data // 전체 아이템 데이터 보존하면서 SSA 패턴 유지
    })
    return rollback
  },
  
  // 팔로우 토글 (removed - duplicate)
  
  // 아이템 업데이트
  updateItem: async (itemId: string, data: Partial<Item>) => {
    const manager = getCacheManager()
    const rollback = await manager.optimisticUpdate({
      type: 'update',
      itemId,
      data
    })
    return rollback
  },

  // 새로운 아이템 추가 (홈 피드 맨 위에 즉시 표시)
  addNewItem: async (newItem: Item) => {
    const manager = getCacheManager()
    const itemId = newItem.id || newItem.item_id
    
    // 홈피드 캐시 업데이트
    const rollback = await manager.optimisticUpdate({
      type: 'add_new',
      itemId,
      data: newItem
    })
    
          // 개별 아이템 캐시도 함께 업데이트 (useItemCache가 찾을 수 있도록)
      await mutate(`itemDetail|${itemId}`, newItem, { revalidate: false })
    
    return rollback
  },
  
  // 아이템 삭제
  /**
   * 글 지우기: 화면의 모든 목록·상세 캐시에서 바로 뺀다 (DB 삭제 전에 부른다).
   * 실패하면 돌려받은 함수를 불러 목록을 서버에서 다시 받는다 (지운 줄 알았던 글이 돌아온다).
   * 캐시 모양: 무한 스크롤(Item[][]), 목록(Item[]), 탐색({ recipes, made }), 글 하나(itemDetail|id)
   */
  deleteItems: async (itemIds: string[]) => {
    const gone = new Set(itemIds)
    const keep = (row: unknown) => {
      const r = row as { id?: string; item_id?: string; item?: { id?: string } } | null
      return !r || !(gone.has(r.item_id ?? '') || gone.has(r.id ?? '') || gone.has(r.item?.id ?? ''))
    }
    const prune = (data: unknown): unknown => {
      if (Array.isArray(data)) return data.map((page) => (Array.isArray(page) ? page.filter(keep) : page)).filter((row) => Array.isArray(row) || keep(row))
      if (data && typeof data === 'object' && 'recipes' in data && 'made' in data) {
        const explore = data as { recipes: unknown[]; made: unknown[] }
        return { ...explore, recipes: explore.recipes.filter(keep), made: explore.made.filter(keep) }
      }
      return data
    }
    // 무한 스크롤 목록(피드·레시피북)은 SWR이 '$inf$' 접두어를 붙인 키에 담는다. 떼고 비교해야 실제 목록에 닿는다
    await updateStartingWith(LIST_KEY_PREFIXES, prune)
    await Promise.all(itemIds.map((id) => mutate(`itemDetail|${id}`, undefined, { revalidate: false })))
    return () => {
      void revalidateStartingWith(LIST_KEY_PREFIXES)
    }
  },

  
  // 홈피드만 무효화 (성능 최적화)
  revalidateHomeFeed: async () => {
    await revalidateStartingWith(['items|'])
  },
  


  // 팔로우/언팔로우 처리 (SSA 기반) - DB 저장 포함
  follow: async (currentUserId: string, targetUserId: string, isFollow: boolean) => {
    const manager = getCacheManager()
    const rollback = await manager.smartUpdate({
      type: 'follow',
      itemId: targetUserId, // itemId를 targetUserId로 사용
      userId: currentUserId,
      delta: isFollow ? 1 : -1, // 팔로우는 +1, 언팔로우는 -1
    })
    
    return rollback
  }
} 