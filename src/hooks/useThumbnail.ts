/**
 * 🎯 업계 표준 썸네일 관리 훅 - 완전한 관심사 분리
 * Instagram/Pinterest 방식의 robust한 썸네일 시스템
 * 
 * 책임:
 * - 썸네일 인덱스 관리
 * - 이미지 순서 조정 (표시용)
 * - 썸네일 변경 시 전역 캐시 동기화
 * - 폼 데이터와 표시 데이터 분리
 */

"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { mutate } from "swr"

interface UseThumbnailOptions {
  itemId?: string | null
  imageUrls: string[]
  thumbnailIndex?: number | null | undefined
  onThumbnailChange?: (newIndex: number) => void
}

interface UseThumbnailReturn {
  // 현재 썸네일 정보
  currentThumbnailIndex: number
  currentThumbnailUrl: string | null
  
  // 표시용 이미지 순서 (썸네일이 첫 번째)
  orderedImages: string[]
  
  // 썸네일 변경 함수
  setThumbnailIndex: (index: number) => void
  
  // 유틸리티
  isValidIndex: (index: number) => boolean
  getThumbnailUrl: (index: number) => string | null
}

/**
 * 🎯 썸네일 관리 훅 - 업계 표준 구현
 */
export function useThumbnail({
  itemId,
  imageUrls,
  thumbnailIndex,
  onThumbnailChange
}: UseThumbnailOptions): UseThumbnailReturn {
  
  // 🎯 상태 관리 - 단순하고 명확
  const [currentIndex, setCurrentIndex] = useState(() => {
    // 초기값 검증 및 설정
    const validIndex = thumbnailIndex ?? 0
    return isValidThumbnailIndex(validIndex, imageUrls) ? validIndex : 0
  })

  // 🔧 thumbnailIndex prop 변화 감지 및 동기화
  useEffect(() => {
    const validIndex = thumbnailIndex ?? 0
    const newIndex = isValidThumbnailIndex(validIndex, imageUrls) ? validIndex : 0
    
    if (newIndex !== currentIndex) {
      console.log(`🔄 useThumbnail: Syncing prop change ${currentIndex} → ${newIndex}`)
      setCurrentIndex(newIndex)
    }
  }, [thumbnailIndex, imageUrls, currentIndex])

  /**
   * 🔧 썸네일 인덱스 유효성 검증
   */
  const isValidIndex = useCallback((index: number): boolean => {
    return isValidThumbnailIndex(index, imageUrls)
  }, [imageUrls])

  /**
   * 🖼️ 특정 인덱스의 썸네일 URL 가져오기
   */
  const getThumbnailUrl = useCallback((index: number): string | null => {
    return isValidIndex(index) ? imageUrls[index] : null
  }, [imageUrls, isValidIndex])

  /**
   * 🎯 현재 썸네일 정보 계산
   */
  const currentThumbnailUrl = useMemo(() => {
    return getThumbnailUrl(currentIndex)
  }, [currentIndex, getThumbnailUrl])

  /**
   * 📱 표시용 이미지 순서 계산 (썸네일이 첫 번째로)
   */
  const orderedImages = useMemo(() => {
    const ordered = reorderImagesForDisplay(imageUrls, currentIndex)
    
    // 🔍 새로운 아이템 디버깅 (이미지 URL이 있지만 orderedImages가 비어있는 경우)
    if (itemId && imageUrls.length > 0 && ordered.length === 0) {
      console.warn(`⚠️ [THUMBNAIL DEBUG] ${itemId}: Images lost during reorder!`, {
        input_urls: imageUrls,
        current_index: currentIndex,
        output_ordered: ordered
      })
    }
    
    return ordered
  }, [imageUrls, currentIndex, itemId])

  /**
   * 🚀 썸네일 인덱스 변경
   */
  const setThumbnailIndex = useCallback(async (newIndex: number) => {
    // 유효성 검증
    if (!isValidIndex(newIndex)) {
      console.warn(`Invalid thumbnail index: ${newIndex} (valid range: 0-${imageUrls.length - 1})`)
      return
    }

    console.log(`🎯 Thumbnail: Changing index ${currentIndex} → ${newIndex}`)

    // 로컬 상태 업데이트
    setCurrentIndex(newIndex)
    
    // 부모 컴포넌트에 알림
    onThumbnailChange?.(newIndex)

    // 전역 캐시 업데이트 (itemId가 있는 경우만)
    if (itemId) {
      await updateGlobalThumbnailCaches(itemId, newIndex, imageUrls)
    }
  }, [currentIndex, imageUrls, itemId, isValidIndex, onThumbnailChange])

  return {
    currentThumbnailIndex: currentIndex,
    currentThumbnailUrl,
    orderedImages,
    setThumbnailIndex,
    isValidIndex,
    getThumbnailUrl
  }
}

