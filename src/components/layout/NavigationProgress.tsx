"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { NAVIGATION_START_EVENT } from "@/shared/lib/navigation"
import { hasAppHeader } from "@/shared/lib/app-chrome-route"
import { RouteTransitionLoading } from "@/components/common/RouteLoading"
import { Skeleton } from "@/components/ui/skeleton"

// 이동이 끝나지 않는 경우(같은 주소로 이동, 오류 등)에도 막대가 남지 않도록 하는 상한
const MAX_VISIBLE_MS = 10000

/** Keep the top progress cue, but immediately replace stale content with a destination skeleton until the route commits. */
export default function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState<number | null>(null)
  const [pendingRoute, setPendingRoute] = useState<{ pathname: string; top: number; needsHeader: boolean } | null>(null)
  const timers = useRef<{ tick?: ReturnType<typeof setInterval>; limit?: ReturnType<typeof setTimeout> }>({})

  const clearTimers = () => {
    clearInterval(timers.current.tick)
    clearTimeout(timers.current.limit)
  }

  const finish = () => {
    clearTimers()
    setPendingRoute(null)
    setProgress((p) => (p === null ? null : 100))
  }

  const start = (href?: string) => {
    clearTimers()
    let nextPath: string | null = null
    if (href) {
      try {
        const target = new URL(href, window.location.href)
        // Query-only updates keep the current form/list instead of flashing a full skeleton.
        if (target.origin === window.location.origin && target.pathname !== renderedLocation.current.split("?")[0]) {
          nextPath = target.pathname
        }
      } catch { /* The router will report invalid destinations. */ }
    }
    const header = document.querySelector("header[data-app-chrome]")
    const headerTop = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0
    const showHeader = Boolean(nextPath && hasAppHeader(nextPath))
    setPendingRoute(nextPath ? {
      pathname: nextPath,
      top: showHeader ? headerTop : 0,
      needsHeader: showHeader && headerTop === 0,
    } : null)
    setProgress(8)
    // 끝을 알 수 없으므로 90%에 점점 가까워지게만 올린다
    timers.current.tick = setInterval(() => {
      setProgress((p) => (p === null ? null : p + (90 - p) * 0.08))
    }, 200)
    timers.current.limit = setTimeout(finish, MAX_VISIBLE_MS)
  }

  // 주소가 바뀌면 이동 완료: 렌더 중에 한 번만 맞춘다 (effect에서 바꾸면 렌더가 한 번 더 일어난다)
  const query = searchParams?.toString()
  const location = pathname + (query ? `?${query}` : "")
  const [seenLocation, setSeenLocation] = useState(location)
  if (location !== seenLocation) {
    setSeenLocation(location)
    if (progress !== null) setProgress(100)
    if (pendingRoute !== null) setPendingRoute(null)
  }

  // 마지막으로 화면에 그려진 주소. 이미 새 화면이 그려진 뒤 도착한 뒤로 가기 이벤트로 막대를 켜지 않기 위해 쓴다.
  const renderedLocation = useRef(location)
  useEffect(() => {
    renderedLocation.current = location
  }, [location])

  // 다 차면 진행 타이머를 멈추고 잠깐 뒤에 감춘다
  useEffect(() => {
    if (progress !== 100) return
    clearInterval(timers.current.tick)
    clearTimeout(timers.current.limit)
    const hide = setTimeout(() => setProgress(null), 250)
    return () => clearTimeout(hide)
  }, [progress])

  useEffect(() => {
    const onStart = (event: Event) => start((event as CustomEvent<{ href?: string }>).detail?.href)

    // 내부 링크 클릭 감지 (Next Link 포함)
    const onClick = (event: MouseEvent) => {
      // window 버블 단계에서 감지한다.
      // - Next Link는 preventDefault만 호출하므로 여기까지 도달한다 (defaultPrevented는 무시).
      // - 좋아요/북마크처럼 링크 안에서 stopPropagation으로 이동을 막은 클릭은 여기 도달하지 않는다.
      if (event.button !== 0 || event.cancelBubble) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.("a")
      if (!anchor || !anchor.href) return
      if (anchor.target && anchor.target !== "_self") return
      if (anchor.hasAttribute("download")) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      start(url.pathname + url.search)
    }

    // 뒤로/앞으로 가기. 캐시된 화면은 이벤트 처리 중에 이미 그려질 수 있으므로 그 경우는 건너뛴다.
    const onPopState = () => {
      const { pathname: path, search } = window.location
      if (path + search === renderedLocation.current) return
      start(path + search)
    }

    window.addEventListener(NAVIGATION_START_EVENT, onStart)
    window.addEventListener("click", onClick)
    window.addEventListener("popstate", onPopState)
    return () => {
      window.removeEventListener(NAVIGATION_START_EVENT, onStart)
      window.removeEventListener("click", onClick)
      window.removeEventListener("popstate", onPopState)
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (progress === null) return null

  return (
    <>
      {progress < 100 && pendingRoute && (
        <div
          data-route-feedback
          className="fixed inset-x-0 bottom-0 z-[45] mx-auto w-full max-w-md overflow-hidden bg-paper"
          style={{ top: pendingRoute.top }}
        >
          {pendingRoute.needsHeader && (
            <div className="flex h-[54px] items-center justify-between border-b border-border px-4" aria-hidden="true">
              <Skeleton className="h-7 w-24" />
              <div className="flex gap-3"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div>
            </div>
          )}
          <RouteTransitionLoading pathname={pendingRoute.pathname} />
        </div>
      )}
      <div aria-hidden="true" data-nav-progress className="pointer-events-none fixed inset-x-0 top-0 z-[110] h-[3px]">
        <div
          className="h-full bg-brand transition-[width,opacity] duration-200 ease-out"
          style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
        />
      </div>
    </>
  )
}
