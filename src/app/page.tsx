"use client"

import FeedList from "@/components/feed/FeedList"

export default function HomePage() {
	console.log("🏠 HomePage: Rendering...")

	try {
		return (
			<div>
				<FeedList />
			</div>
		)
	} catch (error) {
		console.error("💥 HomePage: Error occurred:", error)
		return (
			<div className="p-4 text-center">
				<p className="text-red-500">홈 페이지 로딩 중 오류가 발생했습니다.</p>
			</div>
		)
	}
}
