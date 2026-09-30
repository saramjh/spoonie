"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { NAVIGATION_START_EVENT } from "@/lib/navigation"

// 이동이 끝나지 않는 경우(같은 주소로 이동, 오류 등)에도 막대가 남지 않도록 하는 상한
const MAX_VISIBLE_MS = 10000

/**
 * 화면 상단의 얇은 진행 막대. 클릭 즉시 나타나 서버 응답을 기다리는 동안 앱이 반응하고 있음을 보여준다.
 */
export default function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState<number | null>(null)
  const timers = useRef<{ tick?: ReturnType<typeof setInterval>; limit?: ReturnType<typeof setTimeout>; hide?: ReturnType<typeof setTimeout> }>({})

  const clearTimers = () => {
    clearInterval(timers.current.tick)
    clearTimeout(timers.current.limit)
    clearTimeout(timers.current.hide)
  }

  const finish = () => {
    clearTimers()
    setProgress((p) => (p === null ? null : 100))
    timers.current.hide = setTimeout(() => setProgress(null), 250)
  }

  const start = () => {
    clearTimers()
    setProgress(8)
    // 끝을 알 수 없으므로 90%에 점점 가까워지게만 올린다
    timers.current.tick = setInterval(() => {
      setProgress((p) => (p === null ? null : p + (90 - p) * 0.08))
    }, 200)
    timers.current.limit = setTimeout(finish, MAX_VISIBLE_MS)
  }

  // 마지막으로 화면에 그려진 주소. 이미 새 화면이 그려진 뒤 도착한 이벤트로 막대를 켜지 않기 위해 쓴다.
  const renderedLocation = useRef("")

  // 주소가 바뀌면 이동 완료
  useEffect(() => {
    const query = searchParams?.toString()
    renderedLocation.current = pathname + (query ? `?${query}` : "")
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  useEffect(() => {
    const onStart = () => start()

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
      start()
    }

    // 뒤로/앞으로 가기. 캐시된 화면은 이벤트 처리 중에 이미 그려질 수 있으므로 그 경우는 건너뛴다.
    const onPopState = () => {
      const { pathname: path, search } = window.location
      if (path + search === renderedLocation.current) return
      start()
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
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[110] h-[3px]">
      <div
        className="h-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  )
}
