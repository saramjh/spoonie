import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Sheet } from "@/components/kit"
import { serializeJsonLd } from "@/shared/lib/json-ld"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
const route = "/magazine/after-cooking"
const photo = "https://dtyiyzfftsewpckfkqmo.supabase.co/storage/v1/object/public/item-images/8f5c5a40-17e5-424a-9da6-656a852e762d/1790995251540-07a0720e.jpg"
const sample = "/recipes/554ae9ef-15a1-4806-944e-170884d17a96"
const title = "레시피를 따라 만든 요리, 내 기록으로 남기는 방법"
const description = "다른 사람의 레시피로 만든 집밥도 나만의 요리 기록이 됩니다. 원본 Recipe와 내가 만든 Recipeed를 연결하는 흐름, 시작 전 알아둘 점을 살펴보세요."

export const metadata: Metadata = {
  title: title + " | Spoonie Magazine",
  description,
  alternates: { canonical: baseUrl + route },
  openGraph: {
    title, description, url: baseUrl + route, siteName: "Spoonie",
    type: "article", images: [{ url: photo, alt: "Spoonie에 실제 공개된 아보카도 게살 그라탕" }],
  },
}

const structured = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: title,
  description,
  mainEntityOfPage: baseUrl + route,
  author: { "@type": "Organization", name: "Spoonie" },
  publisher: { "@type": "Organization", name: "Spoonie", url: baseUrl },
  inLanguage: "ko-KR",
  image: [photo],
  datePublished: "2026-10-09",
}

export default function AfterCookingMagazinePage() {
  return (
    <Sheet className="mx-3 mb-24 mt-3 px-4 pb-7 pt-5 text-ink sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structured) }} />
      <nav aria-label="현재 위치" className="text-label text-ink-soft">
        <Link href="/magazine" className="underline underline-offset-4">Spoonie Magazine</Link>
        <span aria-hidden className="mx-2">/</span>
        요리 기록
      </nav>

      <header className="mt-7 border-b border-border pb-7">
        <h1 className="text-display leading-tight">{title}</h1>
        <p className="mt-4 text-read leading-relaxed text-ink-soft">
          마음에 든 레시피를 보고 한 끼를 완성했습니다. 그런데 만든 사진은 휴대폰 앨범에 남고,
          원본 레시피는 다른 곳에 저장됩니다. 이 두 기록을 다시 연결한다면 어떨까요?
        </p>
      </header>

      <article className="space-y-9 pt-7">
        <figure>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-paper-tint">
            <Image src={photo} alt="공개된 Spoonie Recipe, 아보카도 게살 그라탕" fill priority
              sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
          </div>
          <figcaption className="mt-2 text-meta text-ink-soft">
            Spoonie에 공개된 아보카도 게살 그라탕 Recipe
          </figcaption>
        </figure>

        <section className="space-y-3">
          <h2 className="text-heading">따라 만든 음식도 내 이야기가 됩니다</h2>
          <p className="text-read leading-relaxed">
            원본 레시피를 그대로 따라 할 때도 있지만, 냉장고 재료에 맞게 바꾸거나
            내 입맛대로 조정하기도 합니다. 이 차이를 사진 한 장과 짧은 글로 남기면,
            다음에 다시 만들 때 무엇을 바꾸었는지 기억하기 쉽습니다.
          </p>
          <p className="text-read leading-relaxed">
            내가 직접 새 레시피를 개발하지 않았어도 괜찮습니다.
            Spoonie에서는 정식 조리법을 정리하는 <strong>Recipe</strong>와,
            요리 과정·완성 사진·일상을 남기는 <strong>Recipeed</strong>를 구분합니다.
          </p>
        </section>

        <section className="space-y-4" aria-labelledby="record-steps">
          <h2 id="record-steps" className="text-heading">원본과 내 요리 기록이 이어지는 과정</h2>
          <ol className="space-y-5">
            <li className="border-t border-border pt-4">
              <p className="text-label font-semibold">01 · 공개 Recipe에서 시작하기</p>
              <p className="mt-2 text-read leading-relaxed">재료와 조리 순서를 확인합니다. 먼저 레시피를 읽는 데는 로그인이 필요하지 않습니다.</p>
            </li>
            <li className="border-t border-border pt-4">
              <p className="text-label font-semibold">02 · 내가 직접 요리한 장면 남기기</p>
              <p className="mt-2 text-read leading-relaxed">
                Recipe 상세의 <strong>‘이 레시피로 만들었어요’</strong>를 선택하면
                참고한 Recipe를 연결한 상태에서 Recipeed 작성을 시작할 수 있습니다.
                글을 공개하려면 Spoonie 계정 로그인이 필요합니다.
              </p>
            </li>
            <li className="border-t border-border pt-4">
              <p className="text-label font-semibold">03 · 원본과 내 기록의 관계 살펴보기</p>
              <p className="mt-2 text-read leading-relaxed">
                참고 관계를 포함해 공개한 기록은 원본의 <strong>‘만들어 본 기록’</strong> 흐름에서
                확인할 수 있습니다. 실제 관련 기록이 있을 때 표시되는 구조이며
                다른 사용자의 활동량이나 확산을 보장하지 않습니다.
              </p>
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-heading">무엇을 쓰면 좋을지 모르겠다면</h2>
          <p className="text-read leading-relaxed">
            다음 세 가지 중 하나만 골라도 시작하기 충분합니다. 어떤 재료를 바꿨는지,
            가장 잘된 조리 단계가 무엇이었는지, 다음번에 어떻게 만들어 보고 싶은지.
            훌륭한 사진이나 전문적인 레시피를 준비해야만 기록할 수 있는 것은 아닙니다.
          </p>
          <p className="text-read leading-relaxed">
            사진과 기록은 작성자 본인의 것을 사용하고, 다른 사람의 레시피를 참고했다면
            원본을 명확히 남기는 편이 좋습니다. 공개 글을 작성하기 전에 게시 범위도 확인하세요.
          </p>
        </section>

        <section className="border-t border-border pt-6">
          <h2 className="text-heading">오늘 요리한 한 끼가 있다면</h2>
          <p className="mt-3 text-read leading-relaxed">
            단순히 레시피를 저장하는 데서 멈추지 말고,
            만들어 본 결과도 나만의 요리 기록으로 남겨보세요.
          </p>
          <Link href={sample}
            className="mt-4 inline-flex min-h-11 items-center text-label font-semibold text-ink underline underline-offset-4">
            실제 공개 Recipe에서 시작하기 →
          </Link>
        </section>
      </article>

    </Sheet>
  )
}
