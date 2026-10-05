import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import LegacyPartnerHashRedirect from "./legacy-hash-redirect"
import PartnerActionLink from "./partner-action-link"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "크리에이터·브랜드 초기 셋업 | Spoonie",
  description:
    "본인 Spoonie 계정을 먼저 만든 뒤, 이미 보유한 요리 콘텐츠나 제품 활용 자료를 계정 소유의 비공개 Recipe 초안으로 정리해 검수하고 공개합니다.",
  alternates: { canonical: `${baseUrl}/partners` },
  openGraph: {
    title: "크리에이터·브랜드 초기 셋업 | Spoonie",
    description: "계정 먼저, 기존 자료 제출, 본인 계정의 비공개 Recipe 초안, 검수 후 공개.",
    url: `${baseUrl}/partners`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <LegacyPartnerHashRedirect />
      <article className="mx-auto max-w-md overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <h1 className="mt-5 text-display text-ink">
            이미 만든 요리를
            <br />
            내 Recipe로 옮겨두기
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            크리에이터와 브랜드 모두 본인 Spoonie 계정을 먼저 만듭니다. 기존에 보유한 요리
            콘텐츠를 제출하면 그 계정에 연결된 비공개 Recipe 초안으로 정리하고, 직접 확인한 뒤
            공개합니다.
          </p>
          <p className="mt-3 text-meta text-ink-soft">
            Spoonie 공식 계정이 대신 소유하거나 게시하지 않습니다. 영상은 업로드하지 않고,
            필요할 때 내용 확인용 source로만 다룹니다.
          </p>
        </section>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-6">
          <h2 className="text-heading text-ink">요리 크리에이터</h2>
          <p className="mt-2 text-body text-ink-soft">
            이미 올린 Instagram 레시피 게시물·릴스를 다시 입력하는 수고를 줄입니다. 계정을 만든
            뒤 1~5개 source를 고르면, 확인 가능한 내용만 Recipe 초안으로 정리합니다.
          </p>
          <PartnerActionLink
            href="/partners/creators"
            segment="hub"
            action="creator_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            크리에이터 초기 셋업 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-6">
          <h2 className="text-heading text-ink">식품·주방 브랜드</h2>
          <p className="mt-2 text-body text-ink-soft">
            자사몰·SNS에 이미 있는 제품 활용 레시피와 조리 자료를 브랜드가 관리하는 Spoonie
            계정에 연결합니다. 제품 소개문이 아니라 실제로 따라 만들 수 있는 Recipe를 쌓습니다.
          </p>
          <PartnerActionLink
            href="/partners/brands"
            segment="hub"
            action="brand_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            브랜드 초기 셋업 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>
      </article>
    </div>
  )
}
