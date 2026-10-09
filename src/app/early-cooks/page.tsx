import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import EarlyCookActionLink from "./early-cook-action-link"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
const sample = "/recipes/554ae9ef-15a1-4806-944e-170884d17a96"
const image = "https://dtyiyzfftsewpckfkqmo.supabase.co/storage/v1/object/public/item-images/8f5c5a40-17e5-424a-9da6-656a852e762d/1790995251540-07a0720e.jpg"

export const metadata: Metadata = {
  title: "새로운 요리 SNS에서 첫 Recipeed 남기기 | Spoonie",
  description: "요리를 잘해야만 참여할 수 있는 건 아닙니다. 집밥 사진 한 장, 따라 만든 한 끼부터 Spoonie의 첫 Recipeed를 남겨보세요. 초기 사용 경험에 관한 솔직한 의견도 받고 있습니다.",
  alternates: { canonical: baseUrl + "/early-cooks" },
  openGraph: {
    title: "오늘 만든 한 끼, 새로운 요리 SNS의 첫 기록으로",
    description: "Recipe를 만드는 사람도, 따라 만들어 보는 사람도. Spoonie에서 직접 요리 경험을 기록해 보세요.",
    url: baseUrl + "/early-cooks", type: "website", siteName: "Spoonie",
    images: [{ url: image, alt: "Spoonie의 실제 공개 요리 Recipe" }],
  },
}

export default function EarlyCooksPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-7 text-ink">
      <header className="border-b border-border pb-8">
        <Link href="/" className="text-label text-ink-soft underline underline-offset-4">Spoonie 홈</Link>
        <p className="mt-7 text-meta font-semibold tracking-wide text-ink-soft">EARLY COOKS · SPOONIE</p>
        <h1 className="mt-4 text-display leading-tight">
          새로운 요리 SNS,<br />구경보다 첫 한 끼.
        </h1>
        <p className="mt-5 text-read leading-relaxed text-ink-soft">
          이미 요리한 사진이 있다면 전문 레시피 작가가 아니어도 괜찮습니다.
          내가 만든 한 끼부터 기록하는 사람들과 Spoonie의 시작을 만들어가고 싶습니다.
          지금은 첫 20명의 실제 활동자를 찾고 있는 초기 단계입니다.
        </p>
        <EarlyCookActionLink
          action="start_recipeed"
          href="/posts/new"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-md bg-ink px-5 py-3 text-label font-semibold text-paper">
          내 첫 Recipeed 쓰기 →
        </EarlyCookActionLink>
        <p className="mt-3 text-meta text-ink-soft">
          글을 공개하려면 로그인이 필요합니다. 유료 혜택이나 초기 이용자 우대 노출을 약속하는 모집이 아닙니다.
        </p>
      </header>

      <section className="space-y-5 py-7">
        <h2 className="text-heading">참여 방법은 어렵지 않습니다</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-border bg-paper-tint p-4">
            <p className="text-meta text-ink-soft">START 01</p>
            <h3 className="mt-2 text-label font-semibold">오늘 만든 집밥이 있다면</h3>
            <p className="mt-3 text-read leading-relaxed">
              사진 한 장과 어떤 음식인지, 오늘 바꾼 재료가 무엇인지 남겨보세요.
              정식 Recipe의 계량과 조리 단계를 모두 작성할 필요는 없습니다.
            </p>
          </div>
          <div className="border border-border bg-paper-tint p-4">
            <p className="text-meta text-ink-soft">START 02</p>
            <h3 className="mt-2 text-label font-semibold">따라 만든 레시피가 있다면</h3>
            <p className="mt-3 text-read leading-relaxed">
              Spoonie의 Recipe 상세에서 ‘이 레시피로 만들었어요’를 선택하면
              참고한 원본과 내 Recipeed를 이어 기록할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border py-7">
        <h2 className="text-heading">보고 끝나는 것과 직접 만드는 것은 다릅니다</h2>
        <figure>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-paper-tint">
            <Image src={image} alt="실제 Spoonie 공개 Recipe인 아보카도 게살 그라탕" fill
              sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
          </div>
          <figcaption className="mt-2 text-meta text-ink-soft">
            실제 공개 Recipe 예시 · 다른 사용자의 따라 만들기 기록이 이미 존재한다는 뜻은 아닙니다.
          </figcaption>
        </figure>
        <p className="text-read leading-relaxed">
          누군가의 레시피를 참고해 만든 결과가 원본에 연결될 때, 단순한 저장을 넘어
          조리 경험도 남습니다. Spoonie에는 원본 Recipe의 ‘만들어 본 기록’과
          ‘이어진 레시피’를 표시하는 구조가 있습니다. 아직 형성되지 않은 인맥이나
          확산 지표를 있는 것처럼 보여주는 서비스는 아닙니다.
        </p>
        <EarlyCookActionLink action="view_reference" href={sample}
          className="inline-flex min-h-11 items-center text-label font-semibold text-ink underline underline-offset-4">
          원본과 기록 연결 버튼 직접 확인하기 →
        </EarlyCookActionLink>
      </section>

      <section className="space-y-3 border-t border-border py-7">
        <h2 className="text-heading">첫 사용 후 솔직한 의견도 듣고 있습니다</h2>
        <p className="text-read leading-relaxed">
          가입 후 어디에서 막혔는지, 글을 쓰다가 불편한 점이 있었는지,
          내가 만든 요리가 어떻게 연결되면 계속 사용할 만할지 알고 싶습니다.
          첫 글을 꼭 잘 작성할 필요는 없습니다. 실제 사용 경험을 가장 중요하게 봅니다.
        </p>
        <p className="text-read leading-relaxed">
          의견은 <a href="mailto:partners@spoonie.kr?subject=Spoonie%20%EC%B4%88%EA%B8%B0%20%EC%82%AC%EC%9A%A9%20%EC%9D%98%EA%B2%AC"
            className="font-semibold underline underline-offset-4">Spoonie 업무 메일</a>로 서면 전달할 수 있습니다.
          통화나 인터뷰를 요청하는 모집은 아닙니다.
        </p>
      </section>

      <section className="border-t border-border bg-paper-tint px-4 py-6">
        <p className="text-label font-semibold">오늘 만든 한 끼부터</p>
        <p className="mt-2 text-read leading-relaxed">
          첫 20명이라는 목표보다 중요한 것은, 직접 요리하고 다시 돌아오는 사람들이
          이 공간을 어떻게 사용할지 확인하는 일입니다.
        </p>
        <EarlyCookActionLink action="start_recipeed" href="/posts/new"
          className="mt-4 inline-flex min-h-12 items-center justify-center rounded-md bg-ink px-5 py-3 text-label font-semibold text-paper">
          첫 요리 기록 남기기 →
        </EarlyCookActionLink>
      </section>
      <footer className="mt-6 text-meta text-ink-soft">
        레시피를 따라 만든 기록 방법은{" "}
        <Link className="underline underline-offset-4" href="/magazine/after-cooking">Spoonie Magazine 안내</Link>에서 자세히 볼 수 있습니다.
      </footer>
    </main>
  )
}
