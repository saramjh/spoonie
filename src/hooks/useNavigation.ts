"use client"

import { useCallback } from "react"
import { usePathname } from "next/navigation"
import { useRouter } from "@/shared/lib/navigation"
import { previousPath } from "@/shared/lib/surface"

/**
 * 작성·수정 화면을 마친 뒤 돌아갈 곳을 정한다. 공개 상세 링크는 canonical 경로를 쓴다.
 * 직전 화면은 ClientLayoutWrapper가 기억한다 (lib/surface).
 */

// 주소의 ?from= 이 가장 정확하다. 없으면 직전 화면으로 정한다
function returnPathFor(currentPath: string): string {
	const from = new URLSearchParams(window.location.search).get("from")
	if (from) return decodeURIComponent(from)

	const last = previousPath(currentPath)
	if (!last) return "/"
	if (last === "/recipes" || last.startsWith("/recipes?")) return "/recipes"
	if (last.startsWith("/profile/") || last.startsWith("/search")) return last
	return "/"
}

export function useNavigation() {
	const router = useRouter()
	const pathname = usePathname()

	// 수정을 마친 경우(replace)는 수정 화면을 기록에서 지운다
	const navigateBack = useCallback(
		(_itemId?: string, options?: { replace?: boolean }) => {
			const target = returnPathFor(window.location.pathname)
			if (options?.replace) router.replace(target)
			else router.push(target)
		},
		[router]
	)

	const createLinkWithOrigin = useCallback(
		(path: string, currentPath?: string): string => {
			// 공개 링크에는 이동 상태를 붙이지 않는다. 편집 경로는 기존 복귀 정보를 유지한다.
			if (/^\/(?:(?:recipes|posts)\/[0-9a-f-]{36}|profile\/[^/?#]+)\/?(?:[?#]|$)/i.test(path)) return path
			const origin = currentPath || pathname
			if (!origin || origin === path) return path
			const separator = path.includes("?") ? "&" : "?"
			return `${path}${separator}from=${encodeURIComponent(origin)}`
		},
		[pathname]
	)

	return { navigateBack, createLinkWithOrigin }
}
