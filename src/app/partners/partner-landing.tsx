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
      "피드에서 지나간 레시피를 누군가 참고해 요리한 뒤 기록하면, 그 이야기가 원본 Recipe와 다시 연결됩니다.",
    directCta: "가입하고 내 Recipe 올려보기",
    setupTitle: "기존에 올린 내 레시피로 시작한다면",
    setupDescription:
      "가입한 뒤 내가 올린 Instagram 레시피 게시물·릴스 주소 1~5개를 선택적으로 제출할 수 있습니다. 확인되는 정보는 내 계정의 비공개 Recipe 초안에 정리되며, 빠진 내용은 내가 보완하고 공개 여부도 직접 결정합니다.",
    setupCta: "가입하고 기존 레시피 가져오기",
    sourcePath: "/partners/creators",
    entry: "partner_creator",
  },
  brand: {
    eyebrow: "Spoonie × 식품·주방 브랜드",
    title: "제품 사진을 넘어\n실제 요리 방법으로",
    description:
      "고객이 제품으로 무엇을 만들 수 있는지 활용 Recipe로 직접 보여주세요. 따라 만든 기록이 생기면 원본과 이어집니다.",
    directCta: "가입하고 활용 Recipe 올려보기",
    setupTitle: "기존 활용 자료부터 옮기고 싶다면",
    setupDescription:
      "가입 후 내가 사용 권한을 가진 자사몰·SNS 활용 자료 주소 1~5개를 선택적으로 제출할 수 있습니다. 확인되는 내용은 브랜드 계정의 비공개 Recipe 초안에 정리되며, 보완과 공개 여부는 계정 운영자가 직접 결정합니다.",
    setupCta: "가입하고 기존 활용 자료 가져오기",
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
        <section className="px-4 pb-5 pt-6">
          <Link href="/" className="inline-flex" aria-label="Spoonie 홈">
            <Image src="/logo-full.svg" alt="Spoonie" width={100} height={32} priority />
          </Link>
          <p className="mt-5 text-meta text-ink-soft">{text.eyebrow}</p>
          <h1 className="mt-2 whitespace-pre-line text-display text-ink">{text.title}</h1>
          <p className="mt-3 text-body text-ink-soft">{text.description}</p>
          <PartnerActionLink
            href={directHref}
            segment={segment}
            action={user ? "hero_recipe_create_open" : "hero_signup_to_recipe"}
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className: "mt-4 w-full",
            })}
          >
            {text.directCta}
          </PartnerActionLink>
        </section>

        <PartnerProductTour segment={segment} />

        <section className="border-t border-border px-4 py-6" aria-label="Spoonie 시작하기">
          <p className="text-heading text-ink">직접 써보는 게 가장 빠릅니다</p>
          <p className="mt-1 text-meta text-ink-soft">
            가입하면 바로 내 계정에서 Recipe를 작성할 수 있습니다.
          </p>
          <PartnerActionLink
            href={directHref}
            segment={segment}
            action={user ? "recipe_create_open" : "signup_to_recipe"}
            className={buttonVariants({
              variant: "default",
              size: "lg",
              className: "mt-4 w-full",
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
        </section>

        <section
          id="setup"
          className="scroll-mt-4 border-t border-border px-4 py-6"
          aria-labelledby={segment + "-setup-title"}
        >
          <p className="text-micro font-medium text-ink-soft">선택 사항 · 내가 가진 콘텐츠 가져오기</p>
          <h2 id={segment + "-setup-title"} className="mt-1 text-heading text-ink">
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
                  className: "mt-4 w-full",
                })}
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
