import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper"
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics"
import GoogleAdSense from "@/components/ads/GoogleAdSense"

const fontSans = localFont({
	src: "./fonts/GeistVF.woff",
	variable: "--font-sans",
	weight: "300 700", // 실제 사용되는 weight 범위로 최적화 (light ~ bold)
	display: "swap",
	preload: true,
})

export const metadata: Metadata = {
	title: "스푸니 - 레시피 공유 플랫폼 | 요리법 검색, 나만의 레시피북",
	description: "맛있는 레시피를 공유하고 요리 영감을 얻어보세요. 개인 레시피북 관리, 요리법 검색, 팔로우 기능으로 요리 커뮤니티에 참여하세요. 무료 레시피 공유 서비스 스푸니.",
	keywords: "레시피, 요리법, 요리, 음식, 레시피 공유, 요리 커뮤니티, 레시피북, 요리 레시피, 한식, 양식, 중식, 일식, 홈쿠킹",
	manifest: "/manifest.json",
	icons: {
		icon: "/favicon-32x32.png",
		apple: "/apple-touch-icon.png",
	},
	// Open Graph 메타 태그 (소셜 공유 최적화)
	openGraph: {
		title: "스푸니 - 레시피 공유 플랫폼",
		description: "맛있는 레시피를 공유하고 요리 영감을 얻어보세요. 개인 레시피북 관리와 요리 커뮤니티 참여.",
		url: process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.com',
		siteName: "스푸니 (Spoonie)",
		images: [
			{
				url: "/logo-full.svg",
				width: 1200,
				height: 630,
				alt: "스푸니 - 레시피 공유 플랫폼",
			},
		],
		locale: "ko_KR",
		type: "website",
	},
	// Twitter Cards 
	twitter: {
		card: "summary_large_image",
		title: "스푸니 - 레시피 공유 플랫폼",
		description: "맛있는 레시피를 공유하고 요리 영감을 얻어보세요.",
		images: ["/logo-full.svg"],
	},
	// 검색엔진 최적화
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
	// 언어 설정
	alternates: {
		canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.com',
	},
}

export const viewport = {
	themeColor: "#f97316",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="ko">
			<head>
				{/* 추가 SEO 메타 태그 */}
				<meta name="author" content="Spoonie Team" />
				<meta name="format-detection" content="telephone=no" />
				<link rel="canonical" href={process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.com'} />
			</head>
			<body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)} suppressHydrationWarning={true}>
				{/* 🎯 Google Analytics */}
				<GoogleAnalytics />
				{/* 💰 Google AdSense */}
				<GoogleAdSense />
				
				<ClientLayoutWrapper>{children}</ClientLayoutWrapper>
				<Toaster />
			</body>
		</html>
	)
}