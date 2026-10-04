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
  description: "요리 크리에이터와 식품·주방 브랜드가 Spoonie에 Recipe를 직접 올리는 방법.",
  alternates: { canonical: `${baseUrl}/partners` },
  openGraph: {
    title: "크리에이터·브랜드 안내 | Spoonie",
    description: "만들어 둔 요리를 Recipe로 남기고 다시 쓰세요.",
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
      <article className="mx-auto overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <h1 className="mt-5 text-display text-ink">만들어 둔 요리를<br />Recipe로 남겨보세요</h1>
          <p className="mt-4 text-body text-ink-soft">
            Spoonie는 재료·분량·조리 과정을 다시 꺼내 쓸 수 있게 남기고, 다른 요리 기록과 이어주는 서비스입니다.
          </p>
        </section>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">요리 크리에이터</h2>
          </div>
          <p className="mt-2 text-body text-ink-soft">
            SNS·블로그에 이미 있는 레시피 몇 개부터 Spoonie에 정리해 보세요.
          </p>
          <PartnerActionLink
            href="/partners/creators"
            segment="hub"
            action="creator_segment_open"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-4 w-full" })}
          >
            크리에이터 안내 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <CookingPot className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">식품·주방 브랜드</h2>
          </div>
          <p className="mt-2 text-body text-ink-soft">
            자사 제품을 실제로 활용하는 조리 가능한 Recipe를 브랜드가 직접 올릴 수 있습니다.
          </p>
          <PartnerActionLink
            href="/partners/brands"
            segment="hub"
            action="brand_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            브랜드 안내 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>
      </article>
    </div>
  )
}
