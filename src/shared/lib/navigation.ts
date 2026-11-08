"use client"

import { useMemo } from "react"
import { useRouter as useNextRouter } from "next/navigation"

/**
 * 화면 전환 시작을 알리는 이벤트. NavigationProgress가 받아서 상단 진행 막대를 켠다.
 * 링크 클릭과 뒤로 가기는 NavigationProgress가 직접 감지하고, 코드에서 호출하는
 * router.push/replace는 이 모듈의 useRouter를 통해 알린다.
 */
export const NAVIGATION_START_EVENT = "spoonie:navigation-start"

const APP_BACK = "spoonieCanGoBack"
const browserNavigation = () => (window as Window & { navigation?: { canGoBack: boolean } }).navigation

// Navigation API가 없는 브라우저에서는 앱에서 추가한 기록에만 뒤로 갈 수 있다고 표시한다.
// replace는 현재 기록의 표시를 유지하며, 브라우저가 뒤로 갈 때 해당 기록의 표시를 복원한다.
if (typeof window !== "undefined" && !browserNavigation()) {
  const { history } = window
  const pushState = history.pushState.bind(history)
  const replaceState = history.replaceState.bind(history)

  history.pushState = (state, unused, url) => {
    pushState(state && typeof state === "object" ? { ...state, [APP_BACK]: true } : state, unused, url)
  }
  history.replaceState = (state, unused, url) => {
    const canGoBack = history.state?.[APP_BACK] === true
    replaceState(state && typeof state === "object" ? { ...state, [APP_BACK]: canGoBack } : state, unused, url)
  }
}

function signalNavigationStart(href: string) {
  if (typeof window === "undefined") return
  try {
    const target = new URL(href, window.location.href)
    const current = window.location
    if (target.origin !== current.origin) return
    if (target.pathname === current.pathname && target.search === current.search) return
  } catch {
    return
  }
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT))
}

/** 앱의 화면 전환과 내부 뒤로 가기를 처리하는 Next.js 라우터. */
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
        const canGoBack = browserNavigation()?.canGoBack ?? (window.history.state?.[APP_BACK] === true)
        if (canGoBack) {
          router.back()
        } else {
          signalNavigationStart("/")
          router.replace("/")
        }
      },
    }),
    [router]
  )
}
