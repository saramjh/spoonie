"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

// 인증 폼의 기본 HTML 제출(GET)이 React 초기화 전에 비밀번호를 URL에 싣지 않도록 한다.
export function useHydrationReady(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false)
}
