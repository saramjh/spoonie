"use client"

import { useRef } from "react"
import { usePathname } from "next/navigation"
import BottomNavBar from "./BottomNavBar"
import Header from "./Header"
import { usePullToRefresh } from "@/hooks/usePullToRefresh.tsx"

export default function AppWrapper({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()

	const { PullToRefreshIndicator, pullDistance } = usePullToRefresh()

	const noHeader = [
    "/recipes/new",
    "/posts/new",
  ].includes(pathname) || pathname.match(/^\/recipes\/.+\/edit$/) || pathname.match(/^\/posts\/.+\/edit$/)

	const noBottomNav = pathname.startsWith("/recipes/") || pathname.startsWith("/posts/")

	const wrapperStyle = {
		transform: `translateY(${pullDistance}px)`,
		transition: 'transform 0.2s ease-out',
	};

	return (
		<div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-white overflow-hidden">
			<PullToRefreshIndicator />
			<div style={wrapperStyle} className="relative flex flex-col w-full h-full">
				{!noHeader && <Header />}
				<main className="flex-1 w-full overflow-y-auto bg-gray-50">
					<div className={`flex-1 ${!noBottomNav ? "pb-16" : ""}`}>{children}</div>
				</main>
			</div>
			{!noBottomNav && <BottomNavBar />}
		</div>
	)
}