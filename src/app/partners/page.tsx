import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, GitFork, Search, Users } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "크리에이터·브랜드 파트너 | Spoonie",
  description:
    "요리 콘텐츠가 한 번의 게시물로 끝나지 않도록. Recipe와 Recipeed, 참고 레시피 연결을 통해 요리 콘텐츠와 실제 조리 경험을 이어가는 Spoonie 파트너 파일럿.",
  alternates: { canonical: `${baseUrl}/partners` },
  openGraph: {
    title: "크리에이터·브랜드 파트너 | Spoonie",
    description:
      "Recipe를 중심으로 크리에이터, 실제로 만든 사람, 파생 요리 경험을 연결하는 Spoonie 파트너 파일럿.",
    url: `${baseUrl}/partners`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

const networkSteps = [
  { label: "Recipe", description: "재료·분량·조리 단계를 구조화해 남깁니다." },
  { label: "Recipeed", description: "직접 만들어 본 사진과 경험이 원 Recipe와 이어집니다." },
  { label: "다음 요리", description: "참고한 Recipe를 인용해 변형과 파생 관계를 남길 수 있습니다." },
]

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-7">
          <p className="text-meta text-ink-soft">Spoonie Partner Pilot</p>
          <h1 className="mt-2 text-display text-ink">
            요리 콘텐츠가
            <br />
            게시물 하나로 끝나지 않게
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            Spoonie는 Recipe와 실제 조리 기록인 Recipeed를 연결합니다. 누가 어떤 레시피를 보고 만들었고,
            무엇을 참고해 다음 요리가 생겼는지를 콘텐츠 사이의 관계로 남깁니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-5" aria-labelledby="network-title">
          <h2 id="network-title" className="text-heading text-ink">Recipe에서 시작되는 연결</h2>
          <div className="mt-4 space-y-0">
            {networkSteps.map((step, index) => (
              <div key={step.label} className="flex gap-3 border-b border-border py-4 last:border-b-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-paper text-label tabular-nums text-ink">
                  {index + 1}
                </div>
                <div>
                  <p className="text-label text-ink">{step.label}</p>
                  <p className="mt-1 text-meta text-ink-soft">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="creators" className="border-t border-border px-4 py-6 scroll-mt-16">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">요리 크리에이터라면</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            SNS에서 빠르게 소비되는 요리 콘텐츠를 검색 가능한 Recipe로 남기고, 사람들이 실제로 만들어 본 기록과
            파생 레시피를 원 콘텐츠에 연결할 수 있습니다.
          </p>
          <div className="mt-5 border-y border-border">
            <p className="py-3 text-label text-ink">내 Recipe를 프로필 자산으로 축적</p>
            <p className="border-t border-border py-3 text-label text-ink">팬의 “직접 만들어 봄” 기록을 원 Recipe와 연결</p>
            <p className="border-t border-border py-3 text-label text-ink">다른 Recipe와 참고·파생 관계를 남김</p>
          </div>
          <p className="mt-4 text-meta text-ink-soft">
            Spoonie는 초기 단계입니다. 기존 영향력을 빌려 달라는 제안보다, 크리에이터의 요리 콘텐츠가 장기적으로
            축적되고 이어질 수 있는 구조가 실제로 유용한지 함께 검증하는 파트너를 찾고 있습니다.
          </p>
        </section>

        <section id="brands" className="border-t border-border px-4 py-6 scroll-mt-16">
          <div className="flex items-center gap-2">
            <GitFork className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="text-heading text-ink">주방·식품 브랜드라면</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            제품을 보여주는 데서 끝내지 않고, 실제 제품 사용 장면을 Recipe로 만들고 그 Recipe를 기반으로 한
            크리에이터·사용자의 조리 경험이 이어지는 파일럿을 함께 설계할 수 있습니다.
          </p>
          <div className="mt-5 border-y border-border">
            <p className="py-3 text-label text-ink">제품이 실제로 쓰이는 조리 맥락을 Recipe로 축적</p>
            <p className="border-t border-border py-3 text-label text-ink">크리에이터 콘텐츠와 사용자 조리 경험을 같은 흐름에서 연결</p>
            <p className="border-t border-border py-3 text-label text-ink">일회성 협찬이 아니라 반복 사용 사례를 남기는 실험</p>
          </div>
          <p className="mt-4 text-meta text-ink-soft">
            별도의 제품 태깅·광고 네트워크가 이미 완성됐다는 뜻은 아닙니다. 현재 Spoonie의 Recipe·Recipeed·참고
            레시피 구조를 활용해 어떤 협업이 실제 가치가 있는지부터 검증합니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="current-title">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="current-title" className="text-heading text-ink">지금 확인할 수 있는 것</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            공개 Recipe, Recipeed, 작성자 프로필, 검색, 팔로우, 참고 Recipe 연결이 실제 서비스에 동작하고 있습니다.
            먼저 둘러보고 구조가 맞는지 판단할 수 있습니다.
          </p>
          <div className="mt-5 grid gap-2">
            <Link href="/" className={buttonVariants({ variant: "default", size: "lg" })}>
              Spoonie 둘러보기 <ArrowRight aria-hidden />
            </Link>
            <Link href="/signup" className={buttonVariants({ variant: "outline", size: "lg" })}>
              프로필 만들기
            </Link>
          </div>
        </section>
      </article>
    </div>
  )
}
