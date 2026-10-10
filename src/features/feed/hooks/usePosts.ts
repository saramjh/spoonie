"use client"

import { useCallback, useMemo } from "react"
import useSWRInfinite from "swr/infinite"
import type { Item } from "@/types/item"
import type { ServerFeedData } from "@/features/feed/data/server-data"
import { fetchHomeFeedPage } from "@/features/feed/data/home-feed-repository"
import { useSessionStore } from "@/store/sessionStore"
import { diversifyRecentFeed, HOME_FEED_PAGE_SIZE } from "@/features/feed/domain/feed-order"

const PAGE_SIZE = HOME_FEED_PAGE_SIZE

const getKey = (pageIndex: number, previousPageData: Item[] | null, userId: string | null) => {
  if (previousPageData && !previousPageData.length) return null
  return `items|${pageIndex}|${userId || "guest"}`
}

const fetcher = fetchHomeFeedPage

export function usePosts(initialData?: ServerFeedData | null) {
  // ClientLayoutWrapper가 소유하는 로그인 상태를 사용한다. 인증 확인 전 게스트 재조회는 하지 않는다.
  const user = useSessionStore((state) => state.session)
  const loadingUser = useSessionStore((state) => state.isInitialLoad)

  const { data, error, size, setSize, mutate, isValidating } = useSWRInfinite(
    (pageIndex, previousPageData) => loadingUser ? null : getKey(pageIndex, previousPageData, user?.id ?? null),
    fetcher,
    {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      fallbackData: initialData?.items ? [initialData.items] : undefined,
    }
  )

  // 최신순이 기본이다. 같은 작성자가 3개 이상 연속될 때만 가까운 다른 작성자를
  // 한 칸 끌어와 초기 노출 독점을 완화한다. engagement score는 쓰지 않는다.
  const feedItems = useMemo(
    () => diversifyRecentFeed(data ? ([] as Item[]).concat(...data) : []),
    [data]
  )

  const isLoading = (loadingUser && !initialData) || (isValidating && feedItems.length === 0)
  const isEmpty = data?.[0]?.length === 0
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.length < PAGE_SIZE)

  const customMutate = useCallback(() => mutate(), [mutate])

  // 새 글 보기는 offset이 밀린 이전 페이지를 버리고 최신 첫 페이지부터 다시 시작한다.
  const refreshLatest = useCallback(async () => {
    await setSize(1)
    await mutate()
  }, [setSize, mutate])

  return {
    feedItems,
    isLoading,
    isError: !!error,
    size,
    setSize,
    isReachingEnd,
    mutate: customMutate,
    refreshLatest,
  }
}
