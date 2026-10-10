import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Sheet } from "@/components/kit"
import EarlyCookActionLink from "./early-cook-action-link"
import InviteAnotherCook from "./invite-another-cook"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spoonie.kr"
const sample = "/recipes/554ae9ef-15a1-4806-944e-170884d17a96"
const image = "https://dtyiyzfftsewpckfkqmo.supabase.co/storage/v1/object/public/item-images/8f5c5a40-17e5-424a-9da6-656a852e762d/1790995251540-07a0720e.jpg"

export const metadata: Metadata = {
  title: "오늘 만든 요리 기록하기 - 첫 집밥 사진과 이야기 | Spoonie",
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
    <Sheet className="mx-3 mb-24 mt-3 px-4 pb-7 pt-5 text-ink sm:px-6">
      <header className="border-b border-border pb-7">
        <Link href="/" className="text-label text-ink-soft underline underline-offset-4">Spoonie 홈</Link>
        <h1 className="mt-6 text-display leading-tight">
          오늘 만든 한 끼,<br />내 첫 요리 기록으로.
        </h1>
        <p className="mt-5 text-read leading-relaxed text-ink-soft">
          잘 만든 요리법이 없어도 괜찮습니다. 오늘 만든 음식 사진과 짧은 이야기부터
          Recipeed로 남겨보세요. Spoonie는 함께 요리하고 기록할 첫 사용자들을 찾고 있습니다.
        </p>
        <EarlyCookActionLink
          action="start_recipeed"
          href="/posts/new"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-md bg-ink px-5 py-3 text-label font-semibold text-paper">
          내 첫 Recipeed 쓰기 →
        </EarlyCookActionLink>
        <p className="mt-3 text-meta text-ink-soft">글을 공개하려면 로그인이 필요합니다.</p>
      </header>

      <section className="py-7" aria-labelledby="start-recording">
        <h2 id="start-recording" className="text-heading">어떤 요리부터 남길까요?</h2>
        <div className="mt-4 divide-y divide-border border-y border-border">
          <div className="py-4">
            <h3 className="text-label font-semibold">오늘 만든 집밥</h3>
            <p className="mt-2 text-read leading-relaxed">
              음식 사진 한 장과 바꿔 넣은 재료, 다음에도 기억하고 싶은 점을 남겨보세요.
              계량과 조리 순서를 모두 적을 필요는 없습니다.
            </p>
          </div>
          <div className="py-4">
            <h3 className="text-label font-semibold">누군가의 Recipe를 따라 만든 요리</h3>
            <p className="mt-2 text-read leading-relaxed">
              Recipe 상세에서 ‘이 레시피로 만들었어요’를 누르면
              원본을 참고한 Recipeed를 이어서 작성할 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-border py-7">
        <h2 className="text-heading">내가 만든 결과도 원본과 이어집니다</h2>
        <figure>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-paper-tint">
            <Image src={image} alt="실제 Spoonie 공개 Recipe인 아보카도 게살 그라탕" fill
              sizes="(max-width: 768px) 100vw, 672px" className="object-cover" />
          </div>
          <figcaption className="mt-2 text-meta text-ink-soft">
            Spoonie에 공개된 아보카도 게살 그라탕 Recipe
          </figcaption>
        </figure>
        <p className="text-read leading-relaxed">
          원본 Recipe를 참고해 만든 음식은 Recipeed로 기록할 수 있습니다.
          직접 만든 사진과 달라진 점을 남기면, 원본과 내 요리 경험이 연결됩니다.
          관련 기록이 있을 때만 원본의 ‘만들어 본 기록’에서 확인할 수 있습니다.
        </p>
        <EarlyCookActionLink action="view_reference" href={sample}
          className="inline-flex min-h-11 items-center text-label font-semibold text-ink underline underline-offset-4">
          원본과 기록 연결 버튼 직접 확인하기 →
        </EarlyCookActionLink>
      </section>

      <InviteAnotherCook />

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

      <footer className="mt-4 border-t border-border pt-5 text-meta text-ink-soft">
        <p>초기 참여에 따른 유료 혜택이나 우대 노출은 제공하지 않습니다.</p>
        <p className="mt-3">레시피를 따라 만든 기록 방법은{" "}
        <Link className="underline underline-offset-4" href="/magazine/after-cooking">Spoonie Magazine 안내</Link>에서 자세히 볼 수 있습니다.</p>
      </footer>
    </Sheet>
  )
}
