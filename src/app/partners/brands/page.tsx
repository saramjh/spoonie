import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, CookingPot, GitBranch, Package, Search, ShieldCheck, Soup } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import PartnerActionLink from "../partner-action-link"
import PartnerFlow from "../partner-flow"
import PartnerInquiryForm from "../partner-inquiry-form"
import PartnerProof from "../partner-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "식품·주방 브랜드 이용 안내 | Spoonie",
  description:
    "식품·주방 브랜드가 자사 제품을 실제로 활용하는 Recipe를 Spoonie에 직접 게시하는 방법과 콘텐츠 기준.",
  alternates: { canonical: `${baseUrl}/partners/brands` },
  openGraph: {
    title: "식품·주방 브랜드 이용 안내 | Spoonie",
    description: "자사 제품을 실제 요리에 쓰는 Recipe를 브랜드가 직접 올릴 수 있습니다.",
    url: `${baseUrl}/partners/brands`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

const brandFlow = [
  {
    label: "자사 제품",
    description: "식재료·소스·조리도구처럼 실제 요리 과정에서 쓰이는 제품을 고릅니다.",
    icon: Package,
  },
  {
    label: "브랜드가 직접 Recipe 작성",
    description: "제품 설명이 아니라 재료·분량·단계가 있는 실제 조리 가능한 Recipe로 올립니다.",
    icon: BookOpen,
  },
  {
    label: "공개 Recipe",
    description: "다른 공개 Recipe와 같은 검색·프로필·공유 경로에서 노출될 수 있습니다.",
    icon: Search,
  },
  {
    label: "만들어 본 기록",
    description: "누군가 실제로 요리해 Recipeed를 남기면 원 Recipe와 연결될 수 있습니다.",
    icon: Soup,
  },
  {
    label: "참고·파생 Recipe",
    description: "다른 Recipe가 참고 관계를 남기면 제품의 실제 사용 맥락도 함께 이어질 수 있습니다.",
    icon: GitBranch,
  },
]

const brandSignals = [
  { label: "브랜드가 직접 게시", icon: CookingPot },
  { label: "실제 조리 가능한 Recipe", icon: BookOpen },
  { label: "제품 관계를 투명하게 표시", icon: ShieldCheck },
  { label: "일반 콘텐츠와 같은 발견 규칙", icon: Search },
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
          <h1 className="mt-2 text-display text-ink">
            자사 제품으로 만든
            <br />
            Recipe를 직접 올려도 됩니다
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            Creator가 모일 때까지 기다릴 필요는 없습니다. 식품·소스·조리도구 브랜드도 직접 가입해 자사 제품을 실제로
            활용하는 Recipe를 게시할 수 있습니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-rule">
          <h2 id="brand-rule" className="text-heading text-ink">광고판이 아니라 요리 콘텐츠로</h2>
          <p className="mt-3 text-body text-ink-soft">
            제품 구매를 유도하는 카탈로그 글보다, 그 제품으로 실제 무엇을 어떻게 만들 수 있는지가 먼저여야 합니다.
            자사 제품이거나 제품을 제공·협찬받은 관계라면 프로필 또는 본문에서 그 관계를 분명히 밝혀주세요.
          </p>
        </section>

        <PartnerFlow
          title="지금 바로 가능한 흐름"
          summary="브랜드가 직접 Recipe를 만드는 데 Creator 매칭은 필요하지 않습니다. 이후 사용자 활동은 실제로 발생할 때만 관계가 이어집니다."
          steps={brandFlow}
          signals={brandSignals}
        />

        <PartnerProof segment="brand" />

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-standard">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="brand-standard" className="text-heading text-ink">브랜드 Recipe 기준</h2>
          </div>
          <div className="mt-4 border-y border-border">
            <p className="py-3 text-label text-ink">재료·분량·조리 단계가 있어 실제로 따라 만들 수 있어야 합니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">브랜드가 권리를 가진 사진과 내용을 사용해야 합니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">자사 제품·협찬·제공 관계를 숨기지 않습니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">같은 제품 광고를 반복하거나 과장된 효능을 주장하는 글은 허용하지 않습니다.</p>
          </div>
        </section>

        <section className="border-t border-border px-4 py-6">
          <p className="text-heading text-ink">현재 제공하지 않는 것</p>
          <p className="mt-3 text-body text-ink-soft">
            Spoonie는 아직 Creator 매칭, 유료 캠페인 운영, 도달·판매 성과 보장 서비스를 제공하지 않습니다.
            브랜드와 Creator를 연결하는 중개 모델은 실제 사용자 활동이 충분히 생긴 뒤 별도로 검토할 수 있습니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6">
          <p className="text-heading text-ink">브랜드 계정으로 직접 시작해 보세요</p>
          <p className="mt-2 text-meta text-ink-soft">
            가입 후 Recipe 작성 화면으로 바로 이어집니다. 첫 게시물은 제품 하나를 실제로 활용하는 Recipe 하나면 충분합니다.
          </p>
          <PartnerActionLink
            href="/signup?next=%2Frecipes%2Fnew"
            segment="brand"
            action="signup_to_recipe"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
          >
            가입하고 브랜드 Recipe 올리기
          </PartnerActionLink>
        </section>

        <section className="border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <CookingPot className="h-5 w-5 text-ink" aria-hidden />
            <p className="text-heading text-ink">운영 기준이 궁금하다면</p>
          </div>
          <p className="mt-2 text-meta text-ink-soft">
            올리려는 제품과 Recipe 맥락을 남겨주세요. 기존 제안 메일을 받았다면 그 메일에 그대로 회신해도 됩니다.
          </p>
          <PartnerInquiryForm segment="brand" />
        </section>
      </article>
    </div>
  )
}
