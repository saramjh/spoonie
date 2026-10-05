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
    "Recipe, Recipeed와 참고 관계를 통해 요리 콘텐츠를 다시 쓰이고 발견되는 형태로 남기는 Spoonie를 크리에이터·브랜드 입장에서 소개합니다.",
  alternates: { canonical: baseUrl + "/partners" },
  openGraph: {
    title: "크리에이터·브랜드를 위한 Spoonie",
    description: "레시피가 한 번의 게시물로 끝나지 않게. 내 상황에 맞는 Spoonie 활용법을 확인해 보세요.",
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
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">For Creators & Brands</p>
          <h1 className="mt-2 text-display text-ink">
            레시피가 한 번의
            <br />
            게시물로 끝나지 않게
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            Spoonie는 레시피를 실제로 다시 만들 수 있는 Recipe로 남기고, 만든 기록과
            참고·응용 관계를 이어가는 요리 소셜 서비스입니다.
          </p>
        </section>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-6">
          <h2 className="text-heading text-ink">요리 크리에이터라면</h2>
          <p className="mt-2 text-body text-ink-soft">
            피드에 묻히는 레시피를 다시 찾고 공유하기 쉬운 Recipe로 쌓고, 누가 만들고
            참고했는지 원본과 작성자 관계를 이어갈 수 있습니다.
          </p>
          <PartnerActionLink
            href="/partners/creators"
            segment="hub"
            action="creator_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            크리에이터 활용법 보기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-6">
          <h2 className="text-heading text-ink">식품·주방 브랜드라면</h2>
          <p className="mt-2 text-body text-ink-soft">
            제품 소개를 넘어 실제 조리 가능한 활용 Recipe를 쌓고, 팬의 조리 기록과 응용
            사용 사례를 원본 활용법에 연결할 수 있습니다.
          </p>
          <PartnerActionLink
            href="/partners/brands"
            segment="hub"
            action="brand_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            브랜드 활용법 보기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>
      </article>
    </div>
  )
}
