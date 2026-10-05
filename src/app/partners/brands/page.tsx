import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import PartnerProof from "../partner-proof"
import PartnerRelationProof from "../partner-relation-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "식품·주방 브랜드 이용 안내 | Spoonie",
  description: "제품 활용 Recipe를 직접 쌓아 제품마다 실제 쓰는 법을 남기고, 팬의 조리 기록과 응용 Recipe가 생기면 원본 활용법으로 이어지게 할 수 있습니다.",
  alternates: { canonical: `${baseUrl}/partners/brands` },
  openGraph: {
    title: "식품·주방 브랜드 이용 안내 | Spoonie",
    description: "한 번의 제품 소개보다, 실제로 어떻게 쓰는지를 Recipe로 계속 쌓아보세요.",
    url: `${baseUrl}/partners/brands`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

const outcomes = [
  {
    title: "같은 활용법을 채널마다 다시 설명하지 않기",
    description: "자사몰·SNS에 흩어진 조리법을 Recipe 한 페이지로 남겨, 같은 활용법을 필요할 때 다시 링크할 수 있습니다.",
  },
  {
    title: "한 제품의 쓰임을 계속 쌓기",
    description: "제품 하나에 볶음·구이·한 끼·디저트처럼 실제 사용법을 Recipe로 누적해 프로필에서 함께 보여줄 수 있습니다.",
  },
  {
    title: "팬의 사용 사례가 원본으로 돌아오게 하기",
    description: "팬이 제품 활용 Recipe를 참고해 만들거나 자기 버전을 올린 경우, 바탕 Recipe와 브랜드 프로필로 다시 이동할 경로가 남습니다.",
  },
] as const

export default function BrandPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto max-w-md overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">식품·주방 브랜드</p>
          <h1 className="mt-2 text-display text-ink">제품을 설명하는 데서 끝내지 않고<br />써먹는 방법을 쌓기</h1>
          <p className="mt-4 text-body text-ink-soft">
            자사몰·SNS에 이미 있는 활용 레시피부터 시작할 수 있습니다. 제품 소개문이 아니라 재료·분량·조리 순서가 있는 실제 사용법을 Recipe로 남깁니다.
          </p>
          <p className="mt-3 text-meta text-ink-soft">
            별도 제휴 계약 없이 일반 Recipe 작성 흐름으로 시작하고, 제품마다 활용법을 프로필에 누적할 수 있습니다.
          </p>
        </section>

        <PartnerRelationProof segment="brand" />

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-benefits">
          <h2 id="brand-benefits" className="text-heading text-ink">Recipe로 바꾸면 남는 것</h2>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {outcomes.map(({ title, description }, index) => (
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

        <PartnerProof segment="brand" />
      </article>
    </div>
  )
}
