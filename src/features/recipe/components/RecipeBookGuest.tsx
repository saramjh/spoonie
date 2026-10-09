import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Photo, Sheet } from "@/components/kit"

// 이미 공개된 Recipe 한 건만 보여 준다. 내 레시피북의 실제 항목이나 가상의 저장 데이터로 오인시키지 않는다.
const example = {
  href: "/recipes/554ae9ef-15a1-4806-944e-170884d17a96",
  title: "아보카도 게살 그라탕",
  photo: "https://dtyiyzfftsewpckfkqmo.supabase.co/storage/v1/object/public/item-images/8f5c5a40-17e5-424a-9da6-656a852e762d/1790995251540-07a0720e.jpg",
}

export default function RecipeBookGuest() {
  return (
    <div className="px-3 pb-8 pt-3">
      <Sheet as="section" className="px-4 py-6 text-ink">
        <h1 className="text-title leading-snug">내 요리를 모아두고, 다시 꺼내 쓰세요.</h1>
        <p className="mt-3 text-read leading-relaxed text-ink-soft">
          직접 쓴 레시피를 한곳에 정리해 두면, 다음 요리 때 이름이나 재료로 찾아 바로 활용할 수 있어요.
        </p>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-meta text-ink-soft">실제 공개 Recipe로 미리 살펴보기</p>
          <Link href={example.href}
            className="mt-3 flex min-h-28 items-center gap-3 rounded-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span className="relative block aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-[3px] bg-paper-tint">
              <Photo src={example.photo} sizes="112px" alt="아보카도 게살 그라탕" priority />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-label font-semibold">{example.title}</span>
              <span className="mt-1 block text-meta text-ink-soft">공개 Recipe · 2인분</span>
              <span className="mt-2 block text-label font-semibold underline underline-offset-4">실제 레시피 열어보기 →</span>
            </span>
          </Link>
          <p className="mt-2 text-meta text-ink-soft">공개 Recipe 예시이며, 내 레시피북에 저장된 항목은 아닙니다.</p>
        </div>

        <dl className="mt-5 divide-y divide-border border-y border-border text-label">
          <div className="flex gap-3 py-3">
            <dt className="w-14 shrink-0 font-semibold">찾기</dt>
            <dd className="text-ink-soft">제목이나 재료로 필요한 Recipe를 검색</dd>
          </div>
          <div className="flex gap-3 py-3">
            <dt className="w-14 shrink-0 font-semibold">정리</dt>
            <dd className="text-ink-soft">태그·색상 라벨로 내 요리법을 구분</dd>
          </div>
          <div className="flex gap-3 py-3">
            <dt className="w-14 shrink-0 font-semibold">다시 요리</dt>
            <dd className="text-ink-soft">인분을 조절하고 조리 단계를 따라가기</dd>
          </div>
        </dl>

        <div className="mt-6">
          <Button asChild className="min-h-11 w-full">
            <Link href="/signup?next=%2Frecipes">내 레시피북 시작하기</Link>
          </Button>
          <p className="mt-4 text-center text-label text-ink-soft">
            이미 계정이 있다면{" "}
            <Link href="/login?next=%2Frecipes" className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-4">
              로그인
            </Link>
          </p>
        </div>
      </Sheet>
    </div>
  )
}
