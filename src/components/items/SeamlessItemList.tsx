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
interface SeamlessItemListProps {
  /**
   * 서버에서 미리 로딩된 초기 데이터 (SSR 최적화용)
   * null인 경우 클라이언트에서 데이터 페칭
   */
  initialData?: ServerFeedData | null
}

/**
 * 심리스한 실시간 아이템 리스트 컴포넌트 (SSR + 실시간 동기화)
 * 레시피/레시피드 변경사항을 즉시 반영하여 완벽한 사용자 경험 제공
 * 
 * @param initialData - 서버에서 미리 로딩된 데이터 (성능 최적화)
 * @returns 실시간 동기화가 적용된 무한 스크롤 아이템 리스트
 */
export default function SeamlessItemList({ initialData }: SeamlessItemListProps) {
  // 시간 덩어리 이름의 "오늘"은 화면이 뜬 뒤 기준으로 (미리 만든 홈과의 불일치 방지)
  const now = useHydrated() ? new Date() : null
  const { feedItems, isLoading, isError, size, setSize, isReachingEnd, mutate: swrMutate } = usePosts(initialData)
  const observerElem = useRef<HTMLDivElement>(null)

  const supabase = createSupabaseBrowserClient()


  // 피드 갱신: 탭으로 돌아올 때(여기), 뒤로 가기로 홈에 돌아올 때(ClientLayoutWrapper).
  // 테이블 전체를 구독하는 실시간 채널은 모든 방문자에게 사이트 전체 변경을 보내 부담이 커지므로 쓰지 않는다.
  usePageVisibility({ revalidateKeys: ['items|', 'comments_'] })


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

  // 무한 스크롤 Intersection Observer
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

  // 에러 상태 처리
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

  // 초기 로딩 상태 (SSR 데이터가 있으면 스킵)
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


      {/* 아이템 목록 */}
      <div className="space-y-3 px-3 py-3">
        {feedItems.map((item, index) => {
          // LCP 최적화: 첫 번째 3개 포스트에만 priority 적용
          const isPriorityPost = index < 3
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
                onItemUpdate={() => { swrMutate(); }} // 삭제시 즉시 업데이트를 위한 mutate 함수 전달
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