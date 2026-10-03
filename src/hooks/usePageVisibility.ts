"use client"

import { useEffect } from "react"
import { revalidateStartingWith } from "@/shared/infra/swr-cache"

/**
 * 탭으로 돌아오면(다른 앱·탭에 있다가 다시 볼 때) 지정한 목록을 다시 받는다.
 * 화면에 떠 있는 목록만 실제로 요청이 나간다. 무한 스크롤 목록도 닿는다 (lib/swr-cache).
 * focus 이벤트는 듣지 않는다: 탭 복귀 때 visibilitychange와 함께 와서 같은 목록을 두 번 받게 된다.
 */
export function usePageVisibility({ revalidateKeys }: { revalidateKeys: string[] }) {
	const keys = revalidateKeys.join(",")
	useEffect(() => {
		const prefixes = keys.split(",")
		const onVisibilityChange = () => {
			if (!document.hidden) void revalidateStartingWith(prefixes)
		}
		document.addEventListener("visibilitychange", onVisibilityChange)
		return () => document.removeEventListener("visibilitychange", onVisibilityChange)
	}, [keys])
}
