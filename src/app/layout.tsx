import type { Metadata } from "next"
import "./pretendard.css"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper"
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics"
import GoogleAdSense from "@/components/ads/GoogleAdSense"
import ServiceWorkerUpdater from "@/components/layout/ServiceWorkerUpdater"
import NavigationProgress from "@/components/layout/NavigationProgress"
import { Suspense } from "react"


export const metadata: Metadata = {
	title: "Spoonie - 레시피 공유 플랫폼 | 요리법 검색, 나만의 레시피북",
	description: "맛있는 레시피를 공유하고 요리 영감을 얻어보세요. 개인 레시피북 관리, 요리법 검색, 팔로우 기능으로 요리 커뮤니티에 참여하세요. 무료 레시피 공유 서비스 Spoonie.",
	keywords: "레시피, 요리법, 요리, 음식, 레시피 공유, 요리 커뮤니티, 레시피북, 요리 레시피, 한식, 양식, 중식, 일식, 홈쿠킹",
	manifest: "/manifest.json",
	icons: {
		icon: "/favicon-32x32.png",
		apple: "/apple-touch-icon.png",
	},
	openGraph: {
		title: "Spoonie - 레시피 공유 플랫폼",
		description: "맛있는 레시피를 공유하고 요리 영감을 얻어보세요. 개인 레시피북 관리와 요리 커뮤니티 참여.",
		url: process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr',
		siteName: "Spoonie",
		images: [
			{
				url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'}/og-default.png`,
				width: 1200,
				height: 630,
				alt: "Spoonie - 레시피 공유 플랫폼",
			},
		],
		locale: "ko_KR",
		type: "website",
	},
	// Twitter Cards 
	twitter: {
		card: "summary_large_image",
		title: "Spoonie - 레시피 공유 플랫폼",
		description: "맛있는 레시피를 공유하고 요리 영감을 얻어보세요.",
		images: [`${process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'}/og-default.png`],
	},
	// 검색엔진 소유 확인
	verification: {
		other: {
			"naver-site-verification": "0626924727da0c005739ca94edae9591d26a53bc",
			"saaskr-verification": "saaskr-verify-78fa73cf461e5131138fc03b",
		},
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
}

export const viewport = {
	themeColor: "#ffffff", // 상단 막대(종이)와 같은 색으로 브라우저 주소창을 칠한다
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="ko" suppressHydrationWarning>
			<head>
				{/* Google AdSense 인증 메타 태그 - 최우선 위치 */}
				<meta name="google-adsense-account" content="ca-pub-4410729598083068" />
				{/* 추가 SEO 메타 태그 */}
				<meta name="author" content="Spoonie Team" />
				<meta name="format-detection" content="telephone=no" />
				{/* 스플래시는 브라우저 세션당 한 번만 (첫 페인트 전에 판단해 깜빡임이 없다) */}
				<script
					dangerouslySetInnerHTML={{
						__html: "try{if(sessionStorage.getItem('spoonie-splash')){document.documentElement.classList.add('splash-seen')}else{sessionStorage.setItem('spoonie-splash','1')}}catch(e){}",
					}}
				/>
			</head>
			<body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning={true}>
				{/* Google Analytics */}
				<GoogleAnalytics />
				{/* Google AdSense */}
				<GoogleAdSense />
				{/* Service Worker 업데이터 */}
				<ServiceWorkerUpdater />
				
				{/* 화면 전환 진행 막대 */}
				<Suspense fallback={null}>
					<NavigationProgress />
				</Suspense>

				<ClientLayoutWrapper>{children}</ClientLayoutWrapper>
				<Toaster />
			</body>
		</html>
	)
}