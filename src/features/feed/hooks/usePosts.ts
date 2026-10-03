"use client"

import { useState, useEffect, useCallback } from "react"
import useSWRInfinite from "swr/infinite"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import type { User } from "@supabase/supabase-js"
import type { Item } from "@/types/item" // 통합된 타입 정의를 가져옵니다.
import type { ServerFeedData } from "@/features/feed/data/server-data"
import { HOME_FEED_PAGE_SIZE, fetchHomeFeedPage } from "@/features/feed/data/home-feed-repository"


const PAGE_SIZE = HOME_FEED_PAGE_SIZE

// SWR 키 생성 함수. 이제 userId만 필요합니다.
const getKey = (pageIndex: number, previousPageData: Item[] | null, userId: string | null) => {
  if (previousPageData && !previousPageData.length) return null // 끝에 도달
  return `items|${pageIndex}|${userId || "guest"}`
}

const fetcher = fetchHomeFeedPage

export function usePosts(initialData?: ServerFeedData | null) {
  const [user, setUser] = useState<User | null>(initialData?.currentUser || null)
  const [loadingUser, setLoadingUser] = useState(!initialData)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createSupabaseBrowserClient()
			const {
				data: { user },
			} = await supabase.auth.getUser()
      setUser(user)
      setLoadingUser(false)
    }
    fetchUser()
  }, [])

	const { data, error, size, setSize, mutate, isValidating } = useSWRInfinite(
    (pageIndex, previousPageData) => getKey(pageIndex, previousPageData, user?.id ?? null), 
    fetcher, 
    {
      revalidateFirstPage: false,
      revalidateOnFocus: true, // 홈화면 포커스 시 최신 데이터 자동 업데이트
      dedupingInterval: 5000, // 5초로 단축 - 더 빠른 실시간 반영
      // 서버에서 미리 로딩된 초기 데이터 활용 (SSR 최적화)
      fallbackData: initialData?.items ? [initialData.items] : undefined,
    }
  )

  	const feedItems = data ? ([] as Item[]).concat(...data) : []
  const isLoading = loadingUser || (isValidating && feedItems.length === 0)
  const isEmpty = data?.[0]?.length === 0
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.length < PAGE_SIZE)

  const customMutate = useCallback(() => {
    return mutate()
  }, [mutate])

  // 백그라운드 스마트 동기화 (30초마다 자동)
  useEffect(() => {
    const interval = setInterval(() => {

      // 업계 표준: 삭제 직후에는 background sync 건너뛰기 (Instagram/Twitter 방식)
      // mutate 호출시 revalidate: false로 하여 서버에서 다시 가져오지 않음
      mutate(undefined, { revalidate: false }) // 캐시만 정리, 서버 재검증 없음
    }, 30000) // 30초마다

    return () => clearInterval(interval)
  }, [mutate])

  // 페이지 가시성 변화 감지 - 상세페이지에서 돌아올 때 즉시 동기화
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
  
        // 첫 페이지만 빠르게 revalidate하여 최신 변경사항 반영
        mutate(undefined, { revalidate: true })
      }
    }

    const handleFocus = () => {
      
      mutate(undefined, { revalidate: true })
    }

    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [mutate])

  return {
    feedItems,
    isLoading,
    isError: !!error,
    size,
    setSize,
    isReachingEnd,
    mutate: customMutate,
  }
}
