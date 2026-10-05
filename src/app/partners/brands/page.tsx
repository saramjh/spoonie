import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import PartnerOnboardingForm from "../partner-onboarding-form"
import PartnerProof from "../partner-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "식품·주방 브랜드 초대 | Spoonie",
  description:
    "아직 Spoonie를 사용하지 않는 식품·주방 브랜드를 위한 초대 페이지입니다. 브랜드 계정을 만든 뒤 기존 제품 활용 레시피를 다시 입력하지 않고 첫 Recipe로 옮길 수 있습니다.",
  alternates: { canonical: `${baseUrl}/partners/brands` },
  openGraph: {
    title: "식품·주방 브랜드 초대 | Spoonie",
    description: "자사몰·SNS의 제품 활용 레시피를 다시 입력하지 않고 브랜드의 첫 Spoonie Recipe로 옮겨보세요.",
    url: `${baseUrl}/partners/brands`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
  robots: { index: false, follow: true },
}

export default function BrandPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto max-w-md overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">Spoonie × 식품·주방 브랜드</p>
          <h1 className="mt-2 text-display text-ink">
            이미 만든 활용 레시피,
            <br />
            새 플랫폼에 다시 쓰지 마세요
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            아직 Spoonie 계정이 없어도 됩니다. 브랜드 담당 계정을 만든 뒤 자사몰·SNS의 제품
            활용 레시피 주소 1~5개를 보내 주세요. 확인되는 내용을 브랜드 계정의 비공개 Recipe
            초안으로 옮겨드립니다.
          </p>
          <p className="mt-3 text-meta text-ink-soft">
            제품 광고문이 아니라 실제로 따라 만들 수 있는 조리 정보를 기준으로 정리하며,
            담당자가 직접 확인하고 수정한 뒤 공개합니다.
          </p>
        </section>

        <section
          id="setup"
          className="scroll-mt-4 border-t border-border px-4 py-6"
          aria-labelledby="brand-setup-title"
        >
          <h2 id="brand-setup-title" className="text-heading text-ink">
            브랜드의 첫 Recipe 시작하기
          </h2>
          <p className="mt-2 text-body text-ink-soft">
            처음 방문했다면 브랜드 담당 계정 생성부터 시작합니다. 가입이 끝나면 이 페이지로
            자동 복귀하고, 그때 기존 제품 활용 자료를 받습니다.
          </p>
          <PartnerOnboardingForm actorType="brand" />
        </section>

        <PartnerProof segment="brand" />
      </article>
    </div>
  )
}
