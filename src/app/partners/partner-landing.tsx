import Image from "next/image"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { loadUserOnboardingRequests } from "@/features/onboarding/data/onboarding-admin"
import { createSupabaseServerComponentClient } from "@/shared/infra/supabase-server"
import {
  authEntryHref,
  type PartnerEntrySource,
  withPartnerEntry,
} from "@/shared/lib/partner-entry"
import PartnerActionLink from "./partner-action-link"
import PartnerOnboardingForm from "./partner-onboarding-form"
import PartnerProof from "./partner-proof"
import PartnerRelationProof from "./partner-relation-proof"

type Segment = "creator" | "brand"

const copy: Record<
  Segment,
  {
    eyebrow: string
    title: string
    description: string
    directCta: string
    directHint: string
    setupTitle: string
    setupDescription: string
    setupCta: string
    sourcePath: "/partners/creators" | "/partners/brands"
    entry: PartnerEntrySource
  }
> = {
  creator: {
    eyebrow: "Spoonie × 요리 크리에이터",
    title: "피드에 묻히는 레시피를\n다시 쓰이는 Recipe로",
    description:
      "Spoonie는 레시피를 재료·분량·단계가 있는 Recipe로 남기고, 실제로 만든 기록과 참고·응용 관계를 이어가는 요리 소셜 서비스입니다.",
    directCta: "가입하고 Recipe 하나 올려보기",
    directHint: "직접 작성해도 되고, 기존 콘텐츠를 옮기는 도움을 받을 수도 있습니다.",
    setupTitle: "처음 작성이 번거롭다면",
    setupDescription:
      "이미 올린 Instagram 게시물·릴스 1~5개의 주소를 보내면 확인되는 내용을 내 계정의 비공개 Recipe 초안으로 정리합니다. 직접 확인·수정한 뒤 공개합니다.",
    setupCta: "계정 만들고 셋업 도움받기",
    sourcePath: "/partners/creators",
    entry: "partner_creator",
  },
  brand: {
    eyebrow: "Spoonie × 식품·주방 브랜드",
    title: "상품 설명을 넘어\n실제 쓰는 법을 Recipe로",
    description:
      "Spoonie는 제품이 실제 요리에 어떻게 쓰이는지 Recipe로 남기고, 여러 활용법과 팬의 조리·응용 관계를 이어갈 수 있는 요리 소셜 서비스입니다.",
    directCta: "가입하고 제품 활용 Recipe 올리기",
    directHint: "직접 작성해도 되고, 기존 활용 콘텐츠를 옮기는 도움을 받을 수도 있습니다.",
    setupTitle: "기존 활용 콘텐츠가 있다면",
    setupDescription:
      "자사몰·SNS의 제품 활용 자료 1~5개의 주소를 보내면 실제로 따라 만들 수 있다고 확인되는 내용을 브랜드 계정의 비공개 Recipe 초안으로 정리합니다.",
    setupCta: "계정 만들고 셋업 도움받기",
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
  const setupNext = text.sourcePath + "?setup=1#setup"
  const directHref = user
    ? withPartnerEntry(directNext, text.entry)
    : authEntryHref("/signup", directNext, text.entry)
  const setupHref = user
    ? "#setup"
    : authEntryHref("/signup", setupNext, text.entry)
  const loginHref = authEntryHref("/login", text.sourcePath, text.entry)

  const requests = user
    ? (await loadUserOnboardingRequests(user.id)).filter(
        (request) => request.actorType === segment,
      )
    : []

  return (
    <div className="min-h-screen bg-door px-3 py-4">
      <article className="mx-auto max-w-md overflow-hidden rounded-[3px] bg-paper shadow-sm">
        <section className="px-4 pb-6 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>

          <p className="mt-5 text-meta text-ink-soft">{text.eyebrow}</p>
          <h1 className="mt-2 whitespace-pre-line text-display text-ink">{text.title}</h1>
          <p className="mt-4 text-body text-ink-soft">{text.description}</p>

          <PartnerActionLink
            href={directHref}
            segment={segment}
            action={user ? "recipe_create_open" : "signup_to_recipe"}
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className: "mt-5 w-full",
            })}
          >
            {text.directCta}
          </PartnerActionLink>

          {!user && (
            <p className="mt-3 text-center text-meta text-ink-soft">
              이미 계정이 있나요?{" "}
              <PartnerActionLink
                href={loginHref}
                segment={segment}
                action="login_open"
                className="text-ink underline underline-offset-4"
              >
                로그인
              </PartnerActionLink>
            </p>
          )}

          <p className="mt-4 border-t border-border pt-4 text-meta text-ink-soft">
            {text.directHint}
          </p>
        </section>

        <PartnerRelationProof segment={segment} />

        <section
          id="setup"
          className="scroll-mt-4 border-t border-border px-4 py-6"
          aria-labelledby={segment + "-setup-title"}
        >
          <h2 id={segment + "-setup-title"} className="text-heading text-ink">
            {text.setupTitle}
          </h2>
          <p className="mt-2 text-body text-ink-soft">{text.setupDescription}</p>

          {user ? (
            <PartnerOnboardingForm actorType={segment} initialRequests={requests} />
          ) : (
            <>
              <PartnerActionLink
                href={setupHref}
                segment={segment}
                action="setup_signup_open"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "mt-5 w-full",
                })}
              >
                {text.setupCta}
              </PartnerActionLink>
              <p className="mt-2 text-center text-meta text-ink-soft">
                가입 후 이 위치로 돌아와 기존 콘텐츠 주소를 보낼 수 있습니다.
              </p>
            </>
          )}
        </section>

        <PartnerProof segment={segment} />
      </article>
    </div>
  )
}
