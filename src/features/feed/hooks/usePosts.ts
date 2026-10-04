"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import useSWRInfinite from "swr/infinite"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import type { User } from "@supabase/supabase-js"
import type { Item } from "@/types/item"
import type { ServerFeedData } from "@/features/feed/data/server-data"
import { fetchHomeFeedPage } from "@/features/feed/data/home-feed-repository"
import { diversifyRecentFeed, HOME_FEED_PAGE_SIZE } from "@/features/feed/domain/feed-order"

const PAGE_SIZE = HOME_FEED_PAGE_SIZE

const getKey = (pageIndex: number, previousPageData: Item[] | null, userId: string | null) => {
  if (previousPageData && !previousPageData.length) return null
  return `items|${pageIndex}|${userId || "guest"}`
}

const fetcher = fetchHomeFeedPage

export function usePosts(initialData?: ServerFeedData | null) {
  const [user, setUser] = useState<User | null>(initialData?.currentUser || null)
  const [loadingUser, setLoadingUser] = useState(!initialData)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
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
      revalidateOnFocus: true,
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

  const isLoading = loadingUser || (isValidating && feedItems.length === 0)
  const isEmpty = data?.[0]?.length === 0
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.length < PAGE_SIZE)

  const customMutate = useCallback(() => mutate(), [mutate])

  useEffect(() => {
    const interval = setInterval(() => {
      mutate(undefined, { revalidate: false })
    }, 30000)
    return () => clearInterval(interval)
  }, [mutate])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) mutate(undefined, { revalidate: true })
    }
    const handleFocus = () => mutate(undefined, { revalidate: true })

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
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
