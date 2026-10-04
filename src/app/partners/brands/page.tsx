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
  title: "주방·식품 브랜드 Early Access | Spoonie",
  description:
    "Spoonie의 Creator cohort 형성 이후 열 브랜드 Recipe 파일럿을 위한 Early Access. 제품·사용 맥락을 미리 공유하거나 기존 Creator와 조기 파일럿을 검토할 수 있습니다.",
  alternates: { canonical: `${baseUrl}/partners/brands` },
  openGraph: {
    title: "주방·식품 브랜드 Early Access | Spoonie",
    description: "Creator cohort 형성 이후 시작할 Recipe 기반 브랜드 파일럿을 미리 준비합니다.",
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
          <p className="mt-5 text-meta text-ink-soft">Brand Early Access</p>
          <h1 className="mt-2 text-display text-ink">
            제품을 보여주는 데서
            <br />
            실제로 쓰이는 요리까지
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            Spoonie는 지금 첫 Creator cohort를 만드는 단계라 Creator 매칭을 약속하지 않습니다.
            브랜드에는 cohort 형성 이후 열 파일럿을 위해 제품과 실제 사용 맥락을 미리 받거나,
            이미 함께하는 Creator가 있는 경우 조기 파일럿 가능성을 검토합니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-difference">
          <h2 id="brand-difference" className="text-heading text-ink">지금 브랜드가 할 수 있는 것은 무엇인가요?</h2>
          <p className="mt-3 text-body text-ink-soft">
            제품군과 실제 사용 맥락을 먼저 공유해두면 Creator cohort가 준비된 뒤 적합한 파일럿을 설계할 수 있습니다.
            이미 브랜드가 함께하는 요리 Creator를 보유하고 있다면 그 Creator가 Spoonie에 참여하는 방식의 조기 파일럿도 검토할 수 있습니다.
          </p>
        </section>

        <PartnerFlow
          title="Creator가 준비되면 이런 흐름을 검증합니다"
          summary="아래는 현재 확보된 Creator network를 뜻하지 않습니다. Spoonie가 만들려는 파일럿 구조이며, 실제 참여 Creator가 확보된 뒤 단계적으로 검증합니다."
          steps={brandFlow}
          signals={brandSignals}
        />

        <PartnerProof segment="brand" />

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-pilot">
          <div className="flex items-center gap-2">
            <CookingPot className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="brand-pilot" className="text-heading text-ink">파일럿을 여는 두 가지 경로</h2>
          </div>
          <div className="mt-4 border-y border-border">
            <p className="py-3 text-label text-ink">① 브랜드에 기존 요리 Creator가 있다면 함께 Spoonie 조기 파일럿을 검토합니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">② 기존 Creator가 없다면 제품군·사용 맥락을 Early Access로 남기고 Creator cohort 형성 뒤 검토합니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">파일럿이 열리면 한 제품군과 2~3개 Recipe 맥락부터 작게 시작합니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">Spoonie가 현재 없는 Creator나 도달 규모를 있는 것처럼 약속하지 않습니다.</p>
          </div>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-current">
          <div className="flex items-center gap-2">
            <SearchCheck className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="brand-current" className="text-heading text-ink">현재 가능한 범위</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            Spoonie에는 공개 Recipe, Recipeed, 작성자 프로필, 검색, 팔로우, 참고 Recipe 연결이 동작합니다.
            다만 현재는 Founding Creator를 모집하는 단계이며, 브랜드에 즉시 연결할 수 있는 Creator pool이 이미 있다는 뜻은 아닙니다.
          </p>
          <p className="mt-4 text-meta text-ink-soft">
            따라서 지금 브랜드 문의의 목적은 Creator 매칭 구매가 아니라 제품·사용 맥락을 미리 공유하거나,
            브랜드가 이미 보유한 Creator와 조기 파일럿 가능성을 확인하는 것입니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6">
          <p className="text-heading text-ink">브랜드 Early Access를 남겨두세요</p>
          <p className="mt-2 text-meta text-ink-soft">
            제안 메일을 받고 오셨다면 그대로 회신하셔도 됩니다. 처음 방문하셨다면 제품군, 실제로 만들고 싶은 Recipe 맥락,
            그리고 현재 함께하는 요리 Creator가 있는지를 알려주세요. Creator가 없다면 cohort 형성 이후 검토합니다.
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
