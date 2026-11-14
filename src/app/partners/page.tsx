import type { Metadata } from "next"
import Image from "next/image"
import Link from "@/components/kit/NavigationLink"
import { ArrowRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/kit"
import LegacyPartnerHashRedirect from "./legacy-hash-redirect"
import PartnerActionLink from "./partner-action-link"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "크리에이터·브랜드를 위한 Spoonie",
  description:
    "레시피를 실제 요리에 쓰는 Recipe로 남기고, 만든 기록과 참고·응용 관계를 원본과 이어가는 Spoonie를 크리에이터·브랜드 입장에서 확인하세요.",
  alternates: { canonical: baseUrl + "/partners" },
  openGraph: {
    title: "크리에이터·브랜드를 위한 Spoonie",
    description: "Recipe가 실제 요리에 쓰이고 다시 이어지는 방식을 확인해 보세요.",
    url: baseUrl + "/partners",
    siteName: "Spoonie",
    type: "website",
    images: [{ url: baseUrl + "/og-default.png", width: 1200, height: 630, alt: "Spoonie" }],
  },
  robots: { index: false, follow: true },
}

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PageHeader title="파트너 안내" />
      <LegacyPartnerHashRedirect />
      <article className="mx-auto max-w-md">
        <section className="px-4 py-4">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-ink">
            요리를 남기는
            <br />
            크리에이터와 브랜드에게
          </h1>
          <p className="mt-3 text-body text-ink-soft">
            레시피를 실제 요리에 쓰는 Recipe로 남기고, 만든 기록과 참고 관계를 원본에 이어갑니다.
          </p>
        </section>

        <figure className="mx-4 mb-2">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-paper-tint">
            <Image src="/partners-cooking-example.webp" fill loading="eager" sizes="(max-width: 448px) calc(100vw - 32px), 416px"
              className="object-cover" alt="토마토 크림 파스타 요리 예시" />
          </div>
          <figcaption className="mt-2 text-meta text-ink-soft">조리 예시 이미지 · 실제 이용 기록이 아닙니다.</figcaption>
        </figure>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-3">
          <h2 className="text-title text-ink">요리 크리에이터</h2>
          <p className="mt-2 text-body text-ink-soft">
            다시 만들 수 있는 레시피를 남겨 보세요.
          </p>
          <PartnerActionLink
            href="/partners/creators"
            segment="hub"
            action="creator_segment_open"
            className={buttonVariants({ size: "lg", className: "mt-3 w-full" })}
          >
            크리에이터 안내 보기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-3">
          <h2 className="text-title text-ink">식품·주방 브랜드</h2>
          <p className="mt-2 text-body text-ink-soft">
            제품 소개가 아니라 실제 조리 가능한 활용 Recipe를 만들고 여러 쓰임을 프로필에 축적합니다.
          </p>
          <PartnerActionLink
            href="/partners/brands"
            segment="hub"
            action="brand_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-3 w-full" })}
          >
            브랜드 안내 보기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>
      </article>
    </div>
  )
}
