import { Metadata } from 'next'
import SeamlessItemList from "@/components/items/SeamlessItemList"
import { getPublicFeedData } from "@/lib/server-data"

// 동적 라우팅 강제 (개인화된 피드 때문에)
// 홈 HTML은 공개 피드로 정적 생성해 CDN에서 바로 보낸다 (스플래시가 즉시 보이도록).
// 5분마다 다시 만든다(엣지 캐시가 오래 남아 첫 접속이 빠르다). 새 글과 로그인 사용자 정보는 클라이언트가 스플래시 동안 채운다.
export const revalidate = 300

// 홈페이지 SEO 최적화 (TBWA 가이드 적용)
export const metadata: Metadata = {
  title: "스푸니 - 레시피 공유 플랫폼 | 홈쿠킹 커뮤니티",
  description: "맛있는 레시피와 요리 이야기를 공유하세요. 개인 레시피북 관리, 요리법 검색, 팔로우 기능으로 요리 커뮤니티에 참여하세요.",
  keywords: "레시피 공유, 요리 커뮤니티, 홈쿠킹, 요리법, 레시피북, 요리 레시피, 음식, 요리 일상, 레시피드",
  
  openGraph: {
    siteName: '스푸니',
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
import { serializeJsonLd } from "@/lib/json-ld"

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "스푸니",
  alternateName: ["Spoonie"],
  url: (process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr") + "/",
}
import PostCardSkeleton from "@/components/items/PostCardSkeleton"

/**
 * 홈 페이지 (Server Component + 실시간 동기화)
 * 서버에서 초기 피드 데이터를 미리 로딩하고 실시간 동기화로 심리스한 경험 제공
 * 레시피(recipe)와 레시피드(post)를 통합한 피드를 표시합니다
 */
export default async function HomePage() {
	try {
		// 서버에서 초기 데이터 미리 로딩 (3번 요청 → 1번으로 통합)
		const initialData = await getPublicFeedData()
		
		

		return (
			<div className="min-h-screen">
				<h1 className="sr-only">스푸니 - 레시피와 요리 이야기를 나누는 커뮤니티</h1>
				{/* Google 검색 결과의 사이트 이름 */}
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteSchema) }} />
				<Suspense fallback={<ItemListSkeleton />}>
					<SeamlessItemList initialData={initialData} />
				</Suspense>
			</div>
		)
	} catch (error) {
		console.error("❌ HomePage: Server rendering error:", error)
		
		// 서버 에러 시 클라이언트에서 재시도 가능한 폴백
		return (
			<div className="min-h-screen">
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
