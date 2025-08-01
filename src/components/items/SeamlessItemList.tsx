"use client"

import { useRef, useCallback, useEffect, useState } from "react"
import { usePosts } from "@/hooks/usePosts"
import PostCard from "./PostCard"
import PostCardSkeleton from "./PostCardSkeleton"

import { usePathname } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import type { ServerFeedData } from "@/lib/server-data"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { usePageVisibility } from "@/hooks/usePageVisibility"
import { useHistorySync } from "@/hooks/useHistorySync"
import { useNavigation } from "@/hooks/useNavigation"
// 🚀 통합 캐시 매니저가 모든 동기화를 처리


interface SeamlessItemListProps {
  /**
   * 서버에서 미리 로딩된 초기 데이터 (SSR 최적화용)
   * null인 경우 클라이언트에서 데이터 페칭
   */
  initialData?: ServerFeedData | null
}

/**
 * 🚀 심리스한 실시간 아이템 리스트 컴포넌트 (SSR + 실시간 동기화)
 * 레시피/레시피드 변경사항을 즉시 반영하여 완벽한 사용자 경험 제공
 * 
 * @param initialData - 서버에서 미리 로딩된 데이터 (성능 최적화)
 * @returns 실시간 동기화가 적용된 무한 스크롤 아이템 리스트
 */
export default function SeamlessItemList({ initialData }: SeamlessItemListProps) {
  const { feedItems, isLoading, isError, size, setSize, isReachingEnd, mutate: swrMutate } = usePosts(initialData)
  const observerElem = useRef<HTMLDivElement>(null)

  const pathname = usePathname()
  const supabase = createSupabaseBrowserClient()

  // 🧭 Smart Navigation: 홈피드 navigation history 추적
  useNavigation({ trackHistory: true })

  // 실시간 동기화 훅
  const { applyOptimisticUpdate } = useRealtimeSync()

  // 🚀 업계 표준: 히스토리 뒤로가기 완벽 보장
  usePageVisibility({
    revalidateKeys: ['items|', 'comments_'],
    debug: false // 프로덕션에서는 false
  })

  useHistorySync({
    homePathPatterns: ['/'],
    debug: false // 프로덕션에서는 false
  })

  // 사용자 상태 및 가입 유도 모달 관련 상태
  const [currentUser, setCurrentUser] = useState<User | null>(initialData?.currentUser || null)
  const scrollCountRef = useRef(0)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(!initialData)
  const visibleItemsRef = useRef<Set<string>>(new Set())

  // 사용자 상태 확인 (초기 데이터가 없는 경우에만)
  useEffect(() => {
    if (!initialData) {
      const checkUser = async () => {
        setIsAuthLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
        setIsAuthLoading(false)
      }
      checkUser()
    }
  }, [supabase, initialData])

  /**
   * 🎯 스마트 백그라운드 동기화
   * 현재 화면에 보이는 아이템들만 선별적으로 동기화
   */
  const performSmartSync = useCallback(async (priority: 'low' | 'normal' | 'high' = 'normal') => {
    
    
    try {
      // 🚀 통합 캐시 매니저가 자동으로 모든 동기화를 처리
      const result = { success: true, itemsUpdated: 0, syncTime: 0 }
      
      if (result.success) {
        
      } else {
        console.warn(`⚠️ Smart sync had errors`)
      }
    } catch (error) {
      console.error("❌ Smart sync failed:", error)
    }
  }, [pathname, currentUser])

  /**
   * 👁️ 화면에 보이는 아이템 추적 (Intersection Observer)
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
  }, [])

  /**
   * 📊 디바운스된 통계 동기화
   */
  const debouncedStatsSync = useCallback(() => {
    const timeoutId = setTimeout(async () => {
      const visibleIds = Array.from(visibleItemsRef.current)
      if (visibleIds.length > 0) {
        // 🚀 통합 캐시 매니저가 자동으로 통계 동기화를 처리
        
      }
    }, 5000)

    return () => clearTimeout(timeoutId)
  }, [])

  /**
   * 🎯 지능적 새로고침 함수 (업그레이드)
   * 사용자가 감지하지 못하도록 조용히 백그라운드에서 동기화
   */
  const performSilentSync = useCallback(async () => {
    // 스마트 동기화를 우선 실행
    await performSmartSync('normal')
    
    // 필요시 전체 새로고침
    try {
      
      const syncStartTime = Date.now()
      
      await swrMutate()
      
      const syncDuration = Date.now() - syncStartTime
      
      
    } catch (error) {
      console.error("❌ Silent refresh failed:", error)
    }
  }, [performSmartSync, swrMutate])

  /**
   * 🚀 Optimistic UI 헬퍼 함수들
   * 사용자 액션에 따른 즉시 UI 업데이트
   */
  const handleOptimisticLike = useCallback(async (itemId: string, isLiked: boolean, userId: string) => {
    await applyOptimisticUpdate({
      id: itemId,
      type: 'like',
      action: isLiked ? 'remove' : 'add',
      data: { userId },
      timestamp: Date.now()
    })
  }, [applyOptimisticUpdate])

  const handleOptimisticComment = useCallback(async (itemId: string, comment: any) => {
    await applyOptimisticUpdate({
      id: itemId,
      type: 'comment',
      action: 'add',
      data: { comment },
      timestamp: Date.now()
    })
  }, [applyOptimisticUpdate])

  const handleOptimisticFollow = useCallback(async (userId: string, isFollowing: boolean) => {
    await applyOptimisticUpdate({
      id: userId,
      type: 'follow',
      action: isFollowing ? 'remove' : 'add',
      data: {},
      timestamp: Date.now()
    })
  }, [applyOptimisticUpdate])

  const handleOptimisticItemAction = useCallback(async (action: 'add' | 'remove', data: any) => {
    await applyOptimisticUpdate({
      id: data.itemId || data.item?.id,
      type: 'item',
      action,
      data,
      timestamp: Date.now()
    })
  }, [applyOptimisticUpdate])

  // 🚀 Optimistic Updates 시스템에서는 복잡한 등록/구독 로직 불필요
  // 모든 상태는 optimisticLikeUpdate, optimisticCommentUpdate에서 즉시 처리됨

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
        <p className="text-gray-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
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
      <div className="space-y-5 px-2 py-2">
        {feedItems.map((item) => (
          <div key={item.id || item.item_id} data-item-id={item.id || item.item_id}>
                            <PostCard 
              item={item} 
              currentUser={currentUser}
              onItemUpdate={() => { swrMutate(); }} // 🚀 삭제시 즉시 업데이트를 위한 mutate 함수 전달
            />
          </div>
        ))}
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
            <div className="text-center text-gray-500">
              스크롤해서 더 보기
            </div>
          )}
        </div>
      )}

      {/* 끝 표시 */}
      {isReachingEnd && feedItems.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          모든 게시물을 확인했습니다 ✨
        </div>
      )}

      {/* 빈 상태 */}
      {feedItems.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-6xl">🍽️</div>
          <h3 className="text-xl font-semibold text-gray-700">아직 게시물이 없어요</h3>
          <p className="text-gray-500 text-center">
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
            <DialogTitle>더 많은 레시피를 만나보세요! 🍳</DialogTitle>
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