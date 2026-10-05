import Image from "next/image"
import { ArrowUpRight } from "lucide-react"

import PartnerActionLink from "./partner-action-link"

const recipeHref = "/recipes/b72f1e13-12d0-40ce-a7e8-d47659dc5531"

type PartnerProofProps = {
  segment: "creator" | "brand"
}

const copy = {
  creator: {
    title: "공개한 뒤에는 한 Recipe 링크로 다시 쓸 수 있습니다",
    description:
      "재료·분량·조리 단계와 사진이 한 페이지에 남습니다. 원본 Recipe를 바탕으로 만든 기록이나 새 Recipe가 생기면 작성자와 source 관계도 이어집니다.",
  },
  brand: {
    title: "제품 소개와 실제 조리법을 분리해 남깁니다",
    description:
      "제품을 실제 한 끼에 쓰는 재료·분량·순서를 독립 Recipe로 남길 수 있습니다. 같은 제품의 활용법이 늘어나면 브랜드 프로필에서 함께 쌓입니다.",
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
