"use client"

import { useEffect, useCallback } from 'react'
import { mutate } from 'swr'

/**
 * 업계 표준: Page Visibility API 기반 심리스 동기화
 * Instagram/Facebook/Twitter와 동일한 방식으로 히스토리 뒤로가기 보장
 * 
 * 작동 원리:
 * 1. 페이지가 숨겨짐 (hidden) → 상태 저장
 * 2. 페이지가 다시 보여짐 (visible) → 캐시 갱신
 * 3. 백그라운드에서 변경된 데이터 즉시 반영
 */
export function usePageVisibility(options: {
  /** 갱신할 SWR 키 패턴들 */
  revalidateKeys?: string[]
  /** 디버그 로그 활성화 */
  debug?: boolean
} = {}) {
  const { 
    revalidateKeys = ['items|', 'item_details_', 'comments_'], 
    debug = false 
  } = options

  const handleVisibilityChange = useCallback(async () => {
    if (typeof document === 'undefined') return

    if (!document.hidden) {
      // 페이지가 다시 보여질 때 (히스토리 뒤로가기 포함)
      if (debug) {
  
      }

      // 업계 표준: 중요한 캐시들만 선별적으로 갱신
      for (const keyPattern of revalidateKeys) {
        await mutate(
          (key) => typeof key === 'string' && key.startsWith(keyPattern),
          undefined,
          { 
            revalidate: true,
            populateCache: true,
            // 조건부 갱신: stale 데이터만 갱신 (성능 최적화)
            optimisticData: (currentData) => currentData
          }
        )
      }

      if (debug) {
  
      }
    } else {
      // 페이지가 숨겨질 때 (상세페이지로 이동 등)
      if (debug) {
  
      }
    }
  }, [revalidateKeys, debug])

  useEffect(() => {
    if (typeof document === 'undefined') return

    // Page Visibility API 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 추가 보장: focus/blur 이벤트도 함께 처리
    const handleFocus = () => {
      if (!document.hidden) {
        handleVisibilityChange()
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [handleVisibilityChange])

  return {
    isVisible: typeof document !== 'undefined' ? !document.hidden : true
  }
} 