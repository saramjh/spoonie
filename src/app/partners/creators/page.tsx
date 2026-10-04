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
  title: "요리 크리에이터 이용 안내 | Spoonie",
  description:
    "기존 요리 콘텐츠를 구조화된 Recipe로 남기고 직접 만든 기록과 참고·파생 Recipe가 이어지게 하는 Spoonie 크리에이터 이용 안내.",
  alternates: { canonical: `${baseUrl}/partners/creators` },
  openGraph: {
    title: "요리 크리에이터 이용 안내 | Spoonie",
    description: "기존 Recipe 몇 개부터 Spoonie에 직접 올려볼 수 있습니다.",
    url: `${baseUrl}/partners/creators`,
    siteName: "Spoonie",
    type: "website",
    images: [{ url: `${baseUrl}/og-default.png`, width: 1200, height: 630, alt: "Spoonie" }],
  },
}

const creatorFlow = [
  {
    label: "기존 요리 콘텐츠",
    description: "SNS나 블로그에 이미 올린 요리 중 다시 찾기 좋은 것부터 고릅니다.",
    icon: UsersRound,
  },
  {
    label: "Spoonie Recipe",
    description: "재료·분량·단계·사진을 실제로 다시 요리할 수 있는 형태로 남깁니다.",
    icon: BookOpen,
  },
  {
    label: "직접 만들어 본 기록",
    description: "누군가 직접 만든 사진과 경험을 Recipeed로 원 Recipe에 연결할 수 있습니다.",
    icon: Soup,
  },
  {
    label: "참고·파생 Recipe",
    description: "원 Recipe를 참고한 새 Recipe가 생기면 그 관계를 이어서 남길 수 있습니다.",
    icon: GitBranch,
  },
  {
    label: "내 프로필에 축적",
    description: "Recipe와 공개 활동이 작성자 프로필에 계속 남습니다.",
    icon: UserRoundCheck,
  },
]

const creatorSignals = [
  { label: "구조화된 Recipe", icon: BookOpen },
  { label: "원 Recipe 연결", icon: GitFork },
  { label: "실제 조리 기록", icon: Soup },
  { label: "검색 가능한 공개 콘텐츠", icon: Search },
]

export default function CreatorPartnersPage() {
  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">For Cooking Creators</p>
          <h1 className="mt-2 text-display text-ink">
            내 레시피가
            <br />
            피드에서 끝나지 않게
          </h1>
          <p className="mt-4 text-body text-ink-soft">
            별도 파트너 계약이나 프로그램에 들어올 필요는 없습니다. 이미 만든 요리 중 몇 개만 Spoonie Recipe로
            직접 올려보고, 다시 찾고 다른 요리와 이어지는 방식이 실제로 쓸 만한지 확인해 보세요.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6" aria-labelledby="creator-why">
          <h2 id="creator-why" className="text-heading text-ink">SNS에 있는데 왜 또 올리나요?</h2>
          <p className="mt-3 text-body text-ink-soft">
            짧은 영상과 피드는 발견에는 강하지만 시간이 지나면 재료·분량·조리 과정과 후속 조리 기록이 흩어집니다.
            Spoonie는 그것을 Recipe 기준으로 다시 꺼내 쓸 수 있게 남깁니다.
          </p>
        </section>

        <PartnerFlow
          title="기존 콘텐츠 몇 개부터"
          summary="처음부터 전체 콘텐츠를 옮길 필요는 없습니다. 실제로 다시 만들 가치가 있는 Recipe부터 시작하면 됩니다."
          steps={creatorFlow}
          signals={creatorSignals}
        />

        <PartnerProof segment="creator" />

        <section className="border-t border-border px-4 py-6" aria-labelledby="creator-value">
          <div className="flex items-center gap-2">
            <UserRoundCheck className="h-5 w-5 text-ink" aria-hidden />
            <h2 id="creator-value" className="text-heading text-ink">지금 얻을 수 있는 것</h2>
          </div>
          <div className="mt-4 border-y border-border">
            <p className="py-3 text-label text-ink">작성한 Recipe가 내 공개 프로필에 축적됩니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">재료·분량·조리 단계를 다시 찾기 쉬운 형태로 남깁니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">다른 Recipe를 참고했다면 출처 관계를 연결할 수 있습니다.</p>
            <p className="border-t border-border py-3 text-label text-ink">누군가 실제로 만든 기록이 생기면 원 Recipe와 이어질 수 있습니다.</p>
          </div>
          <p className="mt-4 text-meta text-ink-soft">
            Spoonie는 아직 작은 서비스라 신규 노출이나 수익을 보장하지 않습니다. 지금 확인할 가치는 Recipe를 기록하고
            다시 쓰는 경험 자체입니다.
          </p>
        </section>

        <section className="border-t border-border px-4 py-6">
          <p className="text-heading text-ink">바로 Recipe를 올려봐도 됩니다</p>
          <p className="mt-2 text-meta text-ink-soft">
            가입 후 Recipe 작성 화면으로 바로 이어집니다. 우선 기존 콘텐츠 1~3개 정도면 충분합니다.
          </p>
          <PartnerActionLink
            href="/signup?next=%2Frecipes%2Fnew"
            segment="creator"
            action="signup_to_recipe"
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
          >
            가입하고 첫 Recipe 올리기
          </PartnerActionLink>
        </section>

        <section className="border-t border-border px-4 py-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-ink" aria-hidden />
            <p className="text-heading text-ink">시작 전에 궁금한 점이 있다면</p>
          </div>
          <p className="mt-2 text-meta text-ink-soft">
            어떤 Recipe부터 올릴지, 기존 콘텐츠를 어떻게 옮길지 궁금하면 남겨주세요. 제안 메일을 받고 오셨다면 그 메일에
            그대로 회신해도 됩니다.
          </p>
          <PartnerInquiryForm segment="creator" />
        </section>
      </article>
    </div>
  )
}
