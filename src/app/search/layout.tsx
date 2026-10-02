/**
 * 검색 페이지 SEO 최적화
 * TBWA 가이드: 검색 의도 기반 메타데이터
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "레시피 찾기 - 직접 쓴 레시피와 만들어 본 기록 | Spoonie",
  description: "사람들이 직접 쓴 레시피를 요리 이름과 재료로 찾아보세요. 인분·조리 시간·재료가 정리된 레시피와, 그 레시피로 실제로 만들어 본 기록을 함께 볼 수 있어요.",
  keywords: "레시피 검색, 요리법 찾기, 재료별 레시피, 음식 검색, 요리 검색, 인기 레시피, 최신 레시피",
  
  openGraph: {
    siteName: 'Spoonie',
    title: "레시피 검색 - Spoonie",
    description: "원하는 레시피를 쉽고 빠르게 검색해보세요.",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/search`,
    type: 'website',
    images: [{ url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'}/og-default.png`, width: 1200, height: 630, alt: 'Spoonie' }],
  },

  robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/search`,
  },
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}