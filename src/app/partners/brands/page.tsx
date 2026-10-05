import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import PartnerOnboardingForm from "../partner-onboarding-form"
import PartnerProof from "../partner-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "식품·주방 브랜드 초기 셋업 | Spoonie",
  description:
    "브랜드가 관리하는 Spoonie 계정을 먼저 만든 뒤 기존 제품 활용 레시피·미디어 자료를 제출해, 그 계정 소유의 비공개 Recipe 초안을 검수하고 공개합니다.",
  alternates: { canonical: `${baseUrl}/partners/brands` },
  openGraph: {
    title: "식품·주방 브랜드 초기 셋업 | Spoonie",
    description: "계정 먼저, 기존 제품 활용 자료 제출, 브랜드 계정의 비공개 Recipe 초안, 검수 후 공개.",
    url: `${baseUrl}/partners/brands`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

export default function BrandPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto max-w-md overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">식품·주방 브랜드</p>
          <h1 className="mt-2 text-display text-ink">
            이미 가진 활용 레시피를
            <br />
            브랜드의 Recipe 자산으로
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            먼저 브랜드가 관리할 Spoonie 계정을 만듭니다. 자사몰·SNS에 이미 있는 제품 활용
            레시피와 조리 자료를 제출하면, 확인되는 내용만 그 계정의 비공개 Recipe 초안으로
            정리합니다.
          </p>
          <p className="mt-3 text-meta text-ink-soft">
            별도 제휴 계약이나 광고 상품이 아닙니다. 제품 소개보다 실제로 따라 만들 수 있는
            재료·분량·조리 순서를 남기고, 브랜드 담당자가 검수한 뒤 공개합니다.
          </p>
        </section>

        <section
          id="setup"
          className="scroll-mt-4 border-t border-border px-4 py-6"
          aria-labelledby="brand-setup-title"
        >
          <h2 id="brand-setup-title" className="text-heading text-ink">
            브랜드 계정에 초기 Recipe 셋업하기
          </h2>
          <p className="mt-2 text-body text-ink-soft">
            계정 → 기존 제품 활용 source 1~5개 제출 → 계정 소유의 비공개 초안 → 담당자 검수 →
            공개 순서로 진행합니다.
          </p>
          <PartnerOnboardingForm actorType="brand" />
        </section>

        <PartnerProof segment="brand" />
      </article>
    </div>
  )
}
