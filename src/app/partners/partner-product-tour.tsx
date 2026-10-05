"use client"

import { useMemo, useState } from "react"
import { Minus, Plus } from "lucide-react"

import { Photo } from "@/components/kit/Photo"
import { cn } from "@/lib/utils"

type Segment = "creator" | "brand"
type Stage = "recipe" | "cook" | "relation" | "profile"

const stages: Array<{ key: Stage; label: string }> = [
  { key: "recipe", label: "Recipe" },
  { key: "cook", label: "요리하기" },
  { key: "relation", label: "이어짐" },
  { key: "profile", label: "쌓임" },
]

const creatorRecipes = [
  {
    title: "항정살구이 한상",
    meta: "2인분 · 조리 25분",
    image:
      "https://dtyiyzfftsewpckfkqmo.supabase.co/storage/v1/object/public/item-images/8f5c5a40-17e5-424a-9da6-656a852e762d/1790993842193-b2379e6d.jpg",
  },
  {
    title: "스키야키",
    meta: "2인분 · 조리 30분",
    image:
      "https://dtyiyzfftsewpckfkqmo.supabase.co/storage/v1/object/public/item-images/8f5c5a40-17e5-424a-9da6-656a852e762d/1790993821475-5a73b95b.jpg",
  },
] as const

const copy = {
  creator: {
    intro: "실제 Spoonie Recipe가 어떻게 다시 쓰이는지 눌러 보세요.",
    consequence: {
      recipe: "인분을 바꾸면 재료 양이 같이 바뀌어, 게시물을 다시 계산하지 않고 바로 요리에 씁니다.",
      cook: "보는 사람은 원문을 다시 뒤지지 않고 Recipe 안에서 한 단계씩 따라갑니다.",
      relation: "만든 기록이나 참고가 생기면 원본 Recipe와 작성자로 돌아오는 길이 남습니다.",
      profile: "한 번 올린 Recipe가 프로필에 쌓여 다음 레시피를 발견하는 입구가 됩니다.",
    },
    sourceTitle: "원본 Recipe",
    demoTitle: "스키야키",
    demoMeta: "Spoonie 주방 공개 Recipe · 2인분 · 조리 30분",
    image: creatorRecipes[1].image,
    ingredients: [
      { name: "샤브샤브용 소고기", amount: 300, unit: "g" },
      { name: "표고버섯", amount: 3, unit: "개" },
      { name: "실곤약", amount: 100, unit: "g" },
    ],
    steps: [
      "간장, 맛술, 설탕, 물을 섞어 국물(와리시타)을 만들어요.",
      "주물팬을 달궈 기름을 두르고, 대파를 노릇하게 구워요.",
      "소고기를 펼쳐 넣고 국물을 조금 부어 반쯤 익혀요.",
    ],
  },
  brand: {
    intro: "제품 활용법이 광고 문구가 아니라 실제 조리 경험으로 이어지는 흐름입니다.",
    consequence: {
      recipe: "상품 소개문이 아니라 사용자가 양을 바꾸며 따라 만드는 제품 활용법이 됩니다.",
      cook: "사용자는 제품을 얼마만큼, 어떤 순서로 쓰는지 Recipe 안에서 따라갑니다.",
      relation: "만든 기록이나 응용이 생기면 어떤 활용 Recipe에서 시작됐는지 연결됩니다.",
      profile: "한 제품의 여러 쓰임을 각각의 Recipe로 쌓아 두고 다시 발견하게 할 수 있습니다.",
    },
    sourceTitle: "제품 활용 Recipe",
    demoTitle: "제품을 실제로 쓰는 한 끼",
    demoMeta: "기능 동작 예시 · 2인분",
    image: null,
    ingredients: [
      { name: "제품", amount: 120, unit: "g" },
      { name: "곁들임 재료", amount: 80, unit: "g" },
      { name: "소스", amount: 2, unit: "큰술" },
    ],
    steps: [
      "제품과 함께 쓸 재료를 먹기 좋은 크기로 준비합니다.",
      "제품을 정해진 양만큼 넣고 재료와 함께 조리합니다.",
      "완성한 요리를 담고 이 활용 Recipe로 만든 기록을 남길 수 있습니다.",
    ],
  },
} as const

