/**
 * 🔍 검색 페이지 SEO 최적화
 * TBWA 가이드: 검색 의도 기반 메타데이터
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "레시피 검색 - 원하는 요리법을 찾아보세요 | 스푸니",
  description: "맛있는 레시피를 검색해보세요. 재료, 요리명, 작성자로 검색 가능합니다. 인기 레시피와 최신 요리법을 한번에 확인하세요.",
  keywords: "레시피 검색, 요리법 찾기, 재료별 레시피, 음식 검색, 요리 검색, 인기 레시피, 최신 레시피",
  
  openGraph: {
    title: "레시피 검색 - 스푸니",
    description: "원하는 레시피를 쉽고 빠르게 검색해보세요.",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/search`,
    type: 'website',
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