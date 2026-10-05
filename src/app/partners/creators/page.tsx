import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import PartnerOnboardingForm from "../partner-onboarding-form"
import PartnerProof from "../partner-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "요리 크리에이터 초대 | Spoonie",
  description:
    "아직 Spoonie를 사용하지 않는 요리 크리에이터를 위한 초대 페이지입니다. 계정을 만든 뒤 기존 Instagram 레시피를 다시 입력하지 않고 첫 Recipe로 옮길 수 있습니다.",
  alternates: { canonical: `${baseUrl}/partners/creators` },
  openGraph: {
    title: "요리 크리에이터 초대 | Spoonie",
    description: "Instagram에 이미 올린 레시피를 다시 입력하지 않고 Spoonie의 첫 Recipe로 옮겨보세요.",
    url: `${baseUrl}/partners/creators`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
  robots: { index: false, follow: true },
}

export default function CreatorPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto max-w-md overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">Spoonie × 요리 크리에이터</p>
          <h1 className="mt-2 text-display text-ink">
            인스타에 올린 레시피,
            <br />
            Spoonie에 다시 쓰지 마세요
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            아직 Spoonie 계정이 없어도 됩니다. 계정을 만든 뒤 기존 Instagram 게시물·릴스
            주소 1~5개만 보내 주세요. 사진과 설명에서 확인되는 내용을 본인 계정의 비공개
            Recipe 초안으로 옮겨드립니다.
          </p>
          <p className="mt-3 text-meta text-ink-soft">
            초안을 직접 확인하고 수정한 뒤 공개합니다. 원문에 없는 분량이나 조리 순서는
            임의로 만들지 않습니다.
          </p>
        </section>

        <section
          id="setup"
          className="scroll-mt-4 border-t border-border px-4 py-6"
          aria-labelledby="creator-setup-title"
        >
          <h2 id="creator-setup-title" className="text-heading text-ink">
            Spoonie에서 첫 Recipe 시작하기
          </h2>
          <p className="mt-2 text-body text-ink-soft">
            처음 방문했다면 계정 생성부터 시작합니다. 가입이 끝나면 이 페이지로 자동 복귀하고,
            그때 옮길 Instagram 콘텐츠를 받습니다.
          </p>
          <PartnerOnboardingForm actorType="creator" />
        </section>

        <PartnerProof segment="creator" />
      </article>
    </div>
  )
}
