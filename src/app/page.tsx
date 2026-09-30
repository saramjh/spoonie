import { Metadata } from 'next'
import SeamlessItemList from "@/components/items/SeamlessItemList"
import { getInitialFeedData } from "@/lib/server-data"

// 🔧 동적 라우팅 강제 (개인화된 피드 때문에)
export const dynamic = 'force-dynamic'

// 🚀 홈페이지 SEO 최적화 (TBWA 가이드 적용)
export const metadata: Metadata = {
  title: "스푸니 - 레시피 공유 플랫폼 | 홈쿠킹 커뮤니티",
  description: "맛있는 레시피와 요리 이야기를 공유하세요. 개인 레시피북 관리, 요리법 검색, 팔로우 기능으로 요리 커뮤니티에 참여하세요. 지금 바로 시작해보세요!",
  keywords: "레시피 공유, 요리 커뮤니티, 홈쿠킹, 요리법, 레시피북, 요리 레시피, 음식, 요리 일상, 레시피드",
  
  openGraph: {
    title: "스푸니 - 레시피 공유 플랫폼",
    description: "맛있는 레시피와 요리 이야기를 공유하는 커뮤니티에 참여하세요.",
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr',
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'}/logo-full.svg`,
        width: 1200,
        height: 630,
        alt: "스푸니 - 레시피 공유 플랫폼",
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: "스푸니 - 레시피 공유 플랫폼",
    description: "맛있는 레시피와 요리 이야기를 공유하는 커뮤니티",
    images: [`${process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'}/logo-full.svg`],
  },

  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr',
  },
}

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
		
		

		return (
			<div className="min-h-screen bg-gray-50">
				<h1 className="sr-only">스푸니 - 레시피와 요리 이야기를 나누는 커뮤니티</h1>
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
