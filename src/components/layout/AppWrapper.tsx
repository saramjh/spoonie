"use client"

import { usePathname } from "next/navigation"
import BottomNavBar from "./BottomNavBar"
import Header from "./Header"
import { usePullToRefresh } from "@/hooks/usePullToRefresh"

export default function AppWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()

	const { PullToRefreshIndicator, pullDistance } = usePullToRefresh()

	// ✅ 헤더는 항상 표시 (뒤로가기 + 브랜딩 + 위치 인식)
	const noHeader = false

	const noBottomNav = (pathname.startsWith("/recipes/") && pathname !== "/recipes") || (pathname.startsWith("/posts/") && pathname !== "/posts")

	const wrapperStyle = {
		transform: `translateY(${pullDistance}px)`,
		transition: 'transform 0.2s ease-out',
	};

	return (
		<div className={`relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-door`}>
			<PullToRefreshIndicator />
			<div style={wrapperStyle} className="relative flex flex-col w-full">
				{!noHeader && <Header />}
				<main className="flex-1 w-full bg-door">
					<div className={`${!noBottomNav ? "pb-16" : ""}`}>{children}</div>
				</main>
			</div>
			{!noBottomNav && <BottomNavBar />}
		</div>
	)
}