import type { Metadata } from "next"

// 로그인·가입·비밀번호 재설정은 검색 콘텐츠가 아니라 인증 흐름이다.
// 공개 레시피와 검색 페이지의 색인 설정에는 영향을 주지 않는다.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
}

export default function AuthenticationLayout({ children }: { children: React.ReactNode }) {
  return children
}
