import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Sheet } from "@/components/kit"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
const cover =
  "https://dtyiyzfftsewpckfkqmo.supabase.co/storage/v1/object/public/item-images/8f5c5a40-17e5-424a-9da6-656a852e762d/1790995251540-07a0720e.jpg"

export const metadata: Metadata = {
  title: "2인분 레시피를 4인분으로 늘릴 때 | Spoonie Magazine",
  description:
    "인분을 늘릴 때 재료 배수만큼 달라지지 않는 양념, 팬 크기, 조리 시간을 확인하는 실용 가이드. 실제 Spoonie Recipe로 분량도 바꿔보세요.",
  alternates: { canonical: baseUrl + "/magazine" },
  openGraph: {
    title: "2인분을 4인분으로, 어디까지 두 배로 늘릴까?",
    description: "양념·팬 크기·조리 시간까지 함께 확인하는 집밥 가이드.",
    url: baseUrl + "/magazine",
    siteName: "Spoonie",
    type: "article",
    images: [{ url: cover, alt: "Spoonie에 공개된 아보카도 게살 그라탕" }],
  },
}

export default function MagazinePage() {
  return (
    <Sheet className="mx-3 mb-24 mt-3 px-4 pb-7 pt-5 text-ink sm:px-6">
      <header className="border-b border-border pb-6">
        <Link href="/" className="text-label text-ink-soft underline underline-offset-4">
          Spoonie 홈
        </Link>
        <h1 className="mt-7 text-display leading-tight">
          2인분을 4인분으로,
          <br />
          어디까지 두 배로 늘릴까?
        </h1>
        <p className="mt-4 text-read leading-relaxed text-ink-soft">
          레시피를 늘려 만들 때는 재료의 양뿐 아니라 냄비와 팬의 크기,
          양념의 강도, 익히는 시간도 다시 살펴야 합니다.
        </p>
      </header>

      <article className="space-y-8 pt-6">
        <figure>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-paper-tint">
            <Image
              src={cover}
              alt="Spoonie에 실제로 등록된 2인분 아보카도 게살 그라탕"
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
              priority
            />
          </div>
          <figcaption className="mt-2 text-meta text-ink-soft">
            실제 공개 Recipe: 아보카도 게살 그라탕 · 기본 2인분
          </figcaption>
        </figure>

        <section className="space-y-3">
          <h2 className="text-heading">먼저, 기준 분량을 확인하기</h2>
          <p className="text-read leading-relaxed">
            2인분을 4인분으로 만들 때 계산상의 배수는 2입니다.
            주재료와 계량된 기본 재료는 이 배수를 출발점으로 삼을 수 있습니다.
            다만 한 접시의 양이 실제로 충분한지는 먹는 사람과 곁들임 메뉴에 따라 달라집니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-heading">양념은 마지막에 맛으로 맞추기</h2>
          <p className="text-read leading-relaxed">
            소금, 간장, 고춧가루, 식초 같은 재료는 모두 같은 강도로 느껴지지 않습니다.
            일단 기존 레시피의 비율을 참고하되, 추가분은 나누어 넣고
            조리 중에 맛을 확인하는 편이 안전합니다. 특히 졸이거나 끓이는 요리는
            수분이 줄면서 간이 달라질 수 있습니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-heading">조리 시간은 두 배가 아니다</h2>
          <p className="text-read leading-relaxed">
            같은 팬에 재료를 두 배 넣으면 서로 겹쳐 수분이 잘 날아가지 않거나
            고르게 익지 않을 수 있습니다. 볶음 요리는 팬을 나누어 사용하고,
            오븐 요리는 음식의 두께와 중심부 익힘 상태를 기준으로 판단하세요.
            레시피의 원래 시간은 출발점이지 보장된 완료 시간이 아닙니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-heading">계량과 요리를 한 화면에서 이어보기</h2>
          <p className="text-read leading-relaxed">
            종이에 다시 계산하기보다 Spoonie의 인분 조절을 사용하면
            해당 Recipe의 재료량을 선택한 분량에 맞춰 확인할 수 있습니다.
            이후 &lsquo;요리하기&rsquo; 화면에서 순서를 따라가며 조리하세요.
            양념과 익힘 상태를 직접 확인해야 한다는 원칙은 동일합니다.
          </p>
          <Link
            href="/recipes/554ae9ef-15a1-4806-944e-170884d17a96"
            className="inline-flex min-h-11 items-center text-label font-semibold text-ink underline underline-offset-4"
          >
            2인분 아보카도 게살 그라탕으로 인분 바꿔보기 →
          </Link>
        </section>
      </article>

      <footer className="mt-10 border-t border-border pt-6">
        <p className="text-meta text-ink-soft">Spoonie Magazine · 집밥에 바로 쓰는 이야기</p>
        <Link href="/magazine/after-cooking" className="mt-4 inline-flex min-h-11 items-center text-label font-semibold text-ink underline underline-offset-4">
          따라 만든 요리, 내 기록으로 이어서 남기는 방법 →
        </Link>
        <p className="mt-2 text-label text-ink-soft">
          이 매거진은 공개로 읽을 수 있습니다. 이메일 구독 신청·정기 발송은 아직 제공하지 않습니다.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center text-label font-semibold text-ink underline underline-offset-4"
        >
          다른 Recipe와 Recipeed 둘러보기 →
        </Link>
      </footer>
    </Sheet>
  )
}
