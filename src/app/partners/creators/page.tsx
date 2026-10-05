import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import PartnerOnboardingForm from "../partner-onboarding-form"
import PartnerProof from "../partner-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "요리 크리에이터 초기 셋업 | Spoonie",
  description:
    "본인 Spoonie 계정을 먼저 만든 뒤 기존 Instagram 레시피 게시물·릴스를 제출해, 본인 계정 소유의 비공개 Recipe 초안을 검수하고 공개합니다.",
  alternates: { canonical: `${baseUrl}/partners/creators` },
  openGraph: {
    title: "요리 크리에이터 초기 셋업 | Spoonie",
    description: "계정 먼저, 기존 게시물 선택, 내 비공개 Recipe 초안, 직접 확인 후 공개.",
    url: `${baseUrl}/partners/creators`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

export default function CreatorPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto max-w-md overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">요리 크리에이터</p>
          <h1 className="mt-2 text-display text-ink">
            이미 만든 레시피를
            <br />
            다시 입력하지 않게
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            먼저 본인 Spoonie 계정을 만듭니다. 그다음 이미 올린 Instagram 게시물·릴스 중 옮길
            것을 고르면, 확인되는 사진과 설명만 사용해 그 계정의 비공개 Recipe 초안으로
            정리합니다.
          </p>
          <p className="mt-3 text-meta text-ink-soft">
            확인되지 않는 분량이나 조리 순서는 만들지 않습니다. 영상 자체를 Spoonie에
            저장하거나 스트리밍하지 않으며, 공개는 작성자가 검수한 뒤 결정합니다.
          </p>
        </section>

        <section
          id="setup"
          className="scroll-mt-4 border-t border-border px-4 py-6"
          aria-labelledby="creator-setup-title"
        >
          <h2 id="creator-setup-title" className="text-heading text-ink">
            내 계정에 초기 Recipe 셋업하기
          </h2>
          <p className="mt-2 text-body text-ink-soft">
            계정 → 기존 source 1~5개 제출 → 계정 소유의 비공개 초안 → 직접 검수 → 공개 순서로
            진행합니다.
          </p>
          <PartnerOnboardingForm actorType="creator" />
        </section>

        <PartnerProof segment="creator" />
      </article>
    </div>
  )
}
