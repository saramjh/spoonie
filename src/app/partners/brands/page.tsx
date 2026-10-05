import type { Metadata } from "next"

import PartnerLanding from "../partner-landing"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "식품·주방 브랜드를 위한 Spoonie",
  description:
    "제품의 실제 활용법을 Recipe로 쌓고, 팬의 조리 기록과 응용 Recipe를 원본 활용법과 연결하는 Spoonie 활용법입니다.",
  alternates: { canonical: baseUrl + "/partners/brands" },
  openGraph: {
    title: "식품·주방 브랜드를 위한 Spoonie",
    description: "제품 소개를 넘어 실제 쓰는 방법을 Recipe로 쌓아보세요.",
    url: baseUrl + "/partners/brands",
    siteName: "Spoonie",
    type: "website",
    images: [{ url: baseUrl + "/og-default.png", width: 1200, height: 630, alt: "Spoonie" }],
  },
  robots: { index: false, follow: true },
}

export default function Page() {
  return <PartnerLanding segment="brand" />
}
