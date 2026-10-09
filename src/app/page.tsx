import { Metadata } from 'next'
import SeamlessItemList from "@/components/items/SeamlessItemList"
import { getPublicFeedData } from "@/features/feed/data/server-data"

// 홈 HTML은 공개 피드로 정적 생성해 CDN에서 바로 보낸다 (스플래시가 즉시 보이도록).
// 5분마다 다시 만든다(엣지 캐시가 오래 남아 첫 접속이 빠르다). 새 글과 로그인 사용자 정보는 클라이언트가 스플래시 동안 채운다.
export const revalidate = 300

export const metadata: Metadata = {
  title: "Spoonie - 레시피 공유 플랫폼 | 홈쿠킹 커뮤니티",
  description: "맛있는 레시피와 요리 이야기를 공유하세요. 개인 레시피북 관리, 요리법 검색, 팔로우 기능으로 요리 커뮤니티에 참여하세요.",
  keywords: "레시피 공유, 요리 커뮤니티, 홈쿠킹, 요리법, 레시피북, 요리 레시피, 음식, 요리 일상, 레시피드",
  
  openGraph: {
    siteName: 'Spoonie',
    title: "Spoonie - 레시피 공유 플랫폼",
    description: "맛있는 레시피와 요리 이야기를 공유하는 커뮤니티에 참여하세요.",
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr',
    type: 'website',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'}/og-default.png`,
        width: 1200,
        height: 630,
        alt: "Spoonie - 레시피 공유 플랫폼",
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: "Spoonie - 레시피 공유 플랫폼",
    description: "맛있는 레시피와 요리 이야기를 공유하는 커뮤니티",
    images: [`${process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'}/og-default.png`],
  },

  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr',
  },
}

import { Suspense } from "react"
import { serializeJsonLd } from "@/shared/lib/json-ld"

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Spoonie",
  alternateName: ["스푸니"], // 화면 표기는 Spoonie. 한국어로 검색한 사람도 찾도록 별칭만 둔다
  url: (process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr") + "/",
  inLanguage: "ko",
  publisher: { "@id": (process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr") + "/#organization" },
}

// 서비스 운영 주체: 검색·AI가 Spoonie를 하나의 브랜드로 묶어 보도록 공식 인스타그램을 연결한다
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": (process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr") + "/#organization",
  name: "Spoonie",
  alternateName: ["스푸니"],
  url: (process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr") + "/",
  logo: (process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr") + "/android-chrome-512x512.png",
  sameAs: ["https://www.instagram.com/spoonie.kitchen/"],
}
import PostCardSkeleton from "@/components/items/PostCardSkeleton"

export default async function HomePage() {
	// 서버에서 공개 피드 첫 페이지를 받아 HTML에 넣는다. 실패하면 브라우저가 이어서 받는다
	const initialData = await getPublicFeedData().catch((error) => {
		console.error("❌ HomePage: initial feed failed:", error)
		return null
	})

	return (
		<div className="min-h-screen">
			<h1 className="sr-only">Spoonie - 레시피와 요리 이야기를 나누는 커뮤니티</h1>
			<a href="/early-cooks" className="mx-3 my-3 flex min-h-16 items-center justify-between gap-3 rounded-[3px] bg-paper px-4 py-3 text-ink shadow-sheet focus-visible:outline-offset-2">
				<span>
					<strong className="block text-label">오늘 만든 한 끼도 내 첫 기록으로</strong>
					<span className="mt-0.5 block text-meta text-ink-soft">사진 한 장부터 시작하는 Recipeed</span>
				</span>
				<span className="shrink-0 text-heading" aria-hidden>→</span>
			</a>
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteSchema) }} />
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationSchema) }} />
			<Suspense fallback={<ItemListSkeleton />}>
				<SeamlessItemList initialData={initialData} />
			</Suspense>
		</div>
	)
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
