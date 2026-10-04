import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, GitFork, UserRoundCheck } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"

export const metadata: Metadata = {
  title: "요리 크리에이터 파트너 | Spoonie",
  description:
    "요리 콘텐츠를 구조화된 Recipe로 남기고 실제로 만들어 본 Recipeed와 참고·파생 Recipe를 연결하는 Spoonie 크리에이터 파일럿.",
  alternates: { canonical: `${baseUrl}/partners/creators` },
  openGraph: {
    title: "요리 크리에이터 파트너 | Spoonie",
    description: "내 레시피가 게시물 하나로 끝나지 않고 실제 조리 경험과 다음 Recipe로 이어지게.",
    url: `${baseUrl}/partners/creators`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

const flow = [
  ["내 Recipe", "재료·분량·단계·사진을 요리할 수 있는 형태로 남깁니다."],
  ["직접 만들어 본 기록", "다른 사용자가 만든 사진과 경험을 Recipeed로 원 Recipe에 연결할 수 있습니다."],
  ["참고·파생 Recipe", "원 Recipe를 참고해 새 Recipe를 만들면 그 관계를 함께 남길 수 있습니다."],
]

export default function CreatorPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-7">
          <p className="text-meta text-ink-soft">For Cooking Creators</p>
          <h1 className="mt-2 text-display text-ink">
            내 레시피가
            <br />
            피드에서 끝나지 않게
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            Spoonie는 요리 콘텐츠를 다시 올릴 곳 하나를 더 만들려는 서비스가 아닙니다. Recipe를 중심으로 실제로
            만들어 본 기록과 다음 Recipe가 이어지는 구조가 크리에이터에게 가치가 있는지 검증하고 있습니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="creator-why">
          <h2 id="creator-why" className="text-heading text-ink">이미 SNS가 있는데 왜 Spoonie인가요?</h2>
          <p className="mt-3 text-body text-ink-soft">
            짧은 영상과 피드는 발견에는 강하지만, 시간이 지나면 재료·분량·조리 과정과 “누가 실제로 만들어
            봤는지”가 서로 다른 게시물과 댓글에 흩어집니다. Spoonie는 그 관계를 Recipe 기준으로 남깁니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="creator-flow">
          <div className="flex items-center gap-2">
            <GitFork className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="creator-flow" className="text-heading text-ink">Recipe에서 이어지는 흐름</h2>
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

        <section className="border-t border-border px-4 py-6" aria-labelledby="creator-value">
          <div className="flex items-center gap-2">
            <UserRoundCheck className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="creator-value" className="text-heading text-ink">크리에이터에게 남는 것</h2>
          </div>
          <div className="mt-4 border-y border-border">
            <p className="py-3 text-label text-ink">작성한 Recipe가 내 Spoonie 프로필에 계속 축적됩니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">실제로 만든 사람의 기록이 원 Recipe와 연결됩니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">참고한 Recipe와 새 Recipe 사이의 관계를 남길 수 있습니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">공개 Recipe는 검색 가능한 콘텐츠로 제공됩니다.</p>
          </div>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="creator-pilot">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="creator-pilot" className="text-heading text-ink">파일럿은 작게 시작합니다</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            기존 콘텐츠 전체를 옮기거나 별도 계약부터 요구하지 않습니다. 먼저 직접 선택한 몇 개의 Recipe로
            구조화·조리 기록·참고 관계가 실제로 유용한지 확인하는 방식이 적합하다고 보고 있습니다.
          </p>
          <p className="mt-4 text-meta text-ink-soft">
            Spoonie는 아직 초기 단계입니다. 대규모 신규 노출이나 수익을 보장하지 않습니다. 대신 현재 제품에서
            실제로 동작하는 구조를 보고 참여 가치가 있는지 판단할 수 있습니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6">
          <p className="text-heading text-ink">먼저 제품을 확인해 보세요</p>
          <p className="mt-2 text-meta text-ink-soft">
            제안 메일을 받고 오셨다면 궁금한 점이나 파일럿 의향은 해당 메일에 그대로 회신해 주세요.
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
