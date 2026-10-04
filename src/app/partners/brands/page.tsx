import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CookingPot, GitFork, SearchCheck } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

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

const flow = [
  ["제품이 쓰이는 Recipe", "냄비·팬·조리도구·식재료가 실제 어떤 요리에 쓰이는지 콘텐츠로 남깁니다."],
  ["실제 조리 기록", "크리에이터나 사용자가 직접 만들어 본 경험을 Recipe와 연결할 수 있습니다."],
  ["다음 사용 사례", "참고·변형 Recipe가 생기면 제품이 쓰인 조리 맥락도 함께 확장될 가능성을 검증합니다."],
]

export default function BrandPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-7">
          <p className="text-meta text-ink-soft">For Kitchen & Food Brands</p>
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

        <section className="border-t border-border px-4 py-6" aria-labelledby="brand-flow">
          <div className="flex items-center gap-2">
            <GitFork className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="brand-flow" className="text-heading text-ink">제품에서 요리 경험으로</h2>
          </div>
          <div className="mt-4">
            {flow.map(([title, description], index) => (
              <div key={title} className="flex gap-3 border-b border-border py-4 last:border-b-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-label tabular-nums text-ink">
                  {index + 1}
                </span>
                <div>
                  <p className="text-label text-ink">{title}</p>
                  <p className="mt-1 text-meta text-ink-soft">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

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
          <p className="text-heading text-ink">서비스를 먼저 확인해 보세요</p>
          <p className="mt-2 text-meta text-ink-soft">
            제안 메일을 받고 오셨다면 제품이나 파일럿 범위에 대한 질문은 해당 메일에 그대로 회신해 주세요.
          </p>
          <div className="mt-5 grid gap-2">
            <Link href="/" className={buttonVariants({ variant: "default", size: "lg" })}>
              Spoonie 둘러보기 <ArrowRight aria-hidden />
            </Link>
            <Link href="/partners" className={buttonVariants({ variant: "outline", size: "lg" })}>
              파트너 안내로 돌아가기
            </Link>
          </div>
        </section>
      </article>
    </div>
  )
}
