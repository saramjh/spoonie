import type { Metadata } from "next"

// 인증 여부와 관계없이 작성 화면은 검색 결과에 노출하지 않는다.
// 색인 대상은 공개된 원본 Recipe/Recipeed 상세 페이지다.
export const metadata: Metadata = {
  title: "Recipeed 쓰기 - 직접 만든 요리 기록 | Spoonie",
  description: "오늘 만든 집밥 사진과 바꿔 넣은 재료, 요리 경험을 Recipeed로 기록하세요. 원본 레시피와 내 요리 기록을 연결할 수 있습니다.",
  robots: { index: false, follow: true },
}

export default function NewPostLayout({ children }: { children: React.ReactNode }) {
  return children
}
