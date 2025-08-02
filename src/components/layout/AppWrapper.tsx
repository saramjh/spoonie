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

	// 페이지별 배경색 설정
	const isRecipeBook = pathname === "/recipes"
	const isSearchPage = pathname === "/search"
	const isHomePage = pathname === "/"
	
	// 컨테이너 배경 (최외곽) - 홈화면도 gray-50으로 통일하여 마진 일관성 확보
	const containerBg = (isRecipeBook || isHomePage) ? "bg-gray-50" : "bg-white"
	
	// 메인 영역 배경 (컨텐츠 영역)
	const mainBg = isRecipeBook ? "bg-gray-50" : isSearchPage ? "bg-white" : "bg-gray-50"

	return (
		<div className={`relative flex flex-col h-screen w-full max-w-md mx-auto ${containerBg} overflow-hidden`}>
			<PullToRefreshIndicator />
			<div style={wrapperStyle} className="relative flex flex-col w-full h-full">
				{!noHeader && <Header />}
				<main className={`flex-1 w-full overflow-y-auto ${mainBg}`}>
					<div className={`h-full ${!noBottomNav ? "pb-16" : ""}`}>{children}</div>
				</main>
			</div>
			{!noBottomNav && <BottomNavBar />}
		</div>
	)
}