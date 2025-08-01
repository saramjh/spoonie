import SeamlessItemList from "@/components/items/SeamlessItemList"
import { getInitialFeedData } from "@/lib/server-data"
import { Suspense } from "react"
import PostCardSkeleton from "@/components/items/PostCardSkeleton"

/**
 * 🚀 홈 페이지 (Server Component + 실시간 동기화)
 * 서버에서 초기 피드 데이터를 미리 로딩하고 실시간 동기화로 심리스한 경험 제공
 * 레시피(recipe)와 레시피드(post)를 통합한 피드를 표시합니다
 */
export default async function HomePage() {
	try {
		// 🏃‍♂️ 서버에서 초기 데이터 미리 로딩 (3번 요청 → 1번으로 통합)
		const initialData = await getInitialFeedData()
		
		console.log(`🏠 HomePage: Server rendered with ${initialData.items.length} items`)

		return (
			<div className="min-h-screen bg-gray-50">
				<Suspense fallback={<ItemListSkeleton />}>
					<SeamlessItemList initialData={initialData} />
				</Suspense>
			</div>
		)
	} catch (error) {
		console.error("❌ HomePage: Server rendering error:", error)
		
		// 서버 에러 시 클라이언트에서 재시도 가능한 폴백
		return (
			<div className="min-h-screen bg-gray-50">
				<SeamlessItemList initialData={null} />
			</div>
		)
	}
}

/**
 * 로딩 스켈레톤 컴포넌트
 */
function ItemListSkeleton() {
	return (
		<div className="space-y-4 p-4">
			{Array.from({ length: 6 }).map((_, i) => (
				<PostCardSkeleton key={i} />
			))}
		</div>
	)
}
