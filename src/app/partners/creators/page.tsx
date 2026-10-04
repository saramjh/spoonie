import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, GitBranch, GitFork, Search, Soup, UserRoundCheck, UsersRound } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import PartnerActionLink from "../partner-action-link"
import PartnerFlow from "../partner-flow"
import PartnerInquiryForm from "../partner-inquiry-form"
import PartnerProof from "../partner-proof"

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

const creatorFlow = [
  {
    label: "SNS 콘텐츠",
    description: "발견은 빠르지만 재료·분량·후속 조리 경험은 피드 밖으로 흩어지기 쉽습니다.",
    icon: UsersRound,
  },
  {
    label: "Spoonie Recipe",
    description: "재료·분량·단계·사진을 실제로 다시 요리할 수 있는 형태로 남깁니다.",
    icon: BookOpen,
  },
  {
    label: "직접 만들어 본 기록",
    description: "누군가 직접 만들어 본 사진과 경험을 Recipeed로 원 Recipe에 연결할 수 있습니다.",
    icon: Soup,
  },
  {
    label: "참고·파생 Recipe",
    description: "원 Recipe를 참고해 새 Recipe가 생기면 그 관계를 이어서 남길 수 있습니다.",
    icon: GitBranch,
  },
  {
    label: "Creator 프로필 자산",
    description: "Recipe와 연결된 활동이 작성자의 공개 프로필에 계속 축적됩니다.",
    icon: UserRoundCheck,
  },
]

const creatorSignals = [
  { label: "구조화된 Recipe", icon: BookOpen },
  { label: "원 Recipe 연결", icon: GitFork },
  { label: "실제 조리 경험", icon: Soup },
  { label: "검색 가능한 공개 자산", icon: Search },
]

export default function CreatorPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">Founding Creator</p>
          <h1 className="mt-2 text-display text-ink">
            내 레시피가
            <br />
            피드에서 끝나지 않게
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            Spoonie는 지금 첫 Creator cohort를 만드는 초기 단계입니다. 요리 콘텐츠를 다시 올릴 곳 하나를 더 만드는 대신,
            기존 Recipe 몇 개부터 구조화하고 실제 조리 기록과 다음 Recipe가 이어지는 방식을 함께 검증할 Founding Creator를 찾고 있습니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="creator-why">
          <h2 id="creator-why" className="text-heading text-ink">이미 SNS가 있는데 왜 Spoonie인가요?</h2>
          <p className="mt-3 text-body text-ink-soft">
            짧은 영상과 피드는 발견에는 강하지만, 시간이 지나면 재료·분량·조리 과정과 “누가 실제로 만들어
            봤는지”가 서로 다른 게시물과 댓글에 흩어집니다. Spoonie는 그 관계를 Recipe 기준으로 남깁니다.
          </p>
        </section>

        <PartnerFlow
          title="한 번의 게시물에서, 다음 요리까지"
          summary="Spoonie의 차이는 콘텐츠를 다시 진열하는 데 있지 않습니다. 원 Recipe를 중심으로 실제 조리와 파생 관계가 계속 남는 데 있습니다."
          steps={creatorFlow}
          signals={creatorSignals}
        />

        <PartnerProof segment="creator" />

        <section className="border-t border-border px-4 py-6" aria-labelledby="creator-value">
          <div className="flex items-center gap-2">
            <UserRoundCheck className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="creator-value" className="text-heading text-ink">크리에이터에게 남는 것</h2>
          </div>
          <div className="mt-4 border-y border-border">
            <p className="py-3 text-label text-ink">작성한 Recipe가 내 Spoonie 프로필에 계속 축적됩니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">직접 만들어 본 사람의 기록을 원 Recipe에 연결할 수 있습니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">참고한 Recipe와 새 Recipe 사이의 관계를 남길 수 있습니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">공개 Recipe는 검색 가능한 콘텐츠로 제공됩니다.</p>
          </div>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="creator-pilot">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="creator-pilot" className="text-heading text-ink">Founding Creator는 작게 시작합니다</h2>
          </div>
          <p className="mt-3 text-body text-ink-soft">
            기존 콘텐츠 전체를 옮기거나 별도 계약부터 요구하지 않습니다. 먼저 직접 선택한 몇 개의 Recipe로
            구조화·조리 기록·참고 관계가 실제로 유용한지 확인하는 방식이 적합하다고 보고 있습니다.
          </p>
          <p className="mt-4 text-meta text-ink-soft">
            아직 큰 Creator network나 대규모 신규 노출을 약속할 단계는 아닙니다. 지금 참여하는 Creator는
            초기 사용 흐름과 Recipe 연결 방식을 실제로 만들고 검증하는 첫 cohort가 됩니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6">
          <p className="text-heading text-ink">Founding Creator로 몇 개의 Recipe부터 시작해 보세요</p>
          <p className="mt-2 text-meta text-ink-soft">
            제안 메일을 받고 오셨다면 그대로 회신하셔도 됩니다. 처음 방문하셨다면 아래에서 채널과 검증해보고 싶은
            Recipe를 알려주세요.
          </p>
          <PartnerInquiryForm segment="creator" />
          <div className="mt-5">
            <PartnerActionLink
              href="/"
              segment="creator"
              action="site_open"
              className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}
            >
              Spoonie 둘러보기
            </PartnerActionLink>
          </div>
          <p className="mt-4 text-center text-meta text-ink-soft">
            직접 시작하고 싶다면{" "}
            <PartnerActionLink href="/signup" segment="creator" action="signup_open" className="underline underline-offset-2">
              프로필 만들기
            </PartnerActionLink>
          </p>
        </section>
      </article>
    </div>
  )
}
