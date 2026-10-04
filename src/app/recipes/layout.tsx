
import { Metadata } from 'next'
import { Suspense } from 'react'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'

export const metadata: Metadata = {
  title: "나의 레시피북 - 개인 레시피 관리 | Spoonie",
  description: "나만의 레시피를 체계적으로 관리하세요. 개인 레시피 저장, 분류, 검색 기능으로 요리 레시피를 효율적으로 정리할 수 있습니다.",
  keywords: "레시피북, 개인 레시피, 레시피 관리, 요리법 저장, 나만의 레시피, 레시피 정리",
  
  openGraph: {
    siteName: 'Spoonie',
    title: "나의 레시피북 - Spoonie",
    description: "개인 레시피를 체계적으로 관리하고 정리하세요.",
    url: `${baseUrl}/recipes`,
    type: 'website',
  },

  // 레시피북은 회원 전용이라 비로그인 사용자와 검색 로봇에게는 안내 문구만 보인다.
  // 레시피 상세(/recipes/[id])는 자체 메타데이터에서 색인을 허용한다.
  robots: {
    index: false,
    follow: true,
  },

  alternates: {
    canonical: `${baseUrl}/recipes`,
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