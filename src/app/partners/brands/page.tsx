import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, Search, ShieldCheck } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import PartnerActionLink from "../partner-action-link"
import PartnerProof from "../partner-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "식품·주방 브랜드 이용 안내 | Spoonie",
  description: "자사 제품을 실제 요리에 활용하는 Recipe를 브랜드가 직접 Spoonie에 게시하는 방법.",
  alternates: { canonical: `${baseUrl}/partners/brands` },
  openGraph: {
    title: "식품·주방 브랜드 이용 안내 | Spoonie",
    description: "제품 광고가 아니라 실제 활용 Recipe를 직접 남겨보세요.",
    url: `${baseUrl}/partners/brands`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

const values = [
  {
    title: "실제 활용법을 Recipe로",
    description: "제품 소개가 아니라 재료·분량·조리 단계가 있는 요리로 보여줍니다.",
    icon: BookOpen,
  },
  {
    title: "일반 Recipe처럼 발견",
    description: "공개하면 다른 Recipe와 같은 검색·프로필·공유 경로를 사용합니다.",
    icon: Search,
  },
  {
    title: "관계는 투명하게",
    description: "자사 제품이거나 협찬·제공받은 제품이면 프로필이나 본문에 그 관계를 밝힙니다.",
    icon: ShieldCheck,
  },
]

export default function BrandPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">For Food & Kitchen Brands</p>
          <h1 className="mt-2 text-display text-ink">제품을 파는 글보다<br />제품으로 만드는 Recipe</h1>
          <p className="mt-4 text-body text-ink-soft">
            식품·소스·조리도구 브랜드도 직접 가입해 자사 제품을 실제로 활용하는 Recipe를 올릴 수 있습니다.
          </p>
          <PartnerActionLink
            href="/signup?next=%2Frecipes%2Fnew"
            segment="brand"
            action="signup_to_recipe"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
          >
            브랜드 Recipe 올리기
          </PartnerActionLink>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-value">
          <h2 id="brand-value" className="text-heading text-ink">이렇게 쓰면 됩니다</h2>
          <div className="mt-4 divide-y divide-border border-y border-border">
            {values.map(({ title, description, icon: Icon }) => (
              <div key={title} className="flex gap-3 py-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-orange-ink" strokeWidth={1.75} aria-hidden />
                <div className="min-w-0">
                  <p className="text-label text-ink">{title}</p>
                  <p className="mt-1 text-meta text-ink-soft">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <PartnerProof segment="brand" />

      </article>
    </div>
  )
}
