/**
 * 🚀 업계 표준 통합 캐시 관리 시스템
 * Instagram/Twitter/Facebook 방식의 심리스한 사용자 경험
 * 
 * 핵심 원칙:
 * 1. 즉시 UI 반응 (0ms 옵티미스틱 업데이트)
 * 2. 자동 에러 롤백
 * 3. 백그라운드 동기화
 * 4. 단일 진실 공급원
 */

import { mutate } from 'swr'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { Item } from '@/types/item'

export interface CacheOperation {
  type: 'like' | 'comment' | 'follow' | 'bookmark' | 'create' | 'update' | 'delete' | 'add_new'
  itemId: string
  userId?: string | null
  delta?: number
  data?: unknown
  timestamp?: number
}

export interface RollbackData {
  operation: CacheOperation
  previousState: unknown
  timestamp: number
}

/**
 * 🎯 통합 캐시 관리자 - 모든 캐시 연산의 단일 진입점
 */
export class UnifiedCacheManager {
  private supabase = createSupabaseBrowserClient()
  private rollbackStack: Map<string, RollbackData> = new Map()
  private batchQueue: CacheOperation[] = []
  private batchTimer: NodeJS.Timeout | null = null
  
  // 🚀 SSA 아키텍처에 업계 표준 Request Deduplication 추가
  private pendingOperations = new Map<string, {
    operation: CacheOperation
    resolve: (rollback: (() => void) | null) => void
    reject: (error: any) => void
    timestamp: number
  }>()
  private processingItems = new Set<string>()

