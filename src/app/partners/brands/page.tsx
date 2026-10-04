import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, Library, PenLine } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import PartnerActionLink from "../partner-action-link"
import PartnerProof from "../partner-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "식품·주방 브랜드 이용 안내 | Spoonie",
  description: "상품 설명만으로는 보이지 않는 실제 사용법을 자사 제품 활용 Recipe로 직접 쌓는 방법.",
  alternates: { canonical: `${baseUrl}/partners/brands` },
  openGraph: {
    title: "식품·주방 브랜드 이용 안내 | Spoonie",
    description: "자사 제품으로 실제로 만드는 요리를 Recipe로 직접 남겨보세요.",
    url: `${baseUrl}/partners/brands`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

const values = [
  {
    title: "상품 설명보다 실제 사용 장면으로",
    description: "소스·식재료·팬·조리도구가 실제 요리에서 어떻게 쓰이는지 재료와 조리 과정으로 보여줍니다.",
    icon: BookOpen,
  },
  {
    title: "한 번 쓰고 사라지는 홍보가 아니라",
    description: "공개 Recipe는 프로필에 쌓이고 검색·공유할 수 있는 제품 활용 콘텐츠로 남습니다.",
    icon: Library,
  },
  {
    title: "브랜드가 가진 콘텐츠로 바로 시작",
    description: "크리에이터 섭외나 별도 제휴를 기다리지 않고, 이미 보유한 요리·활용 콘텐츠부터 직접 작성할 수 있습니다.",
    icon: PenLine,
  },
]

const startSteps = [
  {
    title: "제품 하나와 요리 하나 고르기",
    description: "자사몰·SNS·패키지 등에 이미 있는 활용 레시피가 있다면 그대로 시작해도 됩니다.",
  },
  {
    title: "실제로 만들 수 있는 Recipe로 정리",
    description: "제품 소개문 대신 재료·분량·조리 순서와 사진을 넣어 한 끼나 한 접시가 완성되는 과정을 보여줍니다.",
  },
  {
    title: "브랜드 관계를 밝히고 공개",
    description: "자사 제품·협찬·제품 제공 관계를 명확히 적고 공개하면 브랜드 프로필에 활용 Recipe가 계속 쌓입니다.",
  },
] as const

export default function BrandPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto max-w-md overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">For Food & Kitchen Brands</p>
          <h1 className="mt-2 text-display text-ink">상품 페이지가 못 보여주는<br />실제 쓰는 법을 Recipe로</h1>
          <p className="mt-4 text-body text-ink-soft">
            자사 제품으로 실제로 만드는 요리 1~3개부터 직접 올려보세요. 별도 제휴 없이 일반 Recipe와 같은 작성 흐름으로 시작합니다.
          </p>
          <PartnerActionLink
            href="/signup?next=%2Frecipes%2Fnew"
            segment="brand"
            action="signup_to_recipe"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
          >
            제품 활용 Recipe 1개 올려보기
          </PartnerActionLink>
          <p className="mt-2 text-center text-meta text-ink-soft">가입 → 프로필 → Recipe 작성</p>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-value">
          <h2 id="brand-value" className="text-heading text-ink">브랜드가 얻는 실제 쓰임</h2>
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

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-start">
          <h2 id="brand-start" className="text-heading text-ink">첫 제품 활용 Recipe는 이렇게 시작합니다</h2>
          <ol className="mt-4 divide-y divide-border border-y border-border">
            {startSteps.map(({ title, description }, index) => (
              <li key={title} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 py-4">
                <span className="pt-0.5 text-meta tabular-nums text-ink-soft">{index + 1}</span>
                <div className="min-w-0">
                  <p className="text-label text-ink">{title}</p>
                  <p className="mt-1 text-meta text-ink-soft">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <PartnerProof segment="brand" />
      </article>
    </div>
  )
}
