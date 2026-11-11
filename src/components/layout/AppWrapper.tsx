"use client"

import { usePathname } from "next/navigation"
import BottomNavBar from "./BottomNavBar"
import Header from "./Header"
import SiteFooter from "./SiteFooter"
import { usePullToRefresh } from "@/hooks/usePullToRefresh"
import { canPullToRefresh } from "@/shared/lib/pull-to-refresh-route"
import { SamsungInstallNotice } from "@/components/install/InstallApp"

const SUB_SCREEN = /^\/(?:(?:recipes|posts)\/[^/]+|profile\/[^/]+\/edit|offline|magazine(?:\/[^/]*)?|legal\/(?:terms|privacy|policy))(?:\/|$)/

export default function AppWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()

	const { PullToRefreshIndicator, pullDistance } = usePullToRefresh(canPullToRefresh(pathname))

	// 앱 머리 막대(로고·저장·알림)는 맨 위 단계 화면(홈·레시피북·검색·프로필)에만.
	// 상세·작성·수정은 개별 뒤로가기를 사용한다. 저장·알림은 목업의 전역 로고 막대를 재사용한다.
	const isPartnerLanding = pathname === "/partners" || pathname.startsWith("/partners/")
	const isFocusedAuth = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname === "/reset-password"
	const noHeader = SUB_SCREEN.test(pathname) || isPartnerLanding || isFocusedAuth

	const noBottomNav = isFocusedAuth || isPartnerLanding || /^\/profile\/[^/]+\/edit(?:\/|$)/.test(pathname) || (pathname.startsWith("/recipes/") && pathname !== "/recipes") || (pathname.startsWith("/posts/") && pathname !== "/posts")

	// 당기는 동안만 화면을 내린다. 평소에 transform을 두면 안쪽 fixed 요소의 기준이 바뀌고, 전환 효과는 손가락보다 늦게 따라온다
	const wrapperStyle = pullDistance ? { transform: `translateY(${pullDistance}px)` } : undefined

	return (
		<div className="group/app-shell relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-paper [&:has([data-app-not-found])_[data-app-chrome]]:hidden">
			<PullToRefreshIndicator />
			<div style={wrapperStyle} className="relative flex min-h-screen flex-col w-full">
				{!noHeader && <Header />}
				<main className="flex-1 w-full">
					{pathname === "/" && <SamsungInstallNotice />}
					<div className={noBottomNav ? undefined : "pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] group-has-[[data-app-not-found]]/app-shell:pb-0"}>{children}</div>
				</main>
				{!isFocusedAuth && !isPartnerLanding && <SiteFooter hasBottomNav={!noBottomNav} />}
			</div>
			{!noBottomNav && <BottomNavBar />}
		</div>
	)
}