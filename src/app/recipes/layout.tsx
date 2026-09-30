/**
 * 📚 레시피북 페이지 SEO 최적화
 */

import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: "나의 레시피북 - 개인 레시피 관리 | 스푸니",
  description: "나만의 레시피를 체계적으로 관리하세요. 개인 레시피 저장, 분류, 검색 기능으로 요리 레시피를 효율적으로 정리할 수 있습니다.",
  keywords: "레시피북, 개인 레시피, 레시피 관리, 요리법 저장, 나만의 레시피, 레시피 정리",
  
  openGraph: {
    siteName: '스푸니',
    title: "나의 레시피북 - 스푸니",
    description: "개인 레시피를 체계적으로 관리하고 정리하세요.",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/recipes`,
    type: 'website',
  },

  robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/recipes`,
  },
}

export default function RecipesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 레시피 목록 페이지가 useSearchParams를 쓰므로 Suspense 경계가 필요하다 (정적 프리렌더 오류 방지)
  return <Suspense fallback={null}>{children}</Suspense>
}