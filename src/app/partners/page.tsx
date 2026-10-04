import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CookingPot, Users } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import LegacyPartnerHashRedirect from "./legacy-hash-redirect"

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
        <section className="px-4 pb-6 pt-7">
          <p className="text-meta text-ink-soft">Spoonie Partner Pilot</p>
          <h1 className="mt-2 text-display text-ink">어떤 파트너이신가요?</h1>
          <p className="mt-4 text-body text-ink-soft">
            같은 Recipe 그래프라도 크리에이터와 브랜드가 얻는 가치는 다릅니다. 해당하는 안내에서 현재 Spoonie로
            무엇을 함께 검증할 수 있는지 확인해 주세요.
          </p>
        </section>

        <section id="creators" className="scroll-mt-16 border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">요리 크리에이터</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            SNS의 요리 콘텐츠를 검색 가능한 Recipe로 남기고, 팬이 실제로 만들어 본 기록과 참고·파생 Recipe를
            원 콘텐츠에 이어 붙이는 구조를 검증합니다.
          </p>
          <Link
            href="/partners/creators"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
          >
            크리에이터 안내 보기 <ArrowRight aria-hidden />
          </Link>
        </section>

        <section id="brands" className="scroll-mt-16 border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <CookingPot className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">주방·식품 브랜드</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            제품 노출 한 번으로 끝내지 않고, 제품이 실제로 쓰인 Recipe와 크리에이터·사용자의 조리 경험이 이어지는
            파일럿을 검증합니다.
          </p>
          <Link
            href="/partners/brands"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
          >
            브랜드 안내 보기 <ArrowRight aria-hidden />
          </Link>
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
