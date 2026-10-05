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
    title: "실제 공개 Recipe 보기",
    description: "재료·분량·조리 단계와 사진이 한 페이지에 정리된 실제 Spoonie Recipe입니다.",
  },
  brand: {
    title: "Spoonie Recipe는 이렇게 보입니다",
    description: "브랜드 성공 사례가 아니라, 제품 활용 요리를 올렸을 때 사용하게 될 실제 공개 Recipe 형식 예시입니다.",
  },
} as const

const cta = {
  creator: "내 레시피 1개 옮겨보기",
  brand: "제품 활용 Recipe 1개 올려보기",
} as const

export default function PartnerProof({ segment }: PartnerProofProps) {
  const text = copy[segment]

  return (
    <section className="border-t border-border px-4 py-6" aria-labelledby={segment + "-proof-title"}>
      <h2 id={segment + "-proof-title"} className="text-heading text-ink">{text.title}</h2>
      <p className="mt-2 text-meta text-ink-soft">{text.description}</p>
      <div className="mt-4 overflow-hidden border border-border bg-paper">
        <Image
          src="/partners/recipe-proof.jpg"
          alt="Spoonie 실제 공개 Recipe 화면 — 스키야키"
          width={780}
          height={1240}
          sizes="(max-width: 448px) calc(100vw - 56px), 392px"
          className="h-72 w-full object-cover object-top"
        />
      </div>
      <PartnerActionLink
        href={"/signup?next=%2Frecipes%2Fnew&from=partner_" + segment}
        segment={segment}
        action="proof_to_signup"
        className={buttonVariants({ variant: "default", size: "lg", className: "mt-4 w-full" })}
      >
        {cta[segment]}
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
