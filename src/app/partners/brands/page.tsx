import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, CookingPot, GitBranch, Package, SearchCheck, Soup, UsersRound } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import PartnerActionLink from "../partner-action-link"
import PartnerFlow from "../partner-flow"
import PartnerInquiryForm from "../partner-inquiry-form"
import PartnerProof from "../partner-proof"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
export const metadata: Metadata = {
  title: "주방·식품 브랜드 파트너 | Spoonie",
  description:
    "제품을 실제 Recipe 사용 맥락에 두고 크리에이터·사용자의 조리 기록과 참고·파생 Recipe로 이어가는 Spoonie 브랜드 파일럿.",
  alternates: { canonical: `${baseUrl}/partners/brands` },
  openGraph: {
    title: "주방·식품 브랜드 파트너 | Spoonie",
    description: "제품 노출 한 번이 아니라 실제 요리 사용 경험이 이어지는 Recipe 기반 파일럿.",
    url: `${baseUrl}/partners/brands`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

const brandFlow = [
  {
    label: "제품",
    description: "쿡웨어나 식재료처럼 실제 조리 과정에서 쓰이는 제품을 시작점으로 둡니다.",
    icon: Package,
  },
  {
    label: "제품이 쓰인 Recipe",
    description: "제품이 어떤 요리에서 어떻게 쓰이는지 실제 조리 가능한 Recipe로 남깁니다.",
    icon: BookOpen,
  },
  {
    label: "Creator·사용자 조리",
    description: "크리에이터와 사용자가 같은 Recipe를 실제로 만들어 보는 사용 맥락을 만듭니다.",
    icon: CookingPot,
  },
  {
    label: "Recipeed",
    description: "직접 만들어 본 사진과 경험을 원 Recipe에 연결해 단발 노출 뒤의 행동을 남깁니다.",
    icon: Soup,
  },
  {
    label: "파생 사용 사례",
    description: "참고·변형 Recipe가 생기면 제품이 쓰인 새로운 조리 맥락으로 관계가 확장될 수 있습니다.",
    icon: GitBranch,
  },
]

const brandSignals = [
  { label: "실제 사용 맥락", icon: CookingPot },
  { label: "Recipe 기반 콘텐츠", icon: BookOpen },
  { label: "Creator·사용자 연결", icon: UsersRound },
  { label: "파생 사용 사례", icon: SearchCheck },
]

export default function BrandPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">For Kitchen & Food Brands</p>
          <h1 className="mt-2 text-display text-ink">
            제품을 보여주는 데서
            <br />
            실제로 쓰이는 요리까지
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            Spoonie는 제품 노출 횟수를 파는 광고 네트워크가 아닙니다. 제품이 실제 Recipe 안에서 사용되고,
            그 Recipe를 기반으로 한 조리 경험이 이어지는 구조가 브랜드 콘텐츠 자산으로 유효한지 검증합니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-difference">
          <h2 id="brand-difference" className="text-heading text-ink">기존 협찬 콘텐츠와 무엇이 다른가요?</h2>
          <p className="mt-3 text-body text-ink-soft">
            일반 협찬은 게시물 자체의 도달에 집중하는 경우가 많습니다. Spoonie 파일럿은 제품이 실제로 쓰인
            Recipe를 기준으로, 이후의 조리 기록과 참고·파생 관계가 계속 붙을 수 있는지에 초점을 둡니다.
          </p>
        </section>

        <PartnerFlow
          title="제품 노출에서, 실제 사용 맥락까지"
          summary="광고 이미지를 한 번 더 만드는 것이 아니라 제품이 실제 Recipe에 쓰이고, 그 뒤의 조리 경험과 파생 사용 사례가 이어지는지를 검증합니다."
          steps={brandFlow}
          signals={brandSignals}
        />

        <PartnerProof segment="brand" />

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-pilot">
          <div className="flex items-center gap-2">
            <CookingPot className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="brand-pilot" className="text-heading text-ink">현재 제안하는 파일럿</h2>
          </div>
          <div className="mt-4 border-y border-border">
            <p className="py-3 text-label text-ink">한 제품 또는 한 제품군을 정합니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">실제 사용 맥락이 분명한 2~3개 Recipe부터 설계합니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">가능하면 크리에이터·사용자의 실제 조리 기록 연결을 검증합니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">반응과 운영 부담을 본 뒤 확대 여부를 판단합니다.</p>
          </div>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-current">
          <div className="flex items-center gap-2">
            <SearchCheck className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="brand-current" className="text-heading text-ink">현재 가능한 범위</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            Spoonie에는 공개 Recipe, Recipeed, 작성자 프로필, 검색, 팔로우, 참고 Recipe 연결이 동작합니다.
            별도의 제품 태깅 시스템, 광고 대시보드, 대규모 제휴 네트워크가 이미 구축됐다는 뜻은 아닙니다.
          </p>
          <p className="mt-4 text-meta text-ink-soft">
            따라서 현재 제안은 광고 상품 구매가 아니라, 실제 Recipe 구조를 이용해 제품-요리-사람의 연결이
            브랜드에도 유용한지 함께 확인하는 초기 파일럿입니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6">
          <p className="text-heading text-ink">제품 하나부터 파일럿을 논의할 수 있습니다</p>
          <p className="mt-2 text-meta text-ink-soft">
            제안 메일을 받고 오셨다면 그대로 회신하셔도 됩니다. 처음 방문하셨다면 아래에서 제품과 실제로 검증해보고
            싶은 조리 맥락을 알려주세요.
          </p>
          <PartnerInquiryForm segment="brand" />
          <div className="mt-5">
            <PartnerActionLink
              href="/"
              segment="brand"
              action="site_open"
              className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}
            >
              Spoonie 둘러보기
            </PartnerActionLink>
          </div>
          <p className="mt-4 text-center text-meta text-ink-soft">
            다른 파트너 유형을 찾는다면{" "}
            <PartnerActionLink href="/partners" segment="brand" action="hub_open" className="underline underline-offset-2">
              파트너 안내
            </PartnerActionLink>
          </p>
        </section>
      </article>
    </div>
  )
}
