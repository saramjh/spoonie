"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageHeader, Photo, Sheet } from "@/components/kit"
import BottomNavBar from "@/components/layout/BottomNavBar"
import { readPostSource } from "@/features/post/domain/post-form"

interface CreateContentAuthPromptProps {
  contentType: "recipe" | "post"
}

// 운영 사이트에서 공개 상태와 이미지를 확인한 실제 글. 미리보기용으로 저장된 초안이나 가짜 작성 화면을 만들지 않는다.
const examples = {
  recipe: {
    href: "/recipes/554ae9ef-15a1-4806-944e-170884d17a96",
    title: "아보카도 게살 그라탕",
    photo: "https://dtyiyzfftsewpckfkqmo.supabase.co/storage/v1/object/public/item-images/8f5c5a40-17e5-424a-9da6-656a852e762d/1790995251540-07a0720e.jpg",
    description: "공개 Recipe · 2인분",
  },
  post: {
    href: "/posts/3a740af5-9baa-48a8-8276-8e5859f49bf5",
    title: "개복숭아 잼",
    photo: "https://dtyiyzfftsewpckfkqmo.supabase.co/storage/v1/object/public/item-images/5f230d98-af84-45b3-abe3-f79561e36235/1754454783228-63dcf002.jpg",
    description: "공개 Recipeed · 요리 이야기",
  },
} as const

// 기존 호출부와 인증 완료 후 원래 작성 화면 복귀 구조는 변경하지 않는다.
export default function CreateContentAuthPrompt({ contentType }: CreateContentAuthPromptProps) {
  const next = window.location.pathname + window.location.search
  const isRecipe = contentType === "recipe"
  const example = examples[contentType]
  const hasSource = !isRecipe && !!readPostSource(window.location.search).id

  return (
    <div className="pb-20">
      <PageHeader title={isRecipe ? "레시피 쓰기" : "레시피드 쓰기"} />
      <div className="px-3 pt-3">
        <Sheet as="section" className="px-4 py-6 text-ink">
          <h2 className="text-title leading-snug">
            {isRecipe ? "재료와 만드는 법, 다음 요리에도 남겨두세요." : "오늘 만든 한 끼, 사진과 이야기로 남겨요."}
          </h2>
          <p className="mt-3 text-read leading-relaxed text-ink-soft">
            {isRecipe
              ? "내 요리법을 Recipe로 적어두면 다음에 다시 찾고, 인분도 조절해 활용할 수 있어요."
              : "정식 조리법이 없어도 괜찮아요. 요리 사진과 짧은 글부터 Recipeed로 기록할 수 있어요."}
          </p>
          {hasSource && (
            <p className="mt-3 border-l-2 border-ink pl-3 text-label text-ink">
              지금 선택한 Recipe의 연결 주소는 로그인 후에도 이어집니다.
            </p>
          )}

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-meta text-ink-soft">실제 공개 {isRecipe ? "Recipe" : "Recipeed"} 미리보기</p>
            <Link href={example.href}
              className="mt-3 flex min-h-28 items-center gap-3 rounded-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <span className="relative block aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-[3px] bg-paper-tint">
                <Photo src={example.photo} sizes="112px" alt={example.title} priority />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-label font-semibold">{example.title}</span>
                <span className="mt-1 block text-meta text-ink-soft">{example.description}</span>
                <span className="mt-2 block text-label font-semibold underline underline-offset-4">실제 글 읽어보기 →</span>
              </span>
            </Link>
            <p className="mt-2 text-meta text-ink-soft">다른 사용자가 공개한 글이며, 새 글 작성 예시 화면은 아닙니다.</p>
          </div>

          <dl className="mt-5 divide-y divide-border border-y border-border text-label">
            <div className="flex gap-3 py-3">
              <dt className="w-16 shrink-0 font-semibold">{isRecipe ? "기록" : "내 이야기"}</dt>
              <dd className="text-ink-soft">
                {isRecipe ? "재료·분량과 조리 과정을 차례로 정리" : "사진과 글로 만든 음식과 달라진 점 남기기"}
              </dd>
            </div>
            <div className="flex gap-3 py-3">
              <dt className="w-16 shrink-0 font-semibold">{isRecipe ? "활용" : "연결"}</dt>
              <dd className="text-ink-soft">
                {isRecipe ? "레시피북에 모아두고 다음 요리에 다시 사용" : "참고한 Recipe가 있다면 선택해서 출처 연결"}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <Button asChild className="min-h-11 w-full">
              <Link href={`/signup?next=${encodeURIComponent(next)}`}>
                {isRecipe ? "내 Recipe 쓰기 시작하기" : "내 Recipeed 쓰기 시작하기"}
              </Link>
            </Button>
            <p className="mt-4 text-center text-label text-ink-soft">
              이미 계정이 있다면{" "}
              <Link href={`/login?next=${encodeURIComponent(next)}`}
                className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-4">
                로그인
              </Link>
            </p>
          </div>
        </Sheet>
      </div>
      <BottomNavBar />
    </div>
  )
}
