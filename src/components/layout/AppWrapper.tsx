"use client"

import { usePathname } from "next/navigation"
import BottomNavBar from "./BottomNavBar"
import Header from "./Header"
import { usePullToRefresh } from "@/hooks/usePullToRefresh"

const SUB_SCREEN = /^\/(?:(?:recipes|posts)\/[^/]+|bookmarks|notifications|profile\/[^/]+\/edit)(?:\/|$)/

export default function AppWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()

	const { PullToRefreshIndicator, pullDistance } = usePullToRefresh()

	// 앱 머리 막대(로고·저장·알림)는 맨 위 단계 화면(홈·레시피북·검색·프로필)에만.
	// 상세·작성·수정·저장한 글·알림은 자기 머리 막대(뒤로·제목) 하나만 둔다 (두 겹이면 112px를 쓴다)
	const noHeader = SUB_SCREEN.test(pathname)

	const noBottomNav = (pathname.startsWith("/recipes/") && pathname !== "/recipes") || (pathname.startsWith("/posts/") && pathname !== "/posts")

	const wrapperStyle = {
		transform: `translateY(${pullDistance}px)`,
		transition: 'transform 0.2s ease-out',
	};

	return (
		<div className={`relative flex flex-col min-h-screen w-full max-w-md mx-auto door-surface`}>
			<PullToRefreshIndicator />
			<div style={wrapperStyle} className="relative flex flex-col w-full">
				{!noHeader && <Header />}
				<main className="flex-1 w-full">
					<div className={`${!noBottomNav ? "pb-16" : ""}`}>{children}</div>
				</main>
			</div>
			{!noBottomNav && <BottomNavBar />}
		</div>
	)
}