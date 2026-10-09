import type { Metadata } from "next"

import PartnerLanding from "../partner-landing"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "요리 크리에이터를 위한 Spoonie",
  description:
    "레시피를 다시 만들 수 있는 Recipe로 쌓고, Recipeed와 참고·응용 관계를 통해 원본 Recipe와 작성자를 이어가는 Spoonie 활용법입니다.",
  alternates: { canonical: baseUrl + "/partners/creators" },
  openGraph: {
    title: "요리 크리에이터를 위한 Spoonie",
    description: "피드에 묻히는 레시피를 다시 쓰이고 발견되는 Recipe로 남겨보세요.",
    url: baseUrl + "/partners/creators",
    siteName: "Spoonie",
    type: "website",
    images: [{ url: baseUrl + "/og-default.png", width: 1200, height: 630, alt: "Spoonie" }],
  },
  robots: { index: true, follow: true },
}

export default function Page() {
  return <PartnerLanding segment="creator" />
}
