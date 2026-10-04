import Image from "next/image"
import { ArrowUpRight, UserRound } from "lucide-react"
import PartnerActionLink from "./partner-action-link"

const recipeHref = "/recipes/b72f1e13-12d0-40ce-a7e8-d47659dc5531"
const profileHref = "/profile/6a7e51f9"

type PartnerProofProps = {
  segment: "creator" | "brand"
}

export default function PartnerProof({ segment }: PartnerProofProps) {
  const titleId = segment + "-proof-title"

  return (
    <section className="border-t border-border px-4 py-6" aria-labelledby={titleId}>
      <p className="text-meta text-orange-ink">실제 Spoonie 화면</p>
      <h2 id={titleId} className="mt-1 text-heading text-ink">
        설명이 아니라, 지금 동작하는 제품
      </h2>
      <p className="mt-2 text-body text-ink-soft">
        아래는 현재 공개 중인 Spoonie Recipe 화면입니다. 사진, 재료·분량, 조리 단계, 작성자 프로필이 실제 서비스에서
        연결되어 있습니다.
      </p>

      <PartnerActionLink
        href={recipeHref}
        segment={segment}
        action="proof_recipe_open"
        className="mt-5 block border border-border bg-paper"
        aria-label="실제 Spoonie 스키야키 Recipe 보기"
      >
        <Image
          src="/partners/recipe-proof.jpg"
          alt="Spoonie 실제 공개 Recipe 화면 — 스키야키"
          width={780}
          height={1240}
          sizes="(max-width: 448px) calc(100vw - 56px), 392px"
          className="h-auto w-full"
        />
      </PartnerActionLink>

      <div className="mt-4 grid gap-2">
        <PartnerActionLink
          href={recipeHref}
          segment={segment}
          action="proof_recipe_open"
          className="flex min-h-12 items-center justify-between border-b border-border py-2 text-label text-ink"
        >
          실제 Recipe 열기
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </PartnerActionLink>
        <PartnerActionLink
          href={profileHref}
          segment={segment}
          action="proof_profile_open"
          className="flex min-h-12 items-center justify-between border-b border-border py-2 text-label text-ink"
        >
          <span className="flex items-center gap-2">
            <UserRound className="h-4 w-4" aria-hidden />
            실제 작성자 프로필 보기
          </span>
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </PartnerActionLink>
      </div>
    </section>
  )
}
