import Image from "next/image"
import { buttonVariants } from "@/components/ui/button"
import PartnerActionLink from "./partner-action-link"

type Segment = "creator" | "brand"

const copy = {
  creator: {
    title: "참고해도, 출발점은 남습니다",
    description:
      "다른 사람이 내 Recipe로 만들거나 참고해 자기 Recipe를 만들면, 바탕이 된 Recipe와 작성자를 다시 열 수 있게 연결됩니다.",
    note:
      "Recipe에는 관계가 생기면 ‘만들어 본 기록’과 ‘이어진 레시피’가 같은 흐름에 모입니다.",
    cta: "기존 레시피 1개 옮겨보기",
    flow: "가입 → 기존 레시피 입력 → 공개",
  },
  brand: {
    title: "제품 활용도, 다음 Recipe로 이어집니다",
    description:
      "팬이 제품 활용 Recipe로 만들거나 참고해 응용 Recipe를 만들면, 바탕이 된 Recipe와 작성자를 다시 열 수 있게 연결됩니다.",
    note:
      "한 번의 포스트가 아니라 제품을 쓰는 여러 방법을 Recipe 관계로 이어갈 수 있습니다.",
    cta: "제품 활용 Recipe 1개 올려보기",
    flow: "가입 → Recipe 작성 → 프로필에 쌓임",
  },
} as const

export default function PartnerRelationProof({ segment }: { segment: Segment }) {
  const text = copy[segment]
  const titleId = segment + "-relation-title"

  return (
    <section className="border-t border-border px-4 py-6" aria-labelledby={titleId}>
      <h2 id={titleId} className="text-heading text-ink">
        {text.title}
      </h2>
      <p className="mt-2 text-body text-ink-soft">{text.description}</p>

      <figure className="mt-4">
        <div className="overflow-hidden border border-border bg-paper">
          <Image
            src="/partners/relation-proof.png"
            alt="실제 Spoonie 화면에서 Recipeed가 참고한 Recipe와 작성자를 표시한 모습"
            width={366}
            height={184}
            sizes="(max-width: 448px) calc(100vw - 56px), 366px"
            className="h-auto w-full"
          />
        </div>
        <figcaption className="mt-2 text-meta text-ink-soft">
          실제 Spoonie 화면 · Recipeed가 참고한 Recipe를 표시한 모습
        </figcaption>
      </figure>

      <p className="mt-4 border-t border-border pt-4 text-label text-ink">{text.note}</p>

      <PartnerActionLink
        href={"/signup?next=%2Frecipes%2Fnew&from=partner_" + segment}
        segment={segment}
        action="signup_to_recipe"
        className={buttonVariants({ variant: "default", size: "lg", className: "mt-5 w-full" })}
      >
        {text.cta}
      </PartnerActionLink>
      <p className="mt-2 text-center text-meta text-ink-soft">{text.flow}</p>
    </section>
  )
}
