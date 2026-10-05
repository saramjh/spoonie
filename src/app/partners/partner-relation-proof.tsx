import Image from "next/image"

import { buttonVariants } from "@/components/ui/button"
import PartnerActionLink from "./partner-action-link"

type Segment = "creator" | "brand"

const copy = {
  creator: {
    title: "피드가 지나가도, 레시피는 다시 꺼내 쓸 수 있습니다",
    description:
      "릴스·게시물은 빠르게 지나가지만, Recipe는 재료·분량·순서를 한 페이지에 남깁니다. 누군가 따라 만들거나 자기 Recipe를 이어 쓰면 바탕 Recipe와 작성자로 돌아갈 경로도 남습니다.",
    note:
      "새 콘텐츠를 더 만드는 대신, 이미 만든 콘텐츠를 ‘다시 만들 수 있는 원본 링크’로 한 번 더 활용하는 방식입니다.",
    cta: "옮길 게시물 주소 보내기",
    flow: "Instagram 주소 1~5개 → 초안 정리 → 공개 전 확인",
    href: "#migration",
  },
  brand: {
    title: "게시물이 지나가도, 제품 쓰는 법은 남습니다",
    description:
      "제품 소개 게시물은 지나가지만, 활용 Recipe는 이 제품으로 무엇을 만들 수 있는지를 계속 보여주는 페이지로 남습니다. 팬이 참고해 만든 기록이나 응용 Recipe가 생기면 원본 활용 Recipe로 돌아갈 수 있습니다.",
    note:
      "한 제품의 활용법을 여러 Recipe로 쌓을수록 ‘이 제품을 어디에 쓰지?’에 답할 수 있는 자산이 늘어납니다.",
    cta: "제품 활용 Recipe 1개 올려보기",
    flow: "가입 → 활용 Recipe 작성 → 브랜드 프로필에 누적",
    href: "/signup?next=%2Frecipes%2Fnew&from=partner_brand",
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
            height={57}
            sizes="(max-width: 448px) calc(100vw - 56px), 366px"
            className="h-auto w-full"
          />
        </div>
        <figcaption className="mt-2 text-meta text-ink-soft">
          실제 Spoonie 화면 · Recipeed가 참고한 Recipe를 표시한 모습
        </figcaption>
      </figure>

      <PartnerActionLink
        href={text.href}
        segment={segment}
        action={segment === "creator" ? "migration_anchor_open" : "signup_to_recipe"}
        className={buttonVariants({ variant: "default", size: "lg", className: "mt-4 w-full" })}
      >
        {text.cta}
      </PartnerActionLink>
      <p className="mt-2 text-center text-meta text-ink-soft">{text.flow}</p>
      <p className="mt-4 border-t border-border pt-4 text-label text-ink">{text.note}</p>
    </section>
  )
}
