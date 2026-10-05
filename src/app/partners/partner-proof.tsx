import Image from "next/image"
import { ArrowUpRight } from "lucide-react"

import PartnerActionLink from "./partner-action-link"

const recipeHref = "/recipes/b72f1e13-12d0-40ce-a7e8-d47659dc5531"

type PartnerProofProps = {
  segment: "creator" | "brand"
}

const copy = {
  creator: {
    title: "실제 Recipe는 이렇게 보입니다",
    description: "사진·분량·재료·조리 단계를 한 페이지에서 확인할 수 있습니다.",
  },
  brand: {
    title: "제품 활용 Recipe 예시",
    description: "제품 소개가 아니라 실제로 따라 만들 수 있는 조리 정보를 보여줍니다.",
  },
} as const

export default function PartnerProof({ segment }: PartnerProofProps) {
  const text = copy[segment]

  return (
    <section className="border-t border-border px-4 py-6" aria-labelledby={segment + "-proof-title"}>
      <h2 id={segment + "-proof-title"} className="text-heading text-ink">
        {text.title}
      </h2>
      <p className="mt-2 text-meta text-ink-soft">{text.description}</p>
      <figure className="mt-4">
        <div className="overflow-hidden border border-border bg-paper">
          <Image
            src="/partners/recipe-proof.jpg"
            alt="Spoonie 실제 공개 Recipe 화면 — 스키야키"
            width={780}
            height={1240}
            sizes="(max-width: 448px) calc(100vw - 56px), 392px"
            className="h-72 w-full object-cover object-top"
          />
        </div>
        <figcaption className="mt-2 text-meta text-ink-soft">실제 Spoonie 공개 Recipe 화면</figcaption>
      </figure>
      <PartnerActionLink
        href={recipeHref}
        segment={segment}
        action="proof_recipe_open"
        target="_blank"
        rel="noopener"
        className="mt-3 flex min-h-10 items-center justify-center gap-1.5 text-meta text-ink-soft transition-colors hover:text-ink"
      >
        전체 Recipe 보기
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </PartnerActionLink>
    </section>
  )
}
