"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID || "ca-pub-4410729598083068"

/**
 * 애드센스 스크립트는 사람이 읽을 콘텐츠가 있는 화면에서만 싣는다.
 * 로그인·작성 폼·빈 알림처럼 콘텐츠가 없는 화면에 광고가 붙으면 애드센스 정책 위반
 * ("게시자 콘텐츠가 없는 화면에 Google 광고 게재")이 된다.
 * 한 번 실리면 다시 싣지 않는다 (화면 이동마다 스크립트를 추가하지 않는다).
 *
 * 지금은 꺼 두었다 (2026-10): 방문이 적은 시기에는 수익보다 첫인상·속도 손해가 크다.
 * 켜려면 NEXT_PUBLIC_ADSENSE_ENABLED=true. ads.txt와 애드센스 사이트 소유 확인은 그대로 둔다.
 */
const CONTENT_ROUTE = /^\/(?:$|search(?:\/|$)|recipes\/[0-9a-f-]{36}$|posts\/[0-9a-f-]{36}$|profile\/[^/]+$)/i

let loaded = false

export default function GoogleAdSense() {
	const pathname = usePathname()
	useEffect(() => {
		if (loaded || process.env.NEXT_PUBLIC_ADSENSE_ENABLED !== "true" || process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGS === "true") return
		if (!CONTENT_ROUTE.test(pathname)) return
		loaded = true
		if (document.querySelector('script[src*="adsbygoogle.js"]')) return
		const script = document.createElement("script")
		script.async = true
		script.crossOrigin = "anonymous"
		script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`
		document.head.appendChild(script)
	}, [pathname])
	return null
}
