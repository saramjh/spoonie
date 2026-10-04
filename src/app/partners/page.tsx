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
  description: "요리 크리에이터와 식품·주방 브랜드가 Spoonie에서 직접 Recipe를 만들고 공유하는 방법.",
  alternates: { canonical: `${baseUrl}/partners` },
  openGraph: {
    title: "크리에이터·브랜드 안내 | Spoonie",
    description: "요리를 만드는 사람과 브랜드 모두 Spoonie에서 직접 Recipe를 남길 수 있습니다.",
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
          <p className="mt-5 text-meta text-ink-soft">Create on Spoonie</p>
          <h1 className="mt-2 text-display text-ink">요리를 만드는 사람이라면</h1>
          <p className="mt-4 text-body text-ink-soft">
            Spoonie는 아직 작은 서비스입니다. 크리에이터도, 식품·주방 브랜드도 별도 제휴 계약 없이 직접 가입해
            실제로 다시 만들 수 있는 Recipe를 공개할 수 있습니다.
          </p>
        </section>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">요리 크리에이터</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            이미 SNS나 블로그에 올린 요리가 있다면 몇 개만 Recipe로 옮겨보세요. 재료·분량·과정을 구조화하고,
            이후 누군가 직접 만든 기록이나 참고 Recipe가 생기면 원 Recipe와 이어집니다.
          </p>
          <PartnerActionLink
            href="/partners/creators"
            segment="hub"
            action="creator_segment_open"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
          >
            크리에이터 이용 안내 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <CookingPot className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">식품·주방 브랜드</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            자사 식재료나 조리도구를 실제로 활용하는 Recipe를 브랜드가 직접 올려도 됩니다. 제품 카탈로그가 아니라
            재료·분량·조리 과정이 있는 요리 콘텐츠여야 하고, 자사 제품이라는 관계는 투명하게 밝혀주세요.
          </p>
          <PartnerActionLink
            href="/partners/brands"
            segment="hub"
            action="brand_segment_open"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
          >
            브랜드 이용 안내 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section className="border-t border-border px-4 py-5">
          <p className="text-meta text-ink-soft">
            Spoonie는 현재 Creator 매칭이나 광고 캠페인 중개 서비스를 제공하지 않습니다. 그런 모델은 실제 사용자와
            Recipe 활동이 충분히 생긴 뒤 검토할 수 있는 다음 단계입니다.
          </p>
        </section>
      </article>
    </div>
  )
}
