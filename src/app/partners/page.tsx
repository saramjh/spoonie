import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CookingPot, Users } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import LegacyPartnerHashRedirect from "./legacy-hash-redirect"
import PartnerActionLink from "./partner-action-link"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "크리에이터·브랜드 안내 | Spoonie",
  description: "기존 레시피와 제품 활용 요리를 Spoonie Recipe로 직접 남기는 방법.",
  alternates: { canonical: `${baseUrl}/partners` },
  openGraph: {
    title: "크리에이터·브랜드 안내 | Spoonie",
    description: "이미 만든 요리 콘텐츠를 다시 찾고 따라 만들 수 있는 Recipe로 남겨보세요.",
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
          <h1 className="mt-5 text-display text-ink">이미 만든 요리를<br />다시 쓰이는 Recipe로</h1>
          <p className="mt-4 text-body text-ink-soft">
            크리에이터는 기존 레시피를, 식품·주방 브랜드는 제품 활용 요리를 재료·분량·조리 순서가 남는 Recipe로 직접 올릴 수 있습니다.
          </p>
          <p className="mt-2 text-meta text-ink-soft">
            별도 파트너 계약을 기다리는 페이지가 아닙니다. 나에게 맞는 안내를 보고 Recipe 1개부터 바로 시작할 수 있습니다.
          </p>
        </section>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">요리 크리에이터</h2>
          </div>
          <p className="mt-2 text-body text-ink-soft">
            피드와 영상 속에 묻히는 기존 레시피 1~3개부터, 사람들이 다시 찾아 따라 만들 수 있게 남겨보세요.
          </p>
          <PartnerActionLink
            href="/partners/creators"
            segment="hub"
            action="creator_segment_open"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-4 w-full" })}
          >
            크리에이터에게 맞는 이유 보기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <CookingPot className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">식품·주방 브랜드</h2>
          </div>
          <p className="mt-2 text-body text-ink-soft">
            상품 설명만으로는 보이지 않는 실제 사용법을, 자사 제품으로 만드는 조리 가능한 Recipe로 쌓아보세요.
          </p>
          <PartnerActionLink
            href="/partners/brands"
            segment="hub"
            action="brand_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            브랜드에게 맞는 이유 보기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>
      </article>
    </div>
  )
}
