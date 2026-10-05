import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
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
            참고한 Recipe와 작성자가 화면에 남고, 관계가 생기면 만들어 본 기록과 이어진 Recipe에서 다시 연결됩니다.
          </p>
        </section>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-6">
          <h2 className="text-heading text-ink">요리 크리에이터</h2>
          <p className="mt-2 text-body text-ink-soft">
            기존 레시피 1~3개를 옮기고, 다른 사람이 만들거나 참고해 이어가도 바탕 Recipe와 작성자 연결을 남길 수 있습니다.
          </p>
          <PartnerActionLink
            href="/partners/creators"
            segment="hub"
            action="creator_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            크리에이터용 안내 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-6">
          <h2 className="text-heading text-ink">식품·주방 브랜드</h2>
          <p className="mt-2 text-body text-ink-soft">
            제품 활용 Recipe를 직접 올리고, 팬의 조리 기록이나 응용 Recipe가 생기면 같은 출처 연결을 활용할 수 있습니다.
          </p>
          <PartnerActionLink
            href="/partners/brands"
            segment="hub"
            action="brand_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            브랜드용 안내 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>
      </article>
    </div>
  )
}
