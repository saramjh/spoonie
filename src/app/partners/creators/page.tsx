import type { Metadata } from "next"

import PartnerLanding from "../partner-landing"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "요리 크리에이터 초대 | Spoonie",
  description:
    "요리 크리에이터가 기존 Instagram 레시피를 다시 입력하지 않고 Spoonie 첫 Recipe로 옮길 수 있는 초대 페이지입니다.",
  alternates: { canonical: baseUrl + "/partners/creators" },
  openGraph: {
    title: "요리 크리에이터 초대 | Spoonie",
    description: "기존 Instagram 레시피를 다시 입력하지 않고 Spoonie 첫 Recipe로 시작해 보세요.",
    url: baseUrl + "/partners/creators",
    siteName: "Spoonie",
    type: "website",
    images: [{ url: baseUrl + "/og-default.png", width: 1200, height: 630, alt: "Spoonie" }],
  },
  robots: { index: false, follow: true },
}

export default function Page() {
  return <PartnerLanding segment="creator" />
}
