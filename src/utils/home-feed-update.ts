import { mutate } from "swr"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"

/**
 * 🚀 홈피드 즉시 반영 유틸리티
 * 새로 작성한 레시피/레시피드를 홈화면에 즉시 표시하여 심리스한 경험 제공
 */

interface NewItemResult {
  success: boolean
  message: string
  itemId?: string
}

/**
 * 새로 생성된 아이템을 홈피드 캐시에 즉시 추가
 * @param itemId - 새로 생성된 아이템 ID
 * @param itemType - 아이템 타입 ('recipe' | 'post')
 * @param maxRetries - 최대 재시도 횟수 (기본값: 3)
 */
export async function addNewItemToHomeFeed(
  itemId: string, 
  itemType: 'recipe' | 'post',
  maxRetries: number = 3
): Promise<NewItemResult> {
  const supabase = createSupabaseBrowserClient()
  
  // Adding new item to home feed
  
  try {
    // 1단계: 새로 생성된 아이템의 완전한 정보 조회 (재시도 로직 포함)
    let newItemDetail = null
    let attempts = 0
    
    while (!newItemDetail && attempts < maxRetries) {
      attempts++
      // Fetching item detail
      
      const { data, error } = await supabase
        .from("optimized_feed_view")
        .select("*")
        .eq("id", itemId)
        .single()
      
      if (!error && data) {
        newItemDetail = data
        // Successfully fetched item detail
        break
      } else if (attempts < maxRetries) {
        // 짧은 대기 후 재시도 (DB 동기화 대기)
        // Waiting for DB sync
        await new Promise(resolve => setTimeout(resolve, 200 * attempts))
      } else {
        console.warn(`⚠️ HomeFeedUpdate: Failed to fetch ${itemType} detail after ${maxRetries} attempts:`, error)
        return {
          success: false,
          message: `${itemType} 정보를 가져오는데 실패했습니다. 새로고침하면 표시됩니다.`,
          itemId
        }
      }
    }

    if (!newItemDetail) {
      return {
        success: false,
        message: `${itemType} 정보를 가져올 수 없습니다.`,
        itemId
      }
    }

    // 2단계: 홈피드 캐시에 새 아이템을 최상단에 추가
          // Adding item to cache
    
    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      async (cachedData: any) => {
        if (!cachedData || cachedData.length === 0) {
          // 첫 번째 페이지가 없으면 새로 생성
          // Creating new page with first item
          return [[newItemDetail]]
        }
        
        // 첫 번째 페이지에 새 아이템을 맨 앞에 추가
        const updatedData = [...cachedData]
        
        // 안전한 배열 처리: 첫 번째 페이지가 배열인지 확인
        if (!Array.isArray(updatedData[0])) {
          // First page is not array, creating new array
          updatedData[0] = [newItemDetail]
        } else {
          // 중복 확인 후 추가
          const exists = updatedData[0].find(item => 
            (item.id && item.id === itemId) || 
            (item.item_id && item.item_id === itemId)
          )
          
          if (!exists) {
            updatedData[0] = [newItemDetail, ...updatedData[0]]
            // Added new item to cache
          } else {
            // Item already exists in cache, skipping duplicate
          }
        }
        
        return updatedData
      },
      { revalidate: false } // 서버 재검증 없이 즉시 업데이트
    )

    // Successfully added item to home feed cache
    
    return {
      success: true,
      message: `${itemType === 'recipe' ? '레시피' : '레시피드'}가 홈화면에 추가되었습니다!`,
      itemId
    }

  } catch (error) {
    console.error(`❌ HomeFeedUpdate: Error adding ${itemType} to home feed:`, error)
    
    return {
      success: false,
      message: `홈화면 업데이트 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      itemId
    }
  }
}

/**
 * 새로 생성된 레시피를 홈피드에 즉시 추가
 */
export const addNewRecipeToHomeFeed = (itemId: string) => 
  addNewItemToHomeFeed(itemId, 'recipe')

/**
 * 새로 생성된 레시피드를 홈피드에 즉시 추가
 */
export const addNewPostToHomeFeed = (itemId: string) => 
  addNewItemToHomeFeed(itemId, 'post')

/**
 * 편집된 아이템의 캐시 업데이트
 */
export async function updateEditedItemInCache(
  itemId: string,
  itemType: 'recipe' | 'post'
): Promise<NewItemResult> {
  const supabase = createSupabaseBrowserClient()
  
  // Updating edited item in cache
  
  try {
    // 수정된 아이템의 최신 정보 조회
    const { data: updatedItemDetail, error } = await supabase
      .from("optimized_feed_view")
      .select("*")
      .eq("id", itemId)
      .single()

    if (error || !updatedItemDetail) {
      console.warn(`⚠️ HomeFeedUpdate: Failed to fetch updated ${itemType} detail:`, error)
      return {
        success: false,
        message: `수정된 ${itemType} 정보를 가져올 수 없습니다.`,
        itemId
      }
    }

    // 홈피드 캐시에서 해당 아이템 업데이트
    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      async (cachedData: any) => {
        if (!cachedData || !Array.isArray(cachedData)) return cachedData
        
        return cachedData.map(page => {
          if (!Array.isArray(page)) return page
          
          return page.map(item => {
            if ((item.id && item.id === itemId) || (item.item_id && item.item_id === itemId)) {
              // Updated item in cache
              return updatedItemDetail
            }
            return item
          })
        })
      },
      { revalidate: false }
    )

    // Successfully updated item in cache
    
    return {
      success: true,
      message: `${itemType === 'recipe' ? '레시피' : '레시피드'}가 업데이트되었습니다!`,
      itemId
    }

  } catch (error) {
    console.error(`❌ HomeFeedUpdate: Error updating ${itemType} in cache:`, error)
    
    return {
      success: false,
      message: `캐시 업데이트 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      itemId
    }
  }
}

/**
 * 홈피드 전체 갱신 (최후의 수단)
 */
export async function refreshHomeFeed(): Promise<void> {
  // Refreshing entire home feed
  
  try {
    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|"),
      undefined,
      { revalidate: true }
    )
    
    // Home feed refreshed successfully
  } catch (error) {
    console.error(`❌ HomeFeedUpdate: Error refreshing home feed:`, error)
  }
} 