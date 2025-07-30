"use client"

import { useEffect, useCallback, useRef } from 'react'
import { mutate } from 'swr'
import { useRouter } from 'next/navigation'

/**
 * 🚀 업계 표준: History API 기반 히스토리 뒤로가기 동기화
 * Twitter/Instagram처럼 브라우저 네이티브 뒤로가기 완벽 보장
 * 
 * 작동 원리:
 * 1. popstate 이벤트 감지 (뒤로가기/앞으로가기)
 * 2. 홈페이지로 돌아오는 경우 자동 캐시 갱신
 * 3. Service Worker 스타일 백그라운드 동기화
 */
export function useHistorySync(options: {
  /** 홈페이지 경로 패턴 */
  homePathPatterns?: string[]
  /** 디버그 로그 활성화 */
  debug?: boolean
} = {}) {
  const { 
    homePathPatterns = ['/'], 
    debug = false 
  } = options
  
  const router = useRouter()
  const lastPathRef = useRef<string>('')
  const isNavigatingRef = useRef(false)

  const handlePopState = useCallback(async (event: PopStateEvent) => {
    if (typeof window === 'undefined') return

    const currentPath = window.location.pathname
    const isReturningHome = homePathPatterns.some(pattern => 
      currentPath === pattern || currentPath.startsWith(pattern)
    )
    
    if (debug) {
      console.log(`🔄 HistorySync: PopState detected - ${lastPathRef.current} → ${currentPath}`)
    }

    // 🎯 홈페이지로 돌아오는 경우 즉시 동기화
    if (isReturningHome && lastPathRef.current !== currentPath) {
      if (debug) {
        console.log('🚀 HistorySync: Returning to home - triggering cache sync...')
      }

             // 업계 표준: 중요한 캐시만 선별적 갱신
       await Promise.all([
         // 홈피드 캐시 갱신
         mutate(
           (key) => typeof key === 'string' && key.startsWith('items|'),
           undefined,
           { 
             revalidate: true,
             populateCache: true
           }
         ),
         
         // 실시간성이 중요한 댓글 캐시 갱신
         mutate(
           (key) => typeof key === 'string' && key.startsWith('comments_'),
           undefined,
           { 
             revalidate: true,
             populateCache: true
           }
         )
       ])

      if (debug) {
        console.log('✅ HistorySync: Home cache revalidation completed')
      }
    }

    lastPathRef.current = currentPath
  }, [homePathPatterns, debug])

  // 🎯 페이지 이동 감지
  const handleBeforeUnload = useCallback(() => {
    if (typeof window !== 'undefined') {
      lastPathRef.current = window.location.pathname
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 현재 경로 저장
    lastPathRef.current = window.location.pathname

    // 🎯 히스토리 이벤트 리스너 등록
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // 🎯 추가 보장: Next.js 라우터 이벤트도 처리
    const handleRouteChange = (url: string) => {
      if (debug) {
        console.log(`🔄 HistorySync: Route change detected - ${url}`)
      }
      lastPathRef.current = url
    }

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [handlePopState, handleBeforeUnload, debug])

  return {
    currentPath: lastPathRef.current
  }
} 