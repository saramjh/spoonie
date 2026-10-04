import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import PartnerActionLink from "./partner-action-link"

const recipeHref = "/recipes/b72f1e13-12d0-40ce-a7e8-d47659dc5531"

type PartnerProofProps = {
  segment: "creator" | "brand"
}

export default function PartnerProof({ segment }: PartnerProofProps) {
  return (
    <section className="border-t border-border px-4 py-6" aria-labelledby={segment + "-proof-title"}>
      <h2 id={segment + "-proof-title"} className="text-heading text-ink">실제 Spoonie Recipe</h2>
      <PartnerActionLink
        href={recipeHref}
        segment={segment}
        action="proof_recipe_open"
        className="mt-4 block overflow-hidden border border-border bg-paper"
        aria-label="실제 Spoonie 스키야키 Recipe 보기"
      >
        <Image
          src="/partners/recipe-proof.jpg"
          alt="Spoonie 실제 공개 Recipe 화면 — 스키야키"
          width={780}
          height={1240}
          sizes="(max-width: 448px) calc(100vw - 56px), 392px"
          className="h-72 w-full object-cover object-top"
        />
      </PartnerActionLink>
      <PartnerActionLink
        href={recipeHref}
        segment={segment}
        action="proof_recipe_open"
        className="mt-3 flex min-h-11 items-center justify-between text-label text-ink underline-offset-4 hover:underline"
      >
        실제 Recipe 열기
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </PartnerActionLink>
    </section>
  )
}
