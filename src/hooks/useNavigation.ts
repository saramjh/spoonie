"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useRouter } from "@/lib/navigation"
import { useSWRConfig } from "swr"

/**
 * 페이지 간 seamless 네비게이션 최적화 훅
 * 페이지 이동 시 데이터 사전 로딩과 캐시 무효화를 지능적으로 처리
 */

interface NavigationOptions {
  preloadDelay?: number // 마우스 호버 후 사전 로딩 지연 시간 (ms)
  cacheRetention?: number // 이전 페이지 캐시 유지 시간 (ms)
  trackHistory?: boolean // 이전 경로 추적 여부
}

interface PreloadedRoute {
  path: string
  timestamp: number
  data: any
}

export function useNavigation(options: NavigationOptions = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const { mutate, cache } = useSWRConfig()
  
  const {
    preloadDelay = 300,
    cacheRetention = 5 * 60 * 1000, // 5분
    trackHistory = false
  } = options

  const preloadedRoutesRef = useRef<Map<string, PreloadedRoute>>(new Map())
  const hoverTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  
  // 이전 경로 추적 (Smart Navigation용)
  const [previousPath, setPreviousPath] = useState<string | null>(null)
  const [navigationHistory, setNavigationHistory] = useState<string[]>(() => {
    // SessionStorage에서 네비게이션 히스토리 복원
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('spoonie_nav_history')
        if (saved) {
          const parsed = JSON.parse(saved)
    
          return Array.isArray(parsed) ? parsed : []
        }
      } catch (error) {
        console.warn('Failed to restore navigation history:', error)
      }
    }
    return []
  })

  // 이전 경로 추적 - 현재 경로가 변경될 때마다 업데이트
  useEffect(() => {
    if (trackHistory && pathname) {
      setPreviousPath(prevPath => {
        // 첫 방문이 아닌 경우에만 이전 경로 업데이트
        if (prevPath && prevPath !== pathname) {
          const newHistory = [...navigationHistory.slice(-4), prevPath] // 최근 5개 경로만 유지
          setNavigationHistory(newHistory)
          
          // SessionStorage 영속화 (새로고침/직접 접근 대응)
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('spoonie_nav_history', JSON.stringify(newHistory))
          
            } catch (error) {
              console.warn('Failed to save navigation history:', error)
            }
          }
        }
        return pathname
      })
    }
  }, [pathname, trackHistory, navigationHistory])

  /**
   * 인텔리전트 페이지 사전 로딩
   * 사용자가 링크에 마우스를 올리면 데이터를 미리 가져옴
   */
  const preloadRoute = useCallback(async (path: string) => {
    
    
    try {
      // 이미 사전 로딩된 경우 스킵
      const existing = preloadedRoutesRef.current.get(path)
      if (existing && Date.now() - existing.timestamp < cacheRetention) {
  
        return
      }

      // 경로별 데이터 사전 로딩
      if (path.startsWith('/recipes/')) {
        await preloadRecipeData(path)
      } else if (path.startsWith('/feed/') || path.startsWith('/posts/')) {
        await preloadPostData(path)
      } else if (path.startsWith('/profile/')) {
        await preloadProfileData(path)
      } else if (path === '/' || path === '/feed') {
        await preloadHomeData()
      }

    } catch (error) {
      console.warn(`⚠️ Failed to preload route ${path}:`, error)
    }
  }, [cacheRetention])

  /**
   * 레시피 데이터 사전 로딩
   */
  const preloadRecipeData = useCallback(async (path: string) => {
    const recipeId = path.split('/recipes/')[1]?.split('/')[0]
    if (!recipeId) return

    // 레시피 상세 데이터 사전 로딩
    await mutate(
      `item_details_${recipeId}`,
      async () => {
        // 실제 데이터 페칭 로직은 훅에서 처리하므로 여기서는 키만 준비
        return undefined
      },
      { revalidate: true }
    )

    
  }, [mutate])

  /**
   * 레시피드 데이터 사전 로딩
   */
  const preloadPostData = useCallback(async (path: string) => {
    const postId = path.split('/')[2] // /feed/[id] 또는 /posts/[id]
    if (!postId) return

    // 레시피드 상세 데이터 사전 로딩
    await mutate(
      `item_details_${postId}`,
      async () => {
        return undefined
      },
      { revalidate: true }
    )

    
  }, [mutate])

  /**
   * 프로필 데이터 사전 로딩
   */
  const preloadProfileData = useCallback(async (path: string) => {
    const userId = path.split('/profile/')[1]?.split('/')[0]
    if (!userId) return

    // 프로필 데이터 사전 로딩
    await mutate(
      `profile_${userId}`,
      async () => {
        return undefined
      },
      { revalidate: true }
    )

    
  }, [mutate])

  /**
   * 홈 데이터 사전 로딩
   */
  const preloadHomeData = useCallback(async () => {
    // 홈피드 첫 페이지 사전 로딩
    await mutate(
      (key) => typeof key === "string" && key.startsWith("items|0|"),
      async () => {
        return undefined
      },
      { revalidate: true }
    )

    
  }, [mutate])

  /**
   * 스마트 캐시 정리
   * 메모리 사용량을 최적화하기 위해 오래된 캐시 제거
   */
  const cleanupCache = useCallback(() => {
    const now = Date.now()
    const keys = Array.from(cache.keys())
    
    let cleanedCount = 0
    
    keys.forEach(key => {
      if (typeof key === 'string') {
        // 5분 이상 된 상세 페이지 캐시 정리
        if (key.startsWith('item_details_') || key.startsWith('profile_')) {
          const cacheData = cache.get(key)
          if (cacheData && (cacheData as any).timestamp && now - (cacheData as any).timestamp > cacheRetention) {
            cache.delete(key)
            cleanedCount++
          }
        }
        
        // 10분 이상 된 피드 캐시 정리 (첫 페이지 제외)
        if (key.startsWith('items|') && !key.includes('|0|')) {
          const cacheData = cache.get(key)
          if (cacheData && (cacheData as any).timestamp && now - (cacheData as any).timestamp > cacheRetention * 2) {
            cache.delete(key)
            cleanedCount++
          }
        }
      }
    })

    if (cleanedCount > 0) {
  
    }
  }, [cache, cacheRetention])

  /**
   * 링크 호버 핸들러
   */
  const handleLinkHover = useCallback((path: string) => {
    // 기존 타이머 취소
    const existingTimeout = hoverTimeoutsRef.current.get(path)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // 새 타이머 설정
    const timeout = setTimeout(() => {
      preloadRoute(path)
      hoverTimeoutsRef.current.delete(path)
    }, preloadDelay)

    hoverTimeoutsRef.current.set(path, timeout)
  }, [preloadRoute, preloadDelay])

  /**
   * 링크 호버 종료 핸들러
   */
  const handleLinkHoverEnd = useCallback((path: string) => {
    const timeout = hoverTimeoutsRef.current.get(path)
    if (timeout) {
      clearTimeout(timeout)
      hoverTimeoutsRef.current.delete(path)
    }
  }, [])

  /**
   * 최적화된 네비게이션
   */
  const navigateOptimized = useCallback((path: string) => {

    
    // 이미 사전 로딩된 데이터가 있으면 즉시 이동
    const preloaded = preloadedRoutesRef.current.get(path)
    if (preloaded) {

    }

    router.push(path)
  }, [router])

  /**
   * 현재 페이지 변경 감지 및 캐시 최적화
   */
  useEffect(() => {

    
    // 페이지 변경 시 관련 없는 캐시 정리
    const cleanup = setTimeout(cleanupCache, 1000)
    
    return () => clearTimeout(cleanup)
  }, [pathname, cleanupCache])

  /**
   * 정기적 캐시 정리 (5분마다)
   */
  useEffect(() => {
    const interval = setInterval(cleanupCache, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [cleanupCache])

  /**
   * URL 쿼리에서 origin 정보 추출
   */
  const getOriginFromURL = useCallback((): string | null => {
    if (typeof window === 'undefined') return null
    
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('from')
  }, [])

  /**
   * 스마트 리턴 경로 결정 (사용자가 어디서 왔는지 기반)
   */
  const getSmartReturnPath = useCallback((_currentItemId?: string): string => {
    // 1. URL origin 파라미터 확인 (최우선)
    const urlOrigin = getOriginFromURL()
    if (urlOrigin) {
  
      return decodeURIComponent(urlOrigin)
    }
    
    // 2. Navigation History 확인
    const lastPath = navigationHistory[navigationHistory.length - 1]

    
    // 네비게이션 히스토리가 없으면 세션 스토리지에서 확인
    if (!lastPath) {
      if (typeof window !== 'undefined') {
        try {
          const savedHistory = sessionStorage.getItem('spoonie_nav_history')
          if (savedHistory) {
            const parsed = JSON.parse(savedHistory)
            const savedLastPath = parsed[parsed.length - 1]
            if (savedLastPath) {
        
              return savedLastPath
            }
          }
        } catch (error) {
          console.warn('Failed to read saved navigation history:', error)
        }
      }
      return "/"
    }
    
    // 레시피북에서 온 경우 → 레시피북으로
    if (lastPath === "/recipes" || lastPath.startsWith("/recipes?")) {
      return "/recipes"
    }
    
    // 프로필 페이지에서 온 경우 → 해당 프로필로
    if (lastPath.startsWith("/profile/")) {
      return lastPath
    }
    
    // 검색 결과에서 온 경우 → 검색 페이지로
    if (lastPath.startsWith("/search")) {
      return lastPath
    }
    
    // 홈피드에서 온 경우 → 홈으로
    if (lastPath === "/" || lastPath === "/feed") {
      return "/"
    }
    
    // 기타 경우 → 브라우저 히스토리 백 또는 홈
    return "/"
  }, [navigationHistory, getOriginFromURL])

  /**
   * 스마트 네비게이션 (적절한 곳으로 돌아가기)
   */
  const navigateBack = useCallback((itemId?: string, options?: { replace?: boolean }) => {
    const returnPath = getSmartReturnPath(itemId)
    

    
    // 업계 표준: History Replace를 통한 네비게이션 체인 정리
    if (options?.replace) {
      // 수정폼 → 상세페이지: 수정폼을 히스토리에서 제거
      router.replace(returnPath)
    } else {
      // 일반적인 뒤로가기: 히스토리 유지
      router.push(returnPath)
    }
  }, [getSmartReturnPath, router])

  /**
   * 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      // Ref 안전성: cleanup 시점에 ref 값을 로컬 변수로 저장
      const hoverTimeouts = hoverTimeoutsRef.current
      const preloadedRoutes = preloadedRoutesRef.current
      
      // 모든 타이머 정리
      hoverTimeouts.forEach(timeout => clearTimeout(timeout))
      hoverTimeouts.clear()
      preloadedRoutes.clear()
    }
  }, [])

  /**
   * Origin 정보가 포함된 링크 생성
   */
  const createLinkWithOrigin = useCallback((path: string, currentPath?: string): string => {
    const origin = currentPath || pathname
    if (!origin || origin === path) return path
    
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}from=${encodeURIComponent(origin)}`
  }, [pathname])

  return {
    preloadRoute,
    handleLinkHover,
    handleLinkHoverEnd,
    navigateOptimized,
    cleanupCache,
    isPreloaded: (path: string) => preloadedRoutesRef.current.has(path),
    // Smart Navigation 기능들
    getSmartReturnPath,
    navigateBack,
    previousPath,
    navigationHistory,
    createLinkWithOrigin,
    getOriginFromURL
  }
} 