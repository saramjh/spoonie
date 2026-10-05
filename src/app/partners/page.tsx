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
  description: "이미 만든 요리 콘텐츠와 제품 활용법을 다시 입력하는 수고는 줄이고, 재료·분량·순서가 남는 Recipe 자산으로 쌓는 방법.",
  alternates: { canonical: `${baseUrl}/partners` },
  openGraph: {
    title: "크리에이터·브랜드 안내 | Spoonie",
    description: "이미 만든 요리 콘텐츠를 다시 찾고 공유할 수 있는 Recipe로 바꿔보세요.",
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
          <h1 className="mt-5 text-display text-ink">이미 만든 요리를<br />한 번 더 써먹는 방법</h1>
          <p className="mt-4 text-body text-ink-soft">
            Spoonie는 새 홍보물을 더 만들게 하는 도구가 아니라, 이미 만든 레시피와 제품 활용법을 재료·분량·순서가 남는 Recipe로 다시 쓰게 합니다.
          </p>
        </section>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-6">
          <h2 className="text-heading text-ink">요리 크리에이터</h2>
          <p className="mt-2 text-body text-ink-soft">
            피드에 지나간 레시피도 다시 입력할 필요 없이 옮길 수 있습니다. Instagram 주소 1~5개만 보내면 초안을 정리하고, 이후에는 분량·재료 질문에 같은 Recipe 링크를 다시 쓸 수 있습니다.
          </p>
          <PartnerActionLink
            href="/partners/creators"
            segment="hub"
            action="creator_segment_open"
            className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
          >
            기존 콘텐츠 옮기기 <ArrowRight aria-hidden />
          </PartnerActionLink>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-6">
          <h2 className="text-heading text-ink">식품·주방 브랜드</h2>
          <p className="mt-2 text-body text-ink-soft">
            제품 소개 게시물에서 끝내지 않고, 한 제품의 여러 활용법을 Recipe로 계속 쌓을 수 있습니다. 필요할 때 같은 조리법을 다시 링크하고, 팬이 참고해 만든 기록이 생기면 원본 활용 Recipe로 연결됩니다.
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
