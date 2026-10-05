import Image from "next/image"
import { ArrowUpRight } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import PartnerActionLink from "./partner-action-link"

const recipeHref = "/recipes/b72f1e13-12d0-40ce-a7e8-d47659dc5531"

type PartnerProofProps = {
  segment: "creator" | "brand"
}

const copy = {
  creator: {
    title: "댓글에 다시 적던 분량과 순서를 한 링크로",
    description:
      "재료·분량·조리 단계와 사진을 한 페이지에 남겨, 짧은 게시물에서 생기는 ‘몇 인분? 얼마나 넣어요?’ 같은 질문에 같은 Recipe 링크를 다시 쓸 수 있습니다.",
    cta: "직접 Recipe 작성하기",
    href: "/signup?next=%2Frecipes%2Fnew&from=partner_creator",
  },
  brand: {
    title: "제품 설명과 실제 조리법을 분리해서 보여줍니다",
    description:
      "제품 장점 대신 실제 한 끼를 만드는 재료·분량·순서를 보여줘, 활용법 자체를 독립 Recipe 링크로 다시 사용할 수 있습니다.",
    cta: "제품 활용 Recipe 작성하기",
    href: "/signup?next=%2Frecipes%2Fnew&from=partner_brand",
  },
} as const

export default function PartnerProof({ segment }: PartnerProofProps) {
  const text = copy[segment]

  return (
    <section className="border-t border-border px-4 py-6" aria-labelledby={segment + "-proof-title"}>
      <h2 id={segment + "-proof-title"} className="text-heading text-ink">{text.title}</h2>
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
        href={text.href}
        segment={segment}
        action="proof_to_signup"
        className={buttonVariants({ variant: "outline", size: "lg", className: "mt-4 w-full" })}
      >
        {text.cta}
      </PartnerActionLink>
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