/**
 * 🔧 썸네일 인덱스 유효성 검증 (순수 함수)
 */
function isValidThumbnailIndex(index: number, imageUrls: string[]): boolean {
  return Number.isInteger(index) && index >= 0 && index < imageUrls.length
}

/**
 * 📱 표시용 이미지 순서 조정 (순수 함수)
 * 썸네일을 첫 번째 위치로 이동
 */
function reorderImagesForDisplay(imageUrls: string[], thumbnailIndex: number): string[] {
  if (!isValidThumbnailIndex(thumbnailIndex, imageUrls)) {
    return imageUrls
  }

  if (thumbnailIndex === 0) {
    return imageUrls
  }

  // 썸네일을 첫 번째로 이동
  const ordered = [...imageUrls]
  const thumbnail = ordered.splice(thumbnailIndex, 1)[0]
  ordered.unshift(thumbnail)
  
  return ordered
}

/**
 * 🌐 전역 캐시의 썸네일 정보 업데이트
 */
async function updateGlobalThumbnailCaches(
  itemId: string,
  thumbnailIndex: number,
  imageUrls: string[]
): Promise<void> {
  
  console.log(`🔄 Thumbnail: Updating global caches for item ${itemId}, index ${thumbnailIndex}`)

  const updateItem = (item: any) => {
    if (item && (item.id === itemId || item.item_id === itemId)) {
      return {
        ...item,
        thumbnail_index: thumbnailIndex,
        image_urls: imageUrls // 이미지 URL도 동기화
      }
    }
    return item
  }

  // 📱 홈피드 업데이트
  await mutate(
    (key) => typeof key === 'string' && key.startsWith('items|'),
    (data: any[][] | undefined) => {
      if (!data || !Array.isArray(data)) return data
      return data.map(page => {
        // 🔧 page가 배열인지 안전하게 확인
        if (!Array.isArray(page)) return page
        return page.map(updateItem)
      })
    },
    { revalidate: false }
  )

  // 📚 레시피북 업데이트  
  await mutate(
    (key) => typeof key === 'string' && key.startsWith('recipes|'),
    (data: any[][] | undefined) => {
      if (!data || !Array.isArray(data)) return data
      return data.map(page => {
        // 🔧 page가 배열인지 안전하게 확인
        if (!Array.isArray(page)) return page
        return page.map(updateItem)
      })
    },
    { revalidate: false }
  )

  // 👤 프로필 페이지 업데이트
  await mutate(
    (key) => typeof key === 'string' && key.includes('user_items_'),
    (data: any[][] | undefined) => {
      if (!data || !Array.isArray(data)) return data
      return data.map(page => {
        // 🔧 page가 배열인지 안전하게 확인
        if (!Array.isArray(page)) return page
        return page.map(updateItem)
      })
    },
    { revalidate: false }
  )

  // 📄 상세페이지 업데이트
  await mutate(
    `item_details_${itemId}`,
    (data: any) => updateItem(data),
    { revalidate: false }
  )

  console.log(`✅ Thumbnail: Global caches updated for item ${itemId}`)
} 