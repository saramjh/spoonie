"use client"

import { useMemo } from "react"
import { useRouter as useNextRouter } from "next/navigation"

/**
 * 화면 전환 시작을 알리는 이벤트. NavigationProgress가 받아서 상단 진행 막대를 켠다.
 * 링크 클릭은 NavigationProgress가 직접 감지하고, 코드에서 호출하는 router.push/replace/back은
 * 이 모듈의 useRouter를 통해 알린다.
 */
export const NAVIGATION_START_EVENT = "spoonie:navigation-start"

export function signalNavigationStart(href?: string) {
  if (typeof window === "undefined") return
  if (href) {
    try {
      const target = new URL(href, window.location.href)
      const current = window.location
      if (target.origin !== current.origin) return
      if (target.pathname === current.pathname && target.search === current.search) return
    } catch {
      return
    }
  }
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT))
}

/** next/navigation의 useRouter와 같은 API. 이동 시작을 진행 막대에 알리는 것만 추가된다. */
export function useRouter(): ReturnType<typeof useNextRouter> {
  const router = useNextRouter()
  return useMemo(
    () => ({
      ...router,
      push: (href, options) => {
        signalNavigationStart(href)
        router.push(href, options)
      },
      replace: (href, options) => {
        signalNavigationStart(href)
        router.replace(href, options)
      },
      back: () => {
        signalNavigationStart()
        router.back()
      },
    }),
    [router]
  )
}
