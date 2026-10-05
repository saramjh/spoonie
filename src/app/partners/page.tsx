import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import LegacyPartnerHashRedirect from "./legacy-hash-redirect"
import PartnerActionLink from "./partner-action-link"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "크리에이터·브랜드 초대 | Spoonie",
  description:
    "Spoonie를 아직 사용하지 않는 요리 크리에이터와 브랜드를 위한 초대 경로입니다. 계정을 만든 뒤 기존 콘텐츠를 다시 입력하지 않고 첫 Recipe를 시작할 수 있습니다.",
  alternates: { canonical: `${baseUrl}/partners` },
  openGraph: {
    title: "크리에이터·브랜드 초대 | Spoonie",
    description: "처음 Spoonie를 시작하면서 기존 요리 콘텐츠를 다시 입력하지 않고 첫 Recipe로 옮겨보세요.",
    url: `${baseUrl}/partners`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
  robots: { index: false, follow: true },
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
            이미 올린 레시피,
            <br />
            다시 처음부터 쓰지 마세요
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            이 페이지는 아직 Spoonie를 사용하지 않는 요리 크리에이터와 브랜드를 위한 초대
            경로입니다. 계정이 없어도 됩니다. 본인 유형을 고른 뒤 계정을 만들고, 기존 콘텐츠
            주소 1~5개를 보내면 확인 가능한 내용을 첫 비공개 Recipe 초안으로 옮겨드립니다.
          </p>
          <p className="mt-3 text-meta text-ink-soft">
            초안은 처음부터 본인 계정 소유이며, 직접 확인하고 수정한 뒤 공개합니다.
          </p>
        </section>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-6">
          <h2 className="text-heading text-ink">요리 크리에이터</h2>
          <p className="mt-2 text-body text-ink-soft">
            Instagram에 이미 올린 레시피 게시물·릴스를 새 플랫폼에 다시 입력하는 수고를
            줄입니다. Spoonie를 처음 시작하면서 대표 콘텐츠부터 Recipe로 옮길 수 있습니다.
          </p>
          <PartnerActionLink
            href="/partners/creators"
            segment="hub"
            action="creator_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            크리에이터로 시작하기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-6">
          <h2 className="text-heading text-ink">식품·주방 브랜드</h2>
          <p className="mt-2 text-body text-ink-soft">
            자사몰·SNS에 이미 있는 제품 활용 레시피를 처음부터 다시 작성하지 않고 Spoonie
            Recipe로 옮길 수 있습니다. 제품 소개문이 아니라 실제 조리 가능한 활용법을 쌓습니다.
          </p>
          <PartnerActionLink
            href="/partners/brands"
            segment="hub"
            action="brand_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            브랜드로 시작하기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>
      </article>
    </div>
  )
}
