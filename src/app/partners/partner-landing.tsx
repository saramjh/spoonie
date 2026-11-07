import Image from "next/image"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/kit"
import { loadUserOnboardingRequests } from "@/features/onboarding/data/onboarding-admin"
import { createSupabaseServerComponentClient } from "@/shared/infra/supabase-server"
import {
  authEntryHref,
  type PartnerEntrySource,
  withPartnerEntry,
} from "@/shared/lib/partner-entry"
import PartnerActionLink from "./partner-action-link"
import PartnerOnboardingForm from "./partner-onboarding-form"
import PartnerProductTour from "./partner-product-tour"

type Segment = "creator" | "brand"

const copy: Record<
  Segment,
  {
    eyebrow: string
    title: string
    description: string
    directCta: string
    setupTitle: string
    setupDescription: string
    setupCta: string
    sourcePath: "/partners/creators" | "/partners/brands"
    entry: PartnerEntrySource
  }
> = {
  creator: {
    eyebrow: "Spoonie × 요리 크리에이터",
    title: "내 레시피가\n누군가의 한 끼로 이어질 때",
    description:
      "레시피를 다시 만들 수 있는 Recipe로 쌓고, 만든 기록과 참고·응용 관계를 원본과 이어갑니다.",
    directCta: "내 레시피 쓰기",
    setupTitle: "옮겨 적는 게 먼저 걸린다면",
    setupDescription:
      "가입 후 기존 Instagram 게시물·릴스 1~5개 주소를 보내세요. 접수된 자료는 매시간 한 번씩 일괄 확인·처리하며, 확인되는 정보만 내 계정의 비공개 Recipe 초안으로 정리합니다. 내가 검수한 뒤 공개합니다.",
    setupCta: "가입하고 첫 Recipe 도움받기",
    sourcePath: "/partners/creators",
    entry: "partner_creator",
  },
  brand: {
    eyebrow: "Spoonie × 식품·주방 브랜드",
    title: "제품 사진을 넘어\n실제 요리 방법으로",
    description:
      "고객이 제품으로 무엇을 만들 수 있는지 활용 Recipe로 직접 보여주세요. 따라 만든 기록이 생기면 원본과 이어집니다.",
    directCta: "활용 Recipe 쓰기",
    setupTitle: "기존 활용 자료부터 옮기고 싶다면",
    setupDescription:
      "가입 후 자사몰·SNS의 활용 자료 1~5개 주소를 보내세요. 접수된 자료는 매시간 한 번씩 일괄 확인·처리하며, 따라 만들 수 있다고 확인되는 정보만 브랜드 계정의 비공개 Recipe 초안으로 정리합니다.",
    setupCta: "가입하고 첫 Recipe 도움받기",
    sourcePath: "/partners/brands",
    entry: "partner_brand",
  },
}

export default async function PartnerLanding({ segment }: { segment: Segment }) {
  const text = copy[segment]
  const supabase = await createSupabaseServerComponentClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const directNext = "/recipes/new"
  const setupNext = segment === "creator" ? "/partners/creators/import" : text.sourcePath + "?setup=1#setup"
  const directHref = user
    ? withPartnerEntry(directNext, text.entry)
    : authEntryHref("/signup", directNext, text.entry)
  const loginHref = authEntryHref("/login", text.sourcePath, text.entry)
  const setupButtonClass = buttonVariants({
    variant: "outline",
    size: "lg",
    className: "mt-4 w-full",
  })
  const brandRequests = user && segment === "brand"
    ? (await loadUserOnboardingRequests(user.id)).filter((request) => request.actorType === "brand")
    : []

  return (
    <div className="min-h-screen bg-paper">
      <PageHeader title={segment === "creator" ? "크리에이터 안내" : "브랜드 안내"} />
      <article className="mx-auto max-w-md">
        <section className="px-4 pb-5 pt-6">
          <h1 className="whitespace-pre-line text-display text-ink">{text.title}</h1>
          <p className="mt-4 text-body text-ink">{text.description}</p>
          <figure className="mt-5">
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-paper-tint">
              <Image
                src={segment === "creator" ? "/partners-cooking-example.webp" : "/partners-sandwich-example.webp"}
                alt={segment === "creator" ? "토마토 크림 파스타 조리 예시" : "달걀 샌드위치 조리 예시"}
                fill priority sizes="(max-width: 448px) calc(100vw - 32px), 416px"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-1.5 text-meta text-ink-soft">구성 예시 이미지 · 실제 사용자 활동이 아닙니다.</figcaption>
          </figure>
          <PartnerActionLink href={directHref} segment={segment}
            action={user ? "hero_recipe_create_open" : "hero_signup_to_recipe"}
            className={buttonVariants({ variant: "default", size: "lg", className: "mt-4 w-full" })}>
            {text.directCta}
          </PartnerActionLink>
          {!user && (
            <p className="mt-3 text-center text-meta text-ink-soft">
              이미 계정이 있나요?{" "}
              <PartnerActionLink href={loginHref} segment={segment} action="login_open"
                className="text-ink underline underline-offset-4">로그인</PartnerActionLink>
            </p>
          )}
        </section>

        <section className="border-t border-border px-4 py-5">
          <h2 className="text-heading font-semibold text-ink">Recipe로 정리하고</h2>
          <p className="mt-2 text-body text-ink-soft">사진, 재료와 분량, 만드는 순서를 한곳에 남겨요.</p>
          <p className="mt-3 text-meta text-ink-soft">화면 예시 · 2인분 · 25분 · 재료 5가지</p>
        </section>
        <section className="border-t border-border px-4 py-5">
          <h2 className="text-heading font-semibold text-ink">만든 기록과 이어져요</h2>
          <p className="mt-2 text-body text-ink-soft">
            참고한 Recipe와 만든 기록은 원래 Recipe로 이어져요. 연결 방식은 아래에서 직접 확인할 수 있습니다.
          </p>
        </section>

        <PartnerProductTour segment={segment} />

        <section
          id="setup"
          className="scroll-mt-4 border-t border-border px-4 py-6"
          aria-labelledby={segment + "-setup-title"}
        >
          <p className="text-micro font-medium text-ink-soft">선택 사항 · 첫 작성 부담 줄이기</p>
          <h2 id={segment + "-setup-title"} className="mt-1 text-heading text-ink">
            {text.setupTitle}
          </h2>
          <p className="mt-2 text-body text-ink-soft">{text.setupDescription}</p>

          {user && segment === "brand" ? (
            <PartnerOnboardingForm actorType="brand" initialRequests={brandRequests} />
          ) : user ? (
            <Link href={setupNext} className={setupButtonClass}>{text.setupCta}</Link>
          ) : (
            <>
              <PartnerActionLink
                href={authEntryHref("/signup", setupNext, text.entry)}
                segment={segment}
                action="setup_signup_open"
                className={setupButtonClass}
              >
                {text.setupCta}
              </PartnerActionLink>
              <p className="mt-2 text-center text-meta text-ink-soft">
                계정을 만든 뒤 기존 콘텐츠 주소를 보낼 수 있습니다.
              </p>
            </>
          )}
        </section>
      </article>
    </div>
  )
}
