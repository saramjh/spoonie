"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { usePosts } from "@/features/feed/hooks/usePosts"
import PostCard from "./PostCard"
import { feedPeriod } from "@/features/feed/domain/feed-period"
import { useHydrated } from "@/hooks/useHydrated"
import PostCardSkeleton from "./PostCardSkeleton"


import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import type { ServerFeedData } from "@/features/feed/data/server-data"
import { usePageVisibility } from "@/hooks/usePageVisibility"
import { shouldSignalNewFeedItem } from "@/features/feed/domain/feed-realtime"
import { scrollHomeToTop } from "@/shared/lib/home-scroll"

interface SeamlessItemListProps {
  // null이면 브라우저가 첫 페이지를 조회한다.
  initialData?: ServerFeedData | null
}

export default function SeamlessItemList({ initialData }: SeamlessItemListProps) {
  // 시간 덩어리 이름의 "오늘"은 화면이 뜬 뒤 기준으로 (미리 만든 홈과의 불일치 방지)
  const now = useHydrated() ? new Date() : null
  const { feedItems, isLoading, isError, size, setSize, isReachingEnd, mutate: swrMutate, refreshLatest } = usePosts(initialData)
  const observerElem = useRef<HTMLDivElement>(null)
  const newestKnownCreatedAt = useRef<string | null>(feedItems[0]?.created_at ?? null)
  const [hasNewItems, setHasNewItems] = useState(false)
  const [isRefreshingLatest, setIsRefreshingLatest] = useState(false)

  const supabase = createSupabaseBrowserClient()

  // 탭으로 돌아오면 기존 SWR 피드를 다시 받아 놓는다. Realtime은 화면을 보고 있을 때
  // "새 글이 생겼다"는 신호만 전달하고 실제 피드 데이터는 계속 이 조회 경로가 소유한다.
  usePageVisibility({ revalidateKeys: ['items|', 'comments_'] })

  useEffect(() => {
    newestKnownCreatedAt.current = feedItems[0]?.created_at ?? null
  }, [feedItems])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const subscribe = () => {
      if (document.hidden || channel) return

      channel = supabase
        .channel("home-feed:new-items")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "items", filter: "is_public=eq.true" },
          (payload) => {
            if (shouldSignalNewFeedItem("INSERT", payload.new, newestKnownCreatedAt.current)) {
              setHasNewItems(true)
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "items", filter: "is_public=eq.true" },
          (payload) => {
            if (shouldSignalNewFeedItem("UPDATE", payload.new, newestKnownCreatedAt.current)) {
              setHasNewItems(true)
            }
          }
        )
        .subscribe()
    }

    const unsubscribe = () => {
      if (!channel) return
      void supabase.removeChannel(channel)
      channel = null
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        unsubscribe()
        return
      }

      // usePageVisibility가 같은 시점에 최신 피드를 다시 받으므로 오래된 신호는 버린다.
      setHasNewItems(false)
      subscribe()
    }

    subscribe()
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      unsubscribe()
    }
  }, [supabase])


  // 사용자 상태. 가입은 스크롤 도중이 아니라 좋아요·기록처럼 행동하는 순간에만 권한다 (PRODUCT.md 비회원 정책)
  const [currentUser, setCurrentUser] = useState<User | null>(initialData?.currentUser || null)

  // 사용자 상태 확인: 홈 HTML은 공개 피드로 정적 생성되므로 로그인 여부는 항상 브라우저에서 확인한다
  useEffect(() => {
    if (initialData?.currentUser) return
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    checkUser()
  }, [supabase, initialData])

  const handleShowNewItems = useCallback(async () => {
    if (isRefreshingLatest) return

    setIsRefreshingLatest(true)
    try {
      await refreshLatest()
      setHasNewItems(false)
      scrollHomeToTop()
    } catch (error) {
      console.error("❌ Home feed: failed to load latest items:", error)
    } finally {
      setIsRefreshingLatest(false)
    }
  }, [isRefreshingLatest, refreshLatest])

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target.isIntersecting && !isReachingEnd && !isLoading) {
        setSize(size + 1)
      }
    },
    [setSize, isReachingEnd, isLoading, size]
  )

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: "20px",
      threshold: 0,
    }
    const observer = new IntersectionObserver(handleObserver, option)
    if (observerElem.current) observer.observe(observerElem.current)
    return () => observer.disconnect()
  }, [handleObserver])

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-ink-soft">데이터를 불러오는 중 오류가 발생했습니다.</p>
        <Button 
          variant="outline" 
          onClick={() => swrMutate()}
          disabled={isLoading}
        >
          다시 시도
        </Button>
      </div>
    )
  }

  // SSR 데이터가 없을 때만 초기 skeleton을 보여준다.
  if (isLoading && feedItems.length === 0 && !initialData) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="sr-only" aria-live="polite">{hasNewItems ? "새 글이 있습니다." : ""}</div>

      {hasNewItems && (
        <div className="sticky top-3 z-40 flex h-0 justify-center px-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="translate-y-3 bg-paper shadow-sm"
            onClick={handleShowNewItems}
            disabled={isRefreshingLatest}
            aria-label="새 글이 있습니다. 최신 글 보기"
          >
            {isRefreshingLatest ? "새 글 불러오는 중" : "새 글 보기"}
          </Button>
        </div>
      )}

      <div className="space-y-3 px-3 py-3">
        {feedItems.map((item, index) => {
          // 첫 카드 한 장만 high priority로 두어 초기 이미지끼리 대역폭을 경쟁하지 않게 한다.
          const isPriorityPost = index === 0
          // 시간 덩어리가 바뀌는 곳에 이름을 달아 피드에 리듬을 준다 (오늘 / 어제 / 이번 주 / 이번 달 / 년월)
          const period = feedPeriod(item.created_at, now)
          const showPeriod = index === 0 || feedPeriod(feedItems[index - 1].created_at, now) !== period
          
          return (
            <div key={item.id || item.item_id}>
              {showPeriod && <h2 className={`px-1 pb-2 text-meta font-semibold text-ink-soft ${index === 0 ? "" : "pt-3"}`}>{period}</h2>}
              <PostCard 
                item={item} 
                currentUser={currentUser}
                priority={isPriorityPost}
                onItemUpdate={() => { swrMutate(); }}
              />
            </div>
          )
        })}
      </div>

      {/* 무한 스크롤 로딩 */}
      {!isReachingEnd && (
        <div ref={observerElem} className="flex justify-center py-8">
          {isLoading ? (
            <div className="space-y-4 w-full">
              {Array.from({ length: 3 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="text-center text-ink-soft">
              스크롤해서 더 보기
            </div>
          )}
        </div>
      )}

      {/* 끝 표시 */}
      {isReachingEnd && feedItems.length > 0 && (
        <div className="text-center py-8 text-ink-soft">
          모든 게시물을 확인했습니다
        </div>
      )}

      {/* 빈 상태 */}
      {feedItems.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <h3 className="text-title text-ink">아직 게시물이 없어요</h3>
          <p className="text-ink-soft text-center">
            첫 번째 레시피나 레시피드를 작성해보세요!
          </p>
          <div className="flex gap-2">
            <Link href="/recipes/new">
              <Button variant="default">레시피 작성</Button>
            </Link>
            <Link href="/posts/new">
              <Button variant="outline">레시피드 작성</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
} 