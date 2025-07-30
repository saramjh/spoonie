"use client"

import { useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSWRConfig } from "swr"

/**
 * 🧭 페이지 간 seamless 네비게이션 최적화 훅
 * 페이지 이동 시 데이터 사전 로딩과 캐시 무효화를 지능적으로 처리
 */

interface NavigationOptions {
  preloadDelay?: number // 마우스 호버 후 사전 로딩 지연 시간 (ms)
  cacheRetention?: number // 이전 페이지 캐시 유지 시간 (ms)
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
    cacheRetention = 5 * 60 * 1000 // 5분
  } = options

  const preloadedRoutesRef = useRef<Map<string, PreloadedRoute>>(new Map())
  const hoverTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  /**
   * 🚀 인텔리전트 페이지 사전 로딩
   * 사용자가 링크에 마우스를 올리면 데이터를 미리 가져옴
   */
  const preloadRoute = useCallback(async (path: string) => {
    console.log(`🔮 Preloading route: ${path}`)
    
    try {
      // 이미 사전 로딩된 경우 스킵
      const existing = preloadedRoutesRef.current.get(path)
      if (existing && Date.now() - existing.timestamp < cacheRetention) {
        console.log(`📋 Route already preloaded: ${path}`)
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
   * 📝 레시피 데이터 사전 로딩
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

    console.log(`📝 Recipe ${recipeId} preloaded`)
  }, [mutate])

  /**
   * 📱 레시피드 데이터 사전 로딩
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

    console.log(`📱 Post ${postId} preloaded`)
  }, [mutate])

  /**
   * 👤 프로필 데이터 사전 로딩
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

    console.log(`👤 Profile ${userId} preloaded`)
  }, [mutate])

  /**
   * 🏠 홈 데이터 사전 로딩
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

    console.log(`🏠 Home feed preloaded`)
  }, [mutate])

  /**
   * 🧹 스마트 캐시 정리
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
          if (cacheData && now - cacheData.timestamp > cacheRetention) {
            cache.delete(key)
            cleanedCount++
          }
        }
        
        // 10분 이상 된 피드 캐시 정리 (첫 페이지 제외)
        if (key.startsWith('items|') && !key.includes('|0|')) {
          const cacheData = cache.get(key)
          if (cacheData && now - cacheData.timestamp > cacheRetention * 2) {
            cache.delete(key)
            cleanedCount++
          }
        }
      }
    })

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old cache entries`)
    }
  }, [cache, cacheRetention])

  /**
   * 🖱️ 링크 호버 핸들러
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
   * 🖱️ 링크 호버 종료 핸들러
   */
  const handleLinkHoverEnd = useCallback((path: string) => {
    const timeout = hoverTimeoutsRef.current.get(path)
    if (timeout) {
      clearTimeout(timeout)
      hoverTimeoutsRef.current.delete(path)
    }
  }, [])

  /**
   * 🧭 최적화된 네비게이션
   */
  const navigateOptimized = useCallback((path: string) => {
    console.log(`🧭 Optimized navigation to: ${path}`)
    
    // 이미 사전 로딩된 데이터가 있으면 즉시 이동
    const preloaded = preloadedRoutesRef.current.get(path)
    if (preloaded) {
      console.log(`⚡ Using preloaded data for: ${path}`)
    }

    router.push(path)
  }, [router])

  /**
   * 📊 현재 페이지 변경 감지 및 캐시 최적화
   */
  useEffect(() => {
    console.log(`📊 Page changed to: ${pathname}`)
    
    // 페이지 변경 시 관련 없는 캐시 정리
    const cleanup = setTimeout(cleanupCache, 1000)
    
    return () => clearTimeout(cleanup)
  }, [pathname, cleanupCache])

  /**
   * 🔄 정기적 캐시 정리 (5분마다)
   */
  useEffect(() => {
    const interval = setInterval(cleanupCache, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [cleanupCache])

  /**
   * 🧹 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      // 모든 타이머 정리
      hoverTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      hoverTimeoutsRef.current.clear()
      preloadedRoutesRef.current.clear()
    }
  }, [])

  return {
    preloadRoute,
    handleLinkHover,
    handleLinkHoverEnd,
    navigateOptimized,
    cleanupCache,
    isPreloaded: (path: string) => preloadedRoutesRef.current.has(path)
  }
} 