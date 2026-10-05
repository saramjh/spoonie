import Image from "next/image"

type Segment = "creator" | "brand"

const copy = {
  creator: {
    title: "Recipe가 게시물로 끝나지 않습니다",
    description:
      "Spoonie의 Recipe는 재료·분량·단계를 다시 쓰기 쉽게 남기고, 누군가 만들거나 참고하면 원본 Recipe와 작성자 관계를 이어갑니다.",
    benefits: [
      ["다시 만들기 쉬운 Recipe", "재료·분량·단계·사진을 한 페이지에 남깁니다."],
      ["인분에 맞춰 재료량 조절", "보는 사람이 필요한 인분으로 바꾸면 재료량도 함께 계산됩니다."],
      ["만든 기록과 참고 관계", "Recipeed와 이어진 Recipe에서 바탕 Recipe와 작성자로 돌아갈 수 있습니다."],
    ],
  },
  brand: {
    title: "제품이 실제로 쓰이는 방법을 쌓습니다",
    description:
      "상품 소개문 대신 실제로 따라 만들 수 있는 Recipe를 남기고, 팬의 조리 기록이나 응용 Recipe가 생기면 원본 활용법과 작성자 관계를 이어갑니다.",
    benefits: [
      ["실제 조리 가능한 활용법", "재료·분량·단계가 있는 제품 사용 Recipe를 남깁니다."],
      ["한 제품의 쓰임을 누적", "여러 활용 Recipe를 브랜드 프로필에서 계속 쌓아갈 수 있습니다."],
      ["팬의 사용 사례와 연결", "만들었던 기록과 응용 Recipe가 바탕 Recipe로 이어집니다."],
    ],
  },
} as const

export default function PartnerRelationProof({ segment }: { segment: Segment }) {
  const text = copy[segment]

  return (
    <section className="border-t border-border px-4 py-6" aria-labelledby={segment + "-value-title"}>
      <h2 id={segment + "-value-title"} className="text-heading text-ink">
        {text.title}
      </h2>
      <p className="mt-2 text-body text-ink-soft">{text.description}</p>

      <ul className="mt-4 divide-y divide-border border-y border-border">
        {text.benefits.map(([title, description]) => (
          <li key={title} className="py-3">
            <p className="text-label text-ink">{title}</p>
            <p className="mt-1 text-meta text-ink-soft">{description}</p>
          </li>
        ))}
      </ul>

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
          실제 Spoonie 화면 · 참고한 Recipe와 작성자 관계
        </figcaption>
      </figure>
    </section>
  )
}