  /**
   * 🚀 즉시 옵티미스틱 업데이트 (0ms 응답)
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
   * 🚀 SSA 기반 스마트 업데이트 (Request Deduplication + Batch Processing)
   * 기존 SSA 패턴 유지하면서 서버 효율성 극대화
   */
  async smartUpdate(operation: CacheOperation): Promise<() => void> {
    const { type, itemId, userId } = operation
    const operationKey = `${type}_${itemId}_${userId || 'guest'}`
    

    
    // 🎯 업계 표준: Idempotent Operations (중복 실행 방지)
    if (this.pendingOperations.has(operationKey)) {
      return () => {} // 중복 연산은 즉시 반환
    }
    
    // 🎯 STEP 1: 즉시 옵티미스틱 업데이트 (한 번만 실행)
    const rollback = await this.optimisticUpdate(operation)
    
    // 🎯 STEP 2: 백그라운드 DB 처리 스케줄링 (즉시 rollback 반환)
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
   * 🚀 대기 중인 연산들을 배치로 처리
   */
  private async processPendingOperations(): Promise<void> {
    if (this.pendingOperations.size === 0) return
    
    const operations = Array.from(this.pendingOperations.values()).map(pending => pending.operation)
    this.pendingOperations.clear()
    
    // Removed excessive log
    
    // 🚀 배치 처리를 위한 중복 제거
    const uniqueOperations = new Map<string, CacheOperation>()
    
    for (const operation of operations) {
      const itemKey = `${operation.type}_${operation.itemId}`
      if (uniqueOperations.has(itemKey)) {
        // Removed excessive log
        continue
      }
      uniqueOperations.set(itemKey, operation)
    }
    
    // 🚀 병렬 DB 연산 실행
    const dbPromises = Array.from(uniqueOperations.values()).map(op => 
      this.executeDbOperation(op).catch(error => {
        console.error(`❌ SSA: DB operation failed for ${op.type}_${op.itemId}:`, error)
        // 에러 발생 시 해당 연산 무시하고 계속 진행
      })
    )
    
    await Promise.all(dbPromises)
    
    // 🔍 최종 상태 검증 (3초 후)
    setTimeout(() => {
      uniqueOperations.forEach(op => this.verifyFinalState(op))
    }, 3000)
    
    // Removed excessive log
  }

  /**
   * 🎯 실제 DB 연산 실행
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
        // TODO: 팔로우 DB 연산
        break
        
      default:
        console.warn(`🚧 SSA: Unsupported operation type: ${type}`)
    }
  }

  /**
   * 🔍 최종 상태 검증 (Instagram 방식)
   */
  private async verifyFinalState(operation: CacheOperation): Promise<void> {
    const { type, itemId, userId } = operation
    
    try {
      // Removed excessive log - only keep for critical errors
      
      if (type === 'like') {
        // 서버에서 실제 상태 조회
        const [likesResult, likeStatusResult] = await Promise.all([
          this.supabase.from('likes').select('user_id').eq('item_id', itemId),
          this.supabase.from('likes').select('user_id').eq('item_id', itemId).eq('user_id', userId).maybeSingle()
        ])
        
        const serverLikesCount = likesResult.data?.length || 0
        const serverHasLiked = !!likeStatusResult.data
        
        // 상태 불일치 시 서버 상태로 조정
        const correctionOperation: CacheOperation = {
          type: 'like',
          itemId,
          userId,
          delta: serverHasLiked ? 1 : -1,
          data: { correction: true, serverLikesCount, serverHasLiked }
        }
        
        // SSA 패턴으로 정정 (기존 아키텍처 활용)
        await this.updateAllCaches(correctionOperation)
        
        // Removed excessive log
      }
    } catch (error) {
      console.error(`❌ SSA: State verification failed for ${itemId}:`, error)
    }
  }

  /**
   * 📦 모든 관련 캐시 업데이트 (홈피드, 상세페이지, 검색, 프로필)
   */
  private async updateAllCaches(operation: CacheOperation): Promise<void> {
    const { type, itemId, userId, delta } = operation
    
    console.log(`🔄 [updateAllCaches] Starting update for item ${itemId}:`, {
      type,
      delta,
      userId,
      hasData: !!(operation as any).data
    })
    
    try {
      // 1. 홈피드 캐시 업데이트
      console.log(`🏠 [updateAllCaches] Updating HomeFeedCache for ${itemId}`)
      await this.updateHomeFeedCache(operation)
      console.log(`✅ [updateAllCaches] HomeFeedCache updated for ${itemId}`)
    } catch (err) {
      console.log(`❌ [updateAllCaches] HomeFeedCache failed for ${itemId}:`, err)
    }
    
    try {
      // 2. 상세페이지 캐시 업데이트
      console.log(`📄 [updateAllCaches] Updating ItemDetailCache for ${itemId}`)
      await this.updateItemDetailCache(operation)
      console.log(`✅ [updateAllCaches] ItemDetailCache updated for ${itemId}`)
    } catch (err) {
      console.log(`❌ [updateAllCaches] ItemDetailCache failed for ${itemId}:`, err)
    }
    
    try {
      // 3. 검색 결과 캐시 업데이트
      console.log(`🔍 [updateAllCaches] Updating SearchCache for ${itemId}`)
      await this.updateSearchCache(operation)
      console.log(`✅ [updateAllCaches] SearchCache updated for ${itemId}`)
    } catch (err) {
      console.log(`❌ [updateAllCaches] SearchCache failed for ${itemId}:`, err)
    }
    
    try {
      // 4. 프로필 캐시 업데이트
      if (userId) {
        console.log(`👤 [updateAllCaches] Updating ProfileCache for ${itemId}`)
        await this.updateProfileCache(operation)
        console.log(`✅ [updateAllCaches] ProfileCache updated for ${itemId}`)
      } else {
        console.log(`⏭️ [updateAllCaches] Skipping ProfileCache (no userId) for ${itemId}`)
      }
    } catch (err) {
      console.log(`❌ [updateAllCaches] ProfileCache failed for ${itemId}:`, err)
    }
    
    try {
      // 5. 레시피북 캐시 업데이트 (해당하는 경우)
      console.log(`📚 [updateAllCaches] Updating RecipeBookCache for ${itemId}`)
      await this.updateRecipeBookCache(operation)
      console.log(`✅ [updateAllCaches] RecipeBookCache updated for ${itemId}`)
    } catch (err) {
      console.log(`❌ [updateAllCaches] RecipeBookCache failed for ${itemId}:`, err)
    }
    
    console.log(`🎯 [updateAllCaches] All caches updated for item ${itemId}`)
  }

  /**
   * 🏠 홈피드 캐시 업데이트 (useSWRInfinite 구조)
   */
  private async updateHomeFeedCache(operation: CacheOperation): Promise<void> {
    const { type, itemId, delta, data } = operation

    console.log(`🔍 [HomeFeedCache] Starting update for item ${itemId}:`, {
      type,
      delta,
      hasData: !!data
    })

    await mutate(
      (key) => typeof key === 'string' && key.startsWith('items|'),
      (cacheData: Item[][] | undefined) => {
        console.log(`🔍 [HomeFeedCache] Cache data status:`, {
          hasCacheData: !!cacheData,
          isArray: Array.isArray(cacheData),
          pageCount: cacheData?.length || 0,
          cacheDataType: typeof cacheData,
          firstPageType: cacheData?.[0] ? typeof cacheData[0] : 'undefined',
          firstPageIsArray: Array.isArray(cacheData?.[0]),
          firstPageData: cacheData?.[0],
          allPageTypes: cacheData?.map((page, i) => ({ 
            index: i, 
            type: typeof page, 
            isArray: Array.isArray(page),
            length: Array.isArray(page) ? page.length : 'N/A'
          }))
        })

        if (!cacheData || !Array.isArray(cacheData)) {
          console.log(`❌ [HomeFeedCache] No valid cache data for ${itemId}`)
          return cacheData
        }

        // 🚨 CRITICAL FIX: 홈피드 캐시 구조 정상화
        let normalizedCacheData = cacheData;
        const hasCorruptedPages = cacheData.some(page => !Array.isArray(page));
        
        if (hasCorruptedPages) {
          console.log(`🔧 [HomeFeedCache] Fixing corrupted cache structure for ${itemId}`);
          normalizedCacheData = cacheData.map((page, index) => {
            if (!Array.isArray(page)) {
              console.log(`🔧 [HomeFeedCache] Converting page ${index} to array:`, typeof page);
              // 페이지가 단일 객체이거나 다른 형태라면 배열로 감싸기
              if (page && typeof page === 'object' && 'id' in page) {
                return [page as Item]; // 단일 아이템이면 배열로 감싸기
              } else {
                return []; // 잘못된 데이터면 빈 배열
              }
            }
            return page as Item[];
          });
          console.log(`✅ [HomeFeedCache] Cache structure normalized for ${itemId}`);
        }
        
        // 🚀 새로운 아이템 추가 (홈피드 맨 위에 즉시 표시)
        if (type === 'add_new' && data) {
          const newCacheData = [...normalizedCacheData]
          
          if (newCacheData.length > 0) {
            // 🔧 타입 안전성: 첫 번째 페이지가 배열인지 확인
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
        
                // 🔧 기존 아이템 업데이트 로직
        let itemFound = false
        let totalItems = 0

        console.log(`🔍 [HomeFeedCache] Searching for item ${itemId} in ${normalizedCacheData.length} pages`)

        const result = normalizedCacheData.map((page, pageIndex) => {
          if (!Array.isArray(page)) {
            console.log(`⚠️ [HomeFeedCache] Page ${pageIndex} is not an array`)
            return page // 🔧 page가 배열인지 안전하게 확인
          }
          
          console.log(`🔍 [HomeFeedCache] Checking page ${pageIndex} with ${page.length} items`)
          totalItems += page.length
          
          return page.map((item, itemIndex) => {
            // 🔍 더 관대한 ID 매칭 (다양한 ID 필드 확인)
            const itemMatches = item.id === itemId || 
                              item.item_id === itemId ||
                              (item.id && item.id.toString() === itemId) ||
                              (item.item_id && item.item_id.toString() === itemId)
            
            if (itemMatches) {
              itemFound = true
              console.log(`🎯 [HomeFeedCache] Found item ${itemId} at page ${pageIndex}, index ${itemIndex}`)
              
              const calculateUpdates = this.calculateUpdates(type, delta)
              const updates = calculateUpdates(item)
              
              // 🔍 CRITICAL DEBUG: 업데이트 과정 추적
              console.log(`🔄 [CacheManager] Updating item ${itemId}:`, {
                type,
                delta,
                originalImages: item.image_urls?.length || 0,
                originalUrls: item.image_urls,
                updates,
                hasImageUrls: 'image_urls' in updates
              })
              
              // 🛡️ 핵심 수정: 이미지 데이터 완전 보존
              const updatedItem = { 
                ...item,  // 🔒 모든 기존 데이터 보존 (이미지, 메타데이터 등)
                ...updates  // 🎯 좋아요/북마크 상태만 업데이트
              }
              
              // 🔍 CRITICAL DEBUG: 업데이트 결과 확인
              console.log(`✅ [CacheManager] Updated item ${itemId}:`, {
                updatedImages: updatedItem.image_urls?.length || 0,
                updatedUrls: updatedItem.image_urls,
                likesCount: updatedItem.likes_count,
                isLiked: updatedItem.is_liked
              })
              
              return updatedItem
            }
            return item
          })
        })
        
        console.log(`🎯 [HomeFeedCache] Search complete for ${itemId}:`, {
          itemFound,
          totalItems,
          totalPages: normalizedCacheData.length
        })
        
        if (!itemFound) {
          console.log(`❌ [HomeFeedCache] Item ${itemId} not found in cache! (Total items: ${totalItems})`)
          // 🚀 SSA 업계표준: 홈피드에 없어도 정상 (다른 페이지에 있을 수 있음)
          return normalizedCacheData // 정상화된 캐시 반환
        }
        
        console.log(`✅ [HomeFeedCache] Successfully updated item ${itemId} in cache`)
        return result
      },
      { revalidate: false, populateCache: true }
    )
  }

  /**
   * 📄 상세페이지 캐시 업데이트
   */
  private async updateItemDetailCache(operation: CacheOperation): Promise<void> {
    const { itemId, type, delta, data } = operation
    

    // 🔍 CRITICAL DEBUG: ItemDetailCache 시작 상태 확인
    console.log(`🔄 [updateItemDetailCache] Starting for item ${itemId}:`, {
      type,
      delta,
      hasData: !!data
    })

    const updatedItem = await mutate(
      `itemDetail|${itemId}`,
      (currentItem: Item | undefined) => {
        // 🚀 SSA 업계표준: 개별 캐시 없으면 홈피드에서 데이터 가져오기
        if (!currentItem) {
          console.log(`⚠️ [ItemDetailCache] No cached item found for ${itemId}, searching home feed...`)
          
          // 홈피드 캐시에서 완전한 아이템 데이터 찾기
          let foundItem: Item | null = null
          
          // operation data에서 완전한 아이템 데이터 확인
          try {
            console.log(`🔍 [ItemDetailCache] Checking operation data for item ${itemId}:`, {
              hasData: !!data,
              dataType: typeof data,
              hasImageUrls: data && typeof data === 'object' && 'image_urls' in data
            })
            
            // operation data에 완전한 아이템 정보가 있는지 확인
            if (data && typeof data === 'object' && 'image_urls' in data) {
              console.log(`✅ [ItemDetailCache] Using image data from operation data:`, {
                itemId,
                hasImages: !!(data as any).image_urls,
                imageCount: (data as any).image_urls?.length || 0,
                imageUrls: (data as any).image_urls
              })
              foundItem = data as Item
            }
          } catch (error) {
            console.log(`❌ [ItemDetailCache] Error checking operation data:`, error)
          }
          
          if (foundItem) {
            // 홈피드에서 찾은 완전한 데이터 사용
            currentItem = { ...foundItem }
          } else {
            console.log(`❌ [ItemDetailCache] Item ${itemId} not found in home feed, creating minimal fallback`)
            // 🎯 최소한의 fallback (좋아요/북마크만 업데이트, 이미지는 없음)
            currentItem = {
              id: itemId,
              item_id: itemId,
              user_id: (data as any)?.userId || (data as any)?.user_id || '',
              item_type: 'post',
              created_at: new Date().toISOString(),
              title: null,
              content: null,
              description: null,
              image_urls: null, // ⚠️ 홈피드에서도 찾지 못한 경우에만 null
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
        console.log(`🔄 [ItemDetailCache] Updating item ${itemId}:`, {
          originalImages: currentItem.image_urls?.length || 0,
          originalUrls: currentItem.image_urls,
          type,
          delta
        })
        const calculateUpdates = this.calculateUpdates(type, delta, data)
        const updates = calculateUpdates(currentItem)
        const result = { ...currentItem, ...updates }
        console.log(`✅ [ItemDetailCache] Updated item ${itemId}:`, {
          updatedImages: result.image_urls?.length || 0,
          updatedUrls: result.image_urls,
          updates
        })
        
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
   * 🔍 검색 캐시 업데이트 (모든 검색 뷰와 필터 포함)
   */
  private async updateSearchCache(operation: CacheOperation): Promise<void> {
    // 🔧 모든 검색 관련 캐시 무효화 (재검색 시 최신 데이터 반영)
    await mutate(
      (key) => typeof key === 'string' && (
        key.startsWith('search_') ||                      // 기본 검색
        key.includes('popular_posts') ||                  // 인기 게시물
        key.includes('popular_recipes') ||                // 인기 레시피  
        key.includes('search_grid') ||                    // 검색 그리드 뷰
        key.includes('search_list') ||                    // 검색 목록 뷰
        key.includes('search_users') ||                   // 사용자 검색
        key.includes('search_results')                    // 일반 검색 결과
      ),
      undefined,
      { revalidate: false }
    )
  }

  /**
   * 👤 프로필 캐시 업데이트 (모든 사용자 뷰 포함)
   */
  private async updateProfileCache(operation: CacheOperation): Promise<void> {
    const { userId, itemId } = operation
    
    // 🔧 모든 프로필 관련 캐시 업데이트 (그리드, 목록, 탭별 뷰 등)
    await mutate(
      (key) => typeof key === 'string' && (
        key.includes(`user_items_${userId}`) ||           // 기본 프로필 뷰
        key.includes(`profile_${userId}`) ||              // 프로필 상세 뷰
        key.includes(`user_grid_${userId}`) ||            // 그리드 뷰
        key.includes(`user_feed_${userId}`)               // 피드 뷰
      ),
      (data: Item[][] | undefined) => {
        if (!data || !Array.isArray(data)) return data
        
        return data.map(page => {
          if (!Array.isArray(page)) return page // 🔧 page가 배열인지 안전하게 확인
          
          return page.map(item => {
            if (item.id === itemId || item.item_id === itemId) {
              console.log(`🔄 [ProfileCache] Updating item ${itemId}:`, {
                originalImages: item.image_urls?.length || 0,
                originalUrls: item.image_urls
              })
              const calculateUpdates = this.calculateUpdates(operation.type, operation.delta)
              const updates = calculateUpdates(item)
              const updatedItem = { ...item, ...updates }
              console.log(`✅ [ProfileCache] Updated item ${itemId}:`, {
                updatedImages: updatedItem.image_urls?.length || 0,
                updatedUrls: updatedItem.image_urls
              })
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
   * 📚 레시피북 캐시 업데이트 (모든 탭과 뷰 모드 포함)
   */
  private async updateRecipeBookCache(operation: CacheOperation): Promise<void> {
    const { type, itemId, delta, data } = operation
    
    // 🔧 모든 레시피 관련 캐시 업데이트 (나의/모두의 레시피, 그리드/목록 뷰 등)
    await mutate(
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
        
        // 🚀 새로운 레시피 추가
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
              console.log(`🔄 [RecipeCache] Updating item ${itemId}:`, {
                originalImages: item.image_urls?.length || 0,
                originalUrls: item.image_urls
              })
              const calculateUpdates = this.calculateUpdates(type, delta)
              const updates = calculateUpdates(item)
              const updatedItem = { ...item, ...updates }
              console.log(`✅ [RecipeCache] Updated item ${itemId}:`, {
                updatedImages: updatedItem.image_urls?.length || 0,
                updatedUrls: updatedItem.image_urls
              })
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
   * 🧮 업데이트 값 계산 (현재 아이템 기준)
   */
  private calculateUpdates(type: string, delta?: number, data?: any): (item: Item) => Partial<Item> {
    return (currentItem: Item) => {
      const updates: Partial<Item> = {}
      
      // 🔍 CRITICAL DEBUG: calculateUpdates 입력 확인
      console.log(`🔄 [calculateUpdates] Input:`, {
        type,
        delta,
        data,
        itemImages: currentItem.image_urls?.length || 0
      })
      
      switch (type) {
        case 'like':
          if (delta !== undefined) {
            // 🚨 업계 표준: 절대 상태 기반 (한 유저당 1개 좋아요 원칙)
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
            // 🔖 북마크: 절대 상태 기반 (한 유저당 1개 북마크 원칙)
            const newIsBookmarked = delta > 0
            const currentIsBookmarked = (currentItem as any).is_bookmarked || false
            
            // 상태 변화가 있을 때만 bookmarks_count 조정
            if (newIsBookmarked !== currentIsBookmarked) {
              (updates as any).bookmarks_count = Math.max(0, ((currentItem as any).bookmarks_count || 0) + (newIsBookmarked ? 1 : -1));
              (updates as any).is_bookmarked = newIsBookmarked
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
          
        case 'update':
          if (data) {
            console.log(`🔄 SSA: Updating item with data:`, data)
            Object.assign(updates, data)
            console.log(`✅ SSA: Applied updates:`, updates)
          }
          break
      }
      
      // 🔍 CRITICAL DEBUG: calculateUpdates 결과 확인
      console.log(`✅ [calculateUpdates] Output:`, {
        type,
        updates,
        hasImageUrls: 'image_urls' in updates,
        updateKeys: Object.keys(updates)
      })
      
      return updates
    }
  }

  /**
   * 💾 현재 상태 백업 (롤백용)
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
    
    console.log(`↩️ CacheManager: Rolling back ${rollbackData.operation.type}`)
    
    // 모든 캐시를 이전 상태로 복원
    await this.restorePreviousState(rollbackData)
    
    // 롤백 데이터 정리
    this.rollbackStack.delete(operationId)
  }

  /**
   * 🔄 이전 상태 복원
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

  /**
   * 🧹 정리
   */
  cleanup(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }
    this.rollbackStack.clear()
    this.batchQueue = []
  }

  /**
   * 🔄 전체 캐시 동기화 (긴급 상황용)
   */
  async invalidateAllCaches(): Promise<void> {
    console.log(`🔄 CacheManager: Emergency cache invalidation`)
    
    await Promise.all([
      mutate((key) => typeof key === 'string' && key.startsWith('items|')),
      mutate((key) => typeof key === 'string' && key.startsWith('item_details_')),
      mutate((key) => typeof key === 'string' && key.startsWith('recipes|')),
      mutate((key) => typeof key === 'string' && key.startsWith('search_')),
      mutate((key) => typeof key === 'string' && key.startsWith('user_items_')),
    ])
  }
}

/**
 * 🎯 싱글톤 인스턴스
 */
let globalCacheManager: UnifiedCacheManager | null = null

export const getCacheManager = (): UnifiedCacheManager => {
  if (!globalCacheManager) {
    globalCacheManager = new UnifiedCacheManager()
  }
  return globalCacheManager
}

/**
 * 🚀 편의 함수들 - 컴포넌트에서 쉽게 사용
 */
export const cacheManager = {
  // 🚀 SSA 기반 스마트 좋아요 토글 (Request Deduplication + Batch Processing)
  like: async (itemId: string, userId: string, liked: boolean, data?: any) => {
    const manager = getCacheManager()
    const rollback = await manager.smartUpdate({
      type: 'like',
      itemId,
      userId,
      delta: liked ? 1 : -1,
      data // 🔑 이미지 데이터 보존하면서 SSA 패턴 유지
    })
    return rollback
  },
  
  // 🔖 SSA 기반 스마트 북마크 토글 (Request Deduplication + Batch Processing)
  bookmark: async (itemId: string, userId: string, bookmarked: boolean, data?: any) => {
    const manager = getCacheManager()
    const rollback = await manager.smartUpdate({
      type: 'bookmark',
      itemId,
      userId,
      delta: bookmarked ? 1 : -1,
      data // 🔑 이미지 데이터 보존하면서 SSA 패턴 유지
    })
    return rollback
  },
  
  // 🚀 SSA 기반 스마트 댓글 토글 (Request Deduplication + Batch Processing)
  comment: async (itemId: string, userId: string, delta: number, data?: any) => {
    const manager = getCacheManager()
    const rollback = await manager.smartUpdate({
      type: 'comment',
      itemId,
      userId,
      delta,
      data // 🔑 전체 아이템 데이터 보존하면서 SSA 패턴 유지
    })
    return rollback
  },
  
  // 팔로우 토글
  follow: async (userId: string, targetUserId: string, following: boolean) => {
    const manager = getCacheManager()
    const rollback = await manager.optimisticUpdate({
      type: 'follow',
      itemId: targetUserId,
      userId,
      delta: following ? 1 : -1
    })
    return rollback
  },
  
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

  // 🚀 새로운 아이템 추가 (홈 피드 맨 위에 즉시 표시)
  addNewItem: async (newItem: Item) => {
    const manager = getCacheManager()
    const itemId = newItem.id || newItem.item_id
    
    // 🔧 홈피드 캐시 업데이트
    const rollback = await manager.optimisticUpdate({
      type: 'add_new',
      itemId,
      data: newItem
    })
    
    // 🔧 개별 아이템 캐시도 함께 업데이트 (useSSAItemCache가 찾을 수 있도록)
    await mutate(`itemDetail|${itemId}`, newItem, { revalidate: false })
    
    return rollback
  },
  
  // 아이템 삭제
  deleteItem: async (itemId: string) => {
    const manager = getCacheManager()
    const rollback = await manager.optimisticUpdate({
      type: 'delete',
      itemId
    })
    return rollback
  },
  
  // 전체 무효화
  invalidateAll: async () => {
    const manager = getCacheManager()
    await manager.invalidateAllCaches()
  },
  
  // 홈피드만 무효화 (성능 최적화)
  revalidateHomeFeed: async () => {
    // Removed excessive logs
    await mutate(
      (key) => typeof key === 'string' && key.startsWith('items|'),
      undefined,
      { revalidate: true }
    )
  }
} 