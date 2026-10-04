import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CookingPot, Users } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import LegacyPartnerHashRedirect from "./legacy-hash-redirect"
import PartnerActionLink from "./partner-action-link"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "파트너 | Spoonie",
  description: "Spoonie의 요리 크리에이터·주방·식품 브랜드 파트너 파일럿 안내.",
  alternates: { canonical: `${baseUrl}/partners` },
  openGraph: {
    title: "파트너 | Spoonie",
    description: "Recipe와 실제 조리 경험을 이어가는 Spoonie 파트너 파일럿.",
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
          <p className="mt-5 text-meta text-ink-soft">Spoonie Partner Pilot</p>
          <h1 className="mt-2 text-display text-ink">어떤 파트너이신가요?</h1>
          <p className="mt-4 text-body text-ink-soft">
            Spoonie는 지금 첫 Creator cohort를 만드는 단계입니다. 요리 크리에이터 참여를 먼저 열고,
            주방·식품 브랜드는 이후 파일럿을 위한 제품·사용 맥락을 미리 받고 있습니다.
          </p>
        </section>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">요리 크리에이터</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            현재 가장 먼저 찾고 있습니다. 기존 요리 콘텐츠 몇 개를 Spoonie Recipe로 시작해,
            실제 조리 기록과 참고·파생 Recipe가 이어지는 구조를 함께 만드는 Founding Creator 모집입니다.
          </p>
          <PartnerActionLink
            href="/partners/creators"
            segment="hub"
            action="creator_segment_open"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
          >
            Founding Creator 안내 보기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <CookingPot className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">주방·식품 브랜드</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            지금 당장 Creator 매칭을 약속하는 단계는 아닙니다. 첫 Creator cohort가 형성된 뒤 열 브랜드 파일럿을 위해
            제품군·사용 맥락을 미리 공유하거나, 이미 함께하는 Creator가 있다면 조기 파일럿 가능성을 검토할 수 있습니다.
          </p>
          <PartnerActionLink
            href="/partners/brands"
            segment="hub"
            action="brand_segment_open"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
          >
            브랜드 Early Access 보기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section className="border-t border-border px-4 py-5">
          <p className="text-meta text-ink-soft">
            Spoonie는 초기 서비스입니다. 아직 없는 기능이나 규모를 약속하지 않고 현재 동작하는 Recipe, Recipeed,
            참고 Recipe 연결을 기반으로 작은 파일럿부터 검증합니다.
          </p>
        </section>
      </article>
    </div>
  )
}
