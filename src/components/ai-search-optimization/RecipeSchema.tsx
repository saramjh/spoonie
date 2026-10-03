import { serializeJsonLd } from "@/shared/lib/json-ld"
import type { ItemDetail } from "@/types/item"
import { formatAmount } from "@/features/recipe/domain/recipe-amount"

/**
 * schema.org Recipe 구조화 데이터.
 * 화면에 보이는 실제 데이터만 사용한다. 평점, 리뷰, 영양 정보처럼 서비스에 없는 값은 넣지 않는다.
 */
export default function RecipeSchema({ item, baseUrl }: { item: ItemDetail; baseUrl: string }) {
  const authorName = item.display_name || item.username
  const ingredients = (item.ingredients ?? [])
    .map((i) => [i.name, [formatAmount(Number(i.amount), i.unit), i.unit].filter(Boolean).join("")].filter(Boolean).join(" ").trim())
    .filter(Boolean)
  const steps = [...(item.instructions ?? [])]
    .sort((a, b) => a.step_number - b.step_number)
    // 화면의 단계 번호와 앵커(#step-N)를 그대로 쓴다
    .map((s, index) => ({ ...s, number: index + 1 }))
    .filter((s) => s.description)
    .map((s) => ({
      "@type": "HowToStep",
      position: s.number,
      name: `${s.number}단계`,
      url: `${baseUrl}/recipes/${item.id}#step-${s.number}`,
      text: s.description,
      ...(s.image_url && { image: s.image_url }),
    }))

  const schema = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: item.title,
    url: `${baseUrl}/recipes/${item.id}`,
    datePublished: item.created_at,
    ...(item.description && { description: item.description }),
    ...(item.image_urls?.length && { image: item.image_urls }),
    ...(authorName && {
      author: {
        "@type": "Person",
        name: authorName,
        ...(item.user_public_id && { url: `${baseUrl}/profile/${item.user_public_id}` }),
      },
    }),
    ...(item.cooking_time_minutes && { totalTime: `PT${item.cooking_time_minutes}M` }),
    ...(item.servings && { recipeYield: `${item.servings}인분` }),
    ...(ingredients.length && { recipeIngredient: ingredients }),
    ...(steps.length && { recipeInstructions: steps }),
    ...(item.tags?.length && { keywords: item.tags.join(", ") }),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
}
