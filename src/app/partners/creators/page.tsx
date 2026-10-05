import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import PartnerProof from "../partner-proof"
import PartnerRelationProof from "../partner-relation-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "요리 크리에이터 이용 안내 | Spoonie",
  description: "기존 레시피를 다시 따라 만들 수 있게 남기고, 만들었어요·참고·이어진 Recipe 관계를 따라 작성자까지 발견되는 Spoonie 이용 방법.",
  alternates: { canonical: `${baseUrl}/partners/creators` },
  openGraph: {
    title: "요리 크리에이터 이용 안내 | Spoonie",
    description: "새 콘텐츠를 만들 필요 없이 기존 레시피 1~3개부터 Spoonie Recipe로 옮겨보세요.",
    url: `${baseUrl}/partners/creators`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

const startSteps = [
  {
    title: "기존 레시피 하나 고르기",
    description: "영상 설명란, 블로그, SNS에 이미 올린 요리면 됩니다. 새 촬영이나 새 기획은 필요 없습니다.",
  },
  {
    title: "재료·분량·순서를 옮기기",
    description: "기존 사진과 설명을 활용해 실제로 다시 만들 때 필요한 정보만 Recipe로 정리합니다.",
  },
  {
    title: "공개하고 다시 쓰기",
    description: "프로필에 쌓아두고 링크로 공유하거나, 이후 새 Recipe·Recipeed가 참고한 바탕 Recipe로 이어갈 수 있습니다.",
  },
] as const

export default function CreatorPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto max-w-md overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">요리 크리에이터</p>
          <h1 className="mt-2 text-display text-ink">피드에 묻히는 레시피를<br />다시 따라 만들 수 있게</h1>
          <p className="mt-4 text-body text-ink-soft">
            새 콘텐츠를 만들 필요 없습니다. SNS·블로그에 이미 올린 요리 중 1~3개부터 재료·분량·순서가 있는 Recipe로 옮겨보세요.
          </p>
        </section>

        <PartnerRelationProof segment="creator" />

        <section className="border-t border-border px-4 py-6" aria-labelledby="creator-start">
          <h2 id="creator-start" className="text-heading text-ink">첫 Recipe는 이렇게 시작합니다</h2>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {startSteps.map(({ title, description }, index) => (
              <li key={title} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 py-4">
                <span className="pt-0.5 text-meta tabular-nums text-ink-soft">{index + 1}</span>
                <div className="min-w-0">
                  <p className="text-label text-ink">{title}</p>
                  <p className="mt-1 text-meta text-ink-soft">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <PartnerProof segment="creator" />
      </article>
    </div>
  )
}