export default function PartnerProductTour({ segment }: { segment: Segment }) {
  const text = copy[segment]
  const [stage, setStage] = useState<Stage>("recipe")
  const [servings, setServings] = useState(2)
  const [cookStep, setCookStep] = useState(0)

  const ingredients = useMemo(
    () =>
      text.ingredients.map((ingredient) => ({
        ...ingredient,
        amount: ingredient.amount * (servings / 2),
      })),
    [servings, text.ingredients],
  )

  return (
    <section className="border-t border-border" aria-labelledby={segment + "-tour-title"}>
      <div className="px-4 pb-3 pt-5">
        <p className="text-micro font-medium text-ink-soft">직접 눌러보는 기능 동작 예시</p>
        <h2 id={segment + "-tour-title"} className="mt-1 text-heading text-ink">
          Spoonie에서는 이렇게 이어집니다
        </h2>
        <p className="mt-2 text-meta text-ink-soft">{text.intro}</p>
      </div>

      <div
        className="grid grid-cols-4 border-y border-border bg-paper px-2"
        role="tablist"
        aria-label="Spoonie 기능 흐름"
      >
        {stages.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={stage === item.key}
            onClick={() => setStage(item.key)}
            className={cn(
              "relative min-h-11 px-1 text-meta font-medium text-ink-soft",
              stage === item.key && "text-ink",
            )}
          >
            {item.label}
            {stage === item.key && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 bg-ink" aria-hidden />
            )}
          </button>
        ))}
      </div>

      <div className="bg-door p-3">
        <div className="overflow-hidden rounded-[3px] bg-paper shadow-sheet">
          {stage === "recipe" && (
            <RecipeDemo
              segment={segment}
              title={text.demoTitle}
              meta={text.demoMeta}
              image={text.image}
              servings={servings}
              ingredients={ingredients}
              onDecrease={() => setServings((value) => Math.max(1, value - 1))}
              onIncrease={() => setServings((value) => Math.min(6, value + 1))}
            />
          )}
          {stage === "cook" && (
            <CookDemo
              steps={text.steps}
              cookStep={cookStep}
              onPrevious={() => setCookStep((value) => Math.max(0, value - 1))}
              onNext={() => setCookStep((value) => Math.min(text.steps.length - 1, value + 1))}
            />
          )}
          {stage === "relation" && <RelationDemo segment={segment} sourceTitle={text.sourceTitle} />}
          {stage === "profile" && <ProfileDemo segment={segment} />}
        </div>
      </div>

      <p className="px-4 pb-5 pt-1 text-body font-medium text-ink">{text.consequence[stage]}</p>
    </section>
  )
}

