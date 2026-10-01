"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { usePosts } from "@/hooks/usePosts"
import PostCard from "./PostCard"
import { feedPeriod } from "@/lib/feed-period"
import { useHydrated } from "@/hooks/useHydrated"
import PostCardSkeleton from "./PostCardSkeleton"


import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import type { ServerFeedData } from "@/lib/server-data"
import { usePageVisibility } from "@/hooks/usePageVisibility"
import { useHistorySync } from "@/hooks/useHistorySync"
import { useNavigation } from "@/hooks/useNavigation"
// 통합 캐시 매니저가 모든 동기화를 처리


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

  // Smart Navigation: 홈피드 navigation history 추적
  useNavigation({ trackHistory: true })

  // 피드는 화면 복귀 시 갱신한다 (usePageVisibility). 테이블 전체를 구독하는 실시간 채널은
  // 모든 방문자에게 사이트 전체 변경을 보내 부담이 커지므로 사용하지 않는다.

  // 업계 표준: 히스토리 뒤로가기 완벽 보장
  usePageVisibility({
    revalidateKeys: ['items|', 'comments_'],
    debug: process.env.NODE_ENV === 'development'
  })

  useHistorySync({
    homePathPatterns: ['/'],
    debug: process.env.NODE_ENV === 'development'
  })

  // 사용자 상태 및 가입 유도 모달 관련 상태
  const [currentUser, setCurrentUser] = useState<User | null>(initialData?.currentUser || null)
  const scrollCountRef = useRef(0)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(!initialData?.currentUser)
  const visibleItemsRef = useRef<Set<string>>(new Set())

  // 사용자 상태 확인: 홈 HTML은 공개 피드로 정적 생성되므로 로그인 여부는 항상 브라우저에서 확인한다
  useEffect(() => {
    if (initialData?.currentUser) return
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      setIsAuthLoading(false)
    }
    checkUser()
  }, [supabase, initialData])

  /**
   * 스마트 백그라운드 동기화
   * 현재 화면에 보이는 아이템들만 선별적으로 동기화
   */
  const performSmartSync = useCallback(async (_priority: 'low' | 'normal' | 'high' = 'normal') => {
    
    
    try {
      // 통합 캐시 매니저가 자동으로 모든 동기화를 처리
      const result = { success: true, itemsUpdated: 0, syncTime: 0 }
      
      if (result.success) {
        
      } else {
        console.warn(`⚠️ Smart sync had errors`)
      }
    } catch (error) {
      console.error("❌ Smart sync failed:", error)
    }
  }, [])

  /**
   * 디바운스된 통계 동기화
   */
  const debouncedStatsSync = useCallback(() => {
    const timeoutId = setTimeout(async () => {
      const visibleIds = Array.from(visibleItemsRef.current)
      if (visibleIds.length > 0) {
        // 통합 캐시 매니저가 자동으로 통계 동기화를 처리
        
      }
    }, 5000)

    return () => clearTimeout(timeoutId)
  }, [])

  /**
   * 화면에 보이는 아이템 추적 (Intersection Observer)
   */
  const trackVisibleItems = useCallback(() => {
    if (!window.IntersectionObserver) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const itemId = entry.target.getAttribute('data-item-id')
        if (!itemId) return

        if (entry.isIntersecting) {
          visibleItemsRef.current.add(itemId)
        } else {
          visibleItemsRef.current.delete(itemId)
        }
      })

      // 보이는 아이템들의 통계 업데이트 (5초 디바운스)
      if (visibleItemsRef.current.size > 0) {
        debouncedStatsSync()
      }
    }, {
      rootMargin: '100px', // 화면 밖 100px까지 미리 추적
      threshold: 0.1 // 10% 보이면 추적 시작
    })

    // 모든 PostCard에 observer 적용
    const itemElements = document.querySelectorAll('[data-item-id]')
    itemElements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [debouncedStatsSync])

  // Optimistic Updates: 통합 캐시 매니저로 완전 자동화 (데드코드 정리 완료)

  // 페이지 포커스 및 네비게이션 감지
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        
        performSmartSync('high')
      }
    }

    const handlePopState = () => {
      
      setTimeout(() => swrMutate(), 100)
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("popstate", handlePopState)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("popstate", handlePopState)
    }
  }, [performSmartSync, swrMutate])

  // 정기적 백그라운드 동기화 (3분마다) - 스마트 동기화 사용
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        performSmartSync('low')
      }
    }, 3 * 60 * 1000) // 3분

    return () => clearInterval(interval)
  }, [performSmartSync])

  // 화면에 보이는 아이템 추적 설정
  useEffect(() => {
    const cleanup = trackVisibleItems()
    return cleanup
  }, [trackVisibleItems, feedItems])

  // 무한 스크롤 Intersection Observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target.isIntersecting && !isReachingEnd && !isLoading) {
        setSize(size + 1)

        // 새 페이지 로딩 후 스마트 동기화
        setTimeout(() => performSmartSync('normal'), 1000)

        // 비회원인 경우 스크롤 카운트 증가
        if (!currentUser && !isAuthLoading) {
          scrollCountRef.current += 1
          // 10의 배수마다 모달 표시
          if (scrollCountRef.current % 10 === 0) {
            setShowSignupModal(true)
          }
        }
      }
    },
    [setSize, isReachingEnd, isLoading, size, currentUser, isAuthLoading, performSmartSync]
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
            <div key={item.id || item.item_id} data-item-id={item.id || item.item_id}>
              {showPeriod && <h2 className={`px-1 pb-2 text-[13px] font-semibold text-ink-soft ${index === 0 ? "" : "pt-3"}`}>{period}</h2>}
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
          <h3 className="text-xl font-semibold text-ink">아직 게시물이 없어요</h3>
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

      {/* 회원가입 유도 모달 */}
      <Dialog open={showSignupModal} onOpenChange={setShowSignupModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>더 많은 레시피를 만나보세요</DialogTitle>
            <DialogDescription>
              회원가입하고 나만의 레시피를 저장하고 공유해보세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Link href="/signup" className="flex-1">
              <Button className="w-full">회원가입</Button>
            </Link>
            <Link href="/login" className="flex-1">
              <Button variant="outline" className="w-full">로그인</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 