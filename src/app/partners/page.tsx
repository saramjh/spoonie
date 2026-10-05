import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
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
    <div className="min-h-screen bg-door px-3 py-4">
      <LegacyPartnerHashRedirect />
      <article className="mx-auto max-w-md overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-5 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">For Creators & Brands</p>
          <h1 className="mt-2 text-display text-ink">
            레시피를 올리는 곳보다
            <br />
            실제로 쓰이는 곳
          </h1>
          <p className="mt-3 text-body text-ink-soft">
            Spoonie는 Recipe를 읽는 사람이 양을 바꾸고 요리한 뒤, 만든 기록과 참고 관계까지 원본으로 이어 남길 수 있는 요리 소셜 서비스입니다.
          </p>
        </section>

        <section className="border-t border-border bg-door p-3" aria-label="Spoonie 작동 방식">
          <div className="overflow-hidden rounded-[3px] bg-paper shadow-sheet">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="text-micro text-ink-soft">Recipe</p>
                <p className="mt-0.5 text-label font-semibold text-ink">재료와 단계를 실제 요리에 맞게</p>
              </div>
              <div className="rounded-lg border border-border px-3 py-2 text-label font-semibold tabular-nums text-ink">
                − &nbsp;2인분&nbsp; +
              </div>
            </div>

            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <p className="text-micro text-ink-soft">요리하기</p>
                <div className="flex flex-1 gap-1" aria-hidden>
                  <span className="h-1 flex-1 rounded-full bg-ink" />
                  <span className="h-1 flex-1 rounded-full bg-border" />
                  <span className="h-1 flex-1 rounded-full bg-border" />
                </div>
                <span className="text-meta tabular-nums text-ink-soft">1 / 3</span>
              </div>
              <p className="mt-2 text-read text-ink">지금 필요한 단계만 보며 끝까지 따라갑니다.</p>
            </div>

            <div className="px-4 py-3">
              <p className="text-micro text-ink-soft">만든 기록 · 참고 관계</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-meta text-ink-soft">이 Recipe로 만들었어요</p>
                  <p className="truncate text-label font-semibold text-ink">만들어 본 기록</p>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-ink-soft" aria-hidden />
                <p className="text-label font-semibold text-ink">원본 Recipe</p>
              </div>
            </div>
          </div>
          <p className="px-1 pt-3 text-meta text-ink-soft">
            기능 동작 예시 · 실제 관계는 사용자가 만들거나 참고했을 때만 생깁니다.
          </p>
        </section>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-5">
          <p className="text-meta text-ink-soft">요리 콘텐츠를 직접 만드는 사람</p>
          <h2 className="mt-1 text-heading text-ink">내 레시피가 다시 쓰이게</h2>
          <p className="mt-2 text-body text-ink-soft">
            Recipe가 요리에 쓰이고, 만든 기록과 참고가 생기면 원본과 내 프로필로 이어집니다.
          </p>
          <PartnerActionLink
            href="/partners/creators"
            segment="hub"
            action="creator_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            크리에이터로 보기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-5">
          <p className="text-meta text-ink-soft">식품·주방 제품의 활용법을 만드는 팀</p>
          <h2 className="mt-1 text-heading text-ink">제품의 쓰임이 쌓이게</h2>
          <p className="mt-2 text-body text-ink-soft">
            제품 소개가 아니라 실제 조리 가능한 활용 Recipe를 만들고 여러 쓰임을 프로필에 축적합니다.
          </p>
          <PartnerActionLink
            href="/partners/brands"
            segment="hub"
            action="brand_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            브랜드로 보기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>
      </article>
    </div>
  )
}