function RecipeDemo({
  segment,
  title,
  meta,
  image,
  servings,
  ingredients,
  onDecrease,
  onIncrease,
}: {
  segment: Segment
  title: string
  meta: string
  image: string | null
  servings: number
  ingredients: Array<{ name: string; amount: number; unit: string }>
  onDecrease: () => void
  onIncrease: () => void
}) {
  return (
    <>
      {image && (
        <div className="relative aspect-[16/7] w-full overflow-hidden bg-muted">
          <Photo
            src={image}
            sizes="(max-width: 448px) calc(100vw - 48px), 342px"
            alt="Spoonie 주방의 스키야키 Recipe"
          />
        </div>
      )}
      <div className="border-b border-border px-4 py-4">
        <p className="text-meta text-ink-soft">
          {segment === "creator" ? "실제 공개 Recipe 예시" : "제품 활용 Recipe 구조"}
        </p>
        <p className="mt-1 text-title text-ink">{title}</p>
        <p className="mt-1 text-meta text-ink-soft">{meta}</p>
      </div>

      <div className="px-4 pb-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-label font-semibold text-ink">재료</p>
          <div
            className="flex items-center rounded-lg border border-border"
            role="group"
            aria-label="예시 인분 조절"
          >
            <button
              type="button"
              onClick={onDecrease}
              disabled={servings <= 1}
              className="flex h-11 w-11 items-center justify-center text-ink disabled:text-ink-soft/40"
              aria-label="예시 1인분 줄이기"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <output className="min-w-[4.5rem] text-center text-body font-semibold tabular-nums text-ink">
              {servings}인분
            </output>
            <button
              type="button"
              onClick={onIncrease}
              disabled={servings >= 6}
              className="flex h-11 w-11 items-center justify-center text-ink disabled:text-ink-soft/40"
              aria-label="예시 1인분 늘리기"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <ul className="mt-2 divide-y divide-border">
          {ingredients.map((ingredient) => (
            <li key={ingredient.name} className="flex min-h-11 items-center justify-between gap-3">
              <span className="text-read text-ink">{ingredient.name}</span>
              <span className="text-heading tabular-nums text-ink">
                {Number.isInteger(ingredient.amount) ? ingredient.amount : ingredient.amount.toFixed(1)}
                <span className="ml-0.5 text-label font-normal text-ink-soft">{ingredient.unit}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-meta text-ink-soft">±를 누르면 재료 양이 같은 비율로 바뀝니다.</p>
      </div>
    </>
  )
}

function CookDemo({
  steps,
  cookStep,
  onPrevious,
  onNext,
}: {
  steps: readonly string[]
  cookStep: number
  onPrevious: () => void
  onNext: () => void
}) {
  const last = cookStep === steps.length - 1

  return (
    <div className="bg-door p-3">
      <div className="flex items-center gap-2 px-1 pb-2">
        <p className="flex-1 text-body font-semibold tabular-nums text-ink">
          {cookStep + 1} <span className="font-normal text-ink-soft">/ {steps.length}단계</span>
        </p>
        <span className="text-meta text-ink-soft">재료 · 2인분</span>
      </div>
      <div className="flex gap-1 pb-3" aria-hidden>
        {steps.map((_, index) => (
          <span
            key={index}
            className={cn("h-1 flex-1 rounded-full", index <= cookStep ? "bg-ink" : "bg-paper")}
          />
        ))}
      </div>
      <div className="rounded-[3px] bg-paper px-5 py-7 shadow-sheet">
        <p className="text-step text-ink">{steps[cookStep]}</p>
        {!last && (
          <div className="mt-6 border-t border-border pt-3 text-ink-soft">
            <p className="text-label font-semibold">다음 · {cookStep + 2}단계</p>
            <p className="mt-1 line-clamp-2 text-read">{steps[cookStep + 1]}</p>
          </div>
        )}
        {last && (
          <div className="mt-6 border-t border-border pt-3">
            <p className="text-label font-semibold text-ink">다 만들면</p>
            <p className="mt-1 text-read text-ink-soft">
              사진으로 남긴 기록을 이 Recipe와 이어서 작성할 수 있습니다.
            </p>
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_2fr] gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={cookStep === 0}
          className="h-12 rounded-lg border border-ink/20 bg-paper text-label font-semibold text-ink disabled:text-ink-soft/40"
        >
          이전
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={last}
          className="h-12 rounded-lg bg-primary text-label font-semibold text-primary-foreground disabled:opacity-50"
        >
          {last ? "다 만들었어요" : "다음 단계"}
        </button>
      </div>
    </div>
  )
}

function RelationDemo({ segment, sourceTitle }: { segment: Segment; sourceTitle: string }) {
  return (
    <div className="px-4 py-5">
      <div className="border-b border-border pb-4">
        <p className="text-meta text-ink-soft">{segment === "creator" ? "작성자와 원본" : "브랜드와 원본"}</p>
        <p className="mt-1 text-heading text-ink">{sourceTitle}</p>
      </div>

      <div className="relative py-5">
        <span className="absolute bottom-0 left-5 top-0 w-px bg-border" aria-hidden />
        <div className="relative ml-10 border-y border-border py-3">
          <span className="absolute -left-[25px] top-5 h-3 w-3 rounded-full border-2 border-paper bg-ink" aria-hidden />
          <p className="text-meta text-ink-soft">
            {segment === "creator" ? "내 Recipe로 만들었어요" : "이 Recipe로 만들었어요"}
          </p>
          <p className="mt-0.5 text-label font-semibold text-ink">만들어 본 기록</p>
        </div>
        <div className="relative ml-10 border-b border-border py-3">
          <span className="absolute -left-[25px] top-5 h-3 w-3 rounded-full border-2 border-paper bg-ink" aria-hidden />
          <p className="text-meta text-ink-soft">
            참고한 레시피 · {segment === "creator" ? "원본 작성자" : "브랜드"}
          </p>
          <p className="mt-0.5 text-label font-semibold text-ink">
            {segment === "creator" ? "이어진 Recipe · 고친 버전" : "응용 Recipe"}
          </p>
        </div>
      </div>

      <p className="text-meta text-ink-soft">만든 기록이나 참고가 생긴 경우에만 이 관계가 표시됩니다.</p>
    </div>
  )
}

function ProfileDemo({ segment }: { segment: Segment }) {
  if (segment === "brand") {
    return (
      <div>
        <div className="border-b border-border px-4 py-4">
          <p className="text-meta text-ink-soft">한 제품 · 여러 실제 쓰임</p>
          <p className="mt-1 text-title text-ink">제품 활용 Recipe</p>
        </div>
        <div className="px-4 py-4">
          <div className="relative">
            <span className="absolute bottom-5 left-4 top-5 w-px bg-border" aria-hidden />
            {["한 끼로 쓰는 법", "간식으로 쓰는 법", "다른 재료와 응용"].map((label, index) => (
              <div key={label} className="relative ml-9 border-b border-border py-3 first:pt-0 last:border-b-0 last:pb-0">
                <span className="absolute -left-[25px] top-4 h-2.5 w-2.5 rounded-full bg-ink" aria-hidden />
                <p className="text-micro tabular-nums text-ink-soft">활용 Recipe {String(index + 1).padStart(2, "0")}</p>
                <p className="mt-0.5 text-label font-semibold text-ink">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-border px-4 py-4">
        <p className="text-meta text-ink-soft">실제 Spoonie 주방 공개 프로필 예시</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-title text-ink">Recipe가 프로필에 쌓입니다</p>
          <span className="text-meta text-ink-soft">공개 Recipe 중 일부</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 bg-door p-3">
        {creatorRecipes.map((recipe, index) => (
          <div
            key={recipe.title}
            className={cn(
              "overflow-hidden rounded-[3px] bg-paper shadow-sheet",
              index === creatorRecipes.length - 1 && "col-span-2 grid grid-cols-[42%_1fr]",
            )}
          >
            <div
              className={cn(
                "relative aspect-[4/3] overflow-hidden bg-muted",
                index === creatorRecipes.length - 1 && "aspect-auto min-h-24",
              )}
            >
              <Photo
                src={recipe.image}
                sizes={index === creatorRecipes.length - 1 ? "140px" : "(max-width: 448px) 42vw, 160px"}
                alt=""
              />
            </div>
            <div className="px-3 pb-3 pt-2">
              <p className="line-clamp-2 text-label font-semibold text-ink">{recipe.title}</p>
              <p className="mt-1 text-meta text-ink-soft">{recipe.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
