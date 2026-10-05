import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import CreatorMigrationForm from "../creator-migration-form"
import PartnerProof from "../partner-proof"
import PartnerRelationProof from "../partner-relation-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "요리 크리에이터 이용 안내 | Spoonie",
  description:
    "Instagram에 이미 올린 레시피 게시물·릴스 주소를 보내면 Spoonie Recipe 초안으로 정리하고, 공개 전 직접 확인할 수 있습니다.",
  alternates: { canonical: `${baseUrl}/partners/creators` },
  openGraph: {
    title: "요리 크리에이터 이용 안내 | Spoonie",
    description: "이미 만든 레시피를 다시 입력하지 말고, 옮길 Instagram 게시물 주소만 보내주세요.",
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
          <h1 className="mt-2 text-display text-ink">이미 올린 레시피,<br />다시 입력하지 마세요</h1>
          <p className="mt-4 text-body text-ink-soft">
            Instagram 게시물·릴스 주소만 보내면, 확인되는 사진과 설명을 재료·분량·순서가 있는 Recipe 초안으로 정리합니다.
            공개하기 전에는 직접 확인할 수 있습니다.
          </p>
          <p className="mt-3 text-meta text-ink-soft">
            새 촬영이나 새 기획 없이 기존 콘텐츠를 다시 꺼내 쓸 수 있는 Recipe 링크로 바꾸는 방식입니다.
          </p>
        </section>

        <PartnerRelationProof segment="creator" />

        <section id="migration" className="scroll-mt-4 border-t border-border px-4 py-6" aria-labelledby="migration-title">
          <h2 id="migration-title" className="text-heading text-ink">옮길 게시물 주소만 보내주세요</h2>
          <p className="mt-2 text-body text-ink-soft">
            지금은 Instagram부터 받습니다. 먼저 1~5개만 골라 보내면 초안을 정리하고, 확인되지 않는 분량이나 순서는 임의로 만들지 않습니다.
          </p>
          <p className="mt-2 text-meta text-ink-soft">
            접수 → 초안 정리 → 공개 전 확인. 요청만으로 계정이나 Recipe가 자동 공개되지는 않습니다.
          </p>
          <CreatorMigrationForm />
        </section>

        <PartnerProof segment="creator" />
      </article>
    </div>
  )
}
