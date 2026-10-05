import Image from "next/image"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { loadUserOnboardingRequests } from "@/features/onboarding/data/onboarding-admin"
import { createSupabaseServerComponentClient } from "@/shared/infra/supabase-server"
import { authEntryHref, type PartnerEntrySource } from "@/shared/lib/partner-entry"
import PartnerActionLink from "./partner-action-link"
import PartnerOnboardingForm from "./partner-onboarding-form"
import PartnerProof from "./partner-proof"

type Segment = "creator" | "brand"

const copy: Record<
  Segment,
  {
    eyebrow: string
    title: string
    description: string
    detail: string
    setupTitle: string
    setupDescription: string
    sourcePath: "/partners/creators" | "/partners/brands"
    entry: PartnerEntrySource
  }
> = {
  creator: {
    eyebrow: "Spoonie × 요리 크리에이터",
    title: "인스타 레시피를\n다시 쓰지 않고 시작하세요",
    description:
      "계정을 만든 뒤 기존 Instagram 게시물·릴스 1~5개를 보내면, 확인되는 내용을 내 계정의 비공개 Recipe 초안으로 정리합니다.",
    detail: "가입 → 링크 제출 → 초안 확인·수정 → 공개",
    setupTitle: "기존 콘텐츠 보내기",
    setupDescription:
      "본인 콘텐츠 주소를 보내면 확인 가능한 정보만 Recipe 초안에 채웁니다.",
    sourcePath: "/partners/creators",
    entry: "partner_creator",
  },
  brand: {
    eyebrow: "Spoonie × 식품·주방 브랜드",
    title: "제품 활용 레시피를\n다시 쓰지 않고 시작하세요",
    description:
      "계정을 만든 뒤 자사몰·SNS의 제품 활용 레시피 1~5개를 보내면, 확인되는 내용을 브랜드 계정의 비공개 Recipe 초안으로 정리합니다.",
    detail: "가입 → 활용 자료 제출 → 초안 확인·수정 → 공개",
    setupTitle: "제품 활용 자료 보내기",
    setupDescription:
      "실제로 따라 만들 수 있는 조리 정보만 Recipe 초안에 채웁니다.",
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

  const next = text.sourcePath + "?setup=1#setup"
  const signupHref = authEntryHref("/signup", next, text.entry)
  const loginHref = authEntryHref("/login", next, text.entry)
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

          {user ? (
            <PartnerActionLink
              href="#setup"
              segment={segment}
              action="onboarding_open"
              className={buttonVariants({
                variant: "default",
                size: "lg",
                className: "mt-5 w-full",
              })}
            >
              기존 콘텐츠로 시작하기
            </PartnerActionLink>
          ) : (
            <>
              <PartnerActionLink
                href={signupHref}
                segment={segment}
                action="signup_open"
                className={buttonVariants({
                  variant: "default",
                  size: "lg",
                  className: "mt-5 w-full",
                })}
              >
                계정 만들고 시작하기
              </PartnerActionLink>
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
            </>
          )}

          <p className="mt-4 border-t border-border pt-4 text-meta text-ink-soft">
            {text.detail}
          </p>
        </section>

        {user && (
          <section
            id="setup"
            className="scroll-mt-4 border-t border-border px-4 py-6"
            aria-labelledby={segment + "-setup-title"}
          >
            <h2 id={segment + "-setup-title"} className="text-heading text-ink">
              {text.setupTitle}
            </h2>
            <p className="mt-2 text-meta text-ink-soft">{text.setupDescription}</p>
            <PartnerOnboardingForm actorType={segment} initialRequests={requests} />
          </section>
        )}

        <PartnerProof segment={segment} />
      </article>
    </div>
  )
}
