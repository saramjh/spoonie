"use client"

import { usePathname } from "next/navigation"
import BottomNavBar from "./BottomNavBar"
import Header from "./Header"
import { usePullToRefresh } from "@/hooks/usePullToRefresh"
import { canPullToRefresh } from "@/shared/lib/pull-to-refresh-route"
import { SamsungInstallNotice } from "@/components/install/InstallApp"

// Unmatched top-level URLs should render the existing not-found page without
// a redundant global header or bottom navigation. Known sections keep their
// established chrome and nested 404s are already covered by SUB_SCREEN.
const KNOWN_ROOT = new Set(["", "recipes", "posts", "profile", "search", "topics", "bookmarks", "magazine", "notifications", "login", "signup", "forgot-password", "reset-password", "partners", "legal", "offline", "early-cooks"])

const SUB_SCREEN = /^\/(?:(?:recipes|posts)\/[^/]+|profile\/[^/]+\/edit|offline|magazine(?:\/[^/]*)?|legal\/(?:terms|privacy|policy))(?:\/|$)/

export default function AppWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()

	const { PullToRefreshIndicator, pullDistance } = usePullToRefresh(canPullToRefresh(pathname))

	// 앱 머리 막대(로고·저장·알림)는 맨 위 단계 화면(홈·레시피북·검색·프로필)에만.
	// 상세·작성·수정은 개별 뒤로가기를 사용한다. 저장·알림은 목업의 전역 로고 막대를 재사용한다.
	const isPartnerLanding = pathname === "/partners" || pathname.startsWith("/partners/")
	const isFocusedAuth = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname === "/reset-password"
	const isUnknownRoot = !KNOWN_ROOT.has(pathname.split("/")[1] ?? "")
	const noHeader = isUnknownRoot || SUB_SCREEN.test(pathname) || isPartnerLanding || isFocusedAuth

	const noBottomNav = isUnknownRoot || isFocusedAuth || isPartnerLanding || /^\/profile\/[^/]+\/edit(?:\/|$)/.test(pathname) || (pathname.startsWith("/recipes/") && pathname !== "/recipes") || (pathname.startsWith("/posts/") && pathname !== "/posts")

	// 당기는 동안만 화면을 내린다. 평소에 transform을 두면 안쪽 fixed 요소의 기준이 바뀌고, 전환 효과는 손가락보다 늦게 따라온다
	const wrapperStyle = pullDistance ? { transform: `translateY(${pullDistance}px)` } : undefined

	return (
		<div className={`relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-paper`}>
			<PullToRefreshIndicator />
			<div style={wrapperStyle} className="relative flex flex-col w-full">
				{!noHeader && <Header />}
				<main className="flex-1 w-full">
					{pathname === "/" && <SamsungInstallNotice />}
					<div className={`${!noBottomNav ? "pb-16" : ""}`}>{children}</div>
				</main>
			</div>
			{!noBottomNav && <BottomNavBar />}
		</div>
	)
}