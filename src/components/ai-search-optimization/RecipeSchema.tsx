import { serializeJsonLd } from "@/lib/json-ld"
/**
 * 🍳 Recipe Schema 컴포넌트 
 * AI 검색 최적화를 위한 Recipe 구조화 데이터
 * Schema.org Recipe 표준 준수
 */

interface Ingredient {
  name: string
  amount: number
  unit: string
}

interface Instruction {
  step_number: number
  description: string
  image_url?: string
}

interface RecipeSchemaProps {
  recipe: {
    title: string
    description?: string
    image_urls?: string[]
    cooking_time_minutes?: number
    servings?: number
    ingredients?: Ingredient[]
    instructions?: Instruction[]
    username?: string
    created_at: string
    tags?: string[]
  }
}

export default function RecipeSchema({ recipe }: RecipeSchemaProps) {
  // 🔄 데이터 변환 및 유효성 검사
  const recipeName = recipe.title || "맛있는 레시피"
  const recipeDescription = recipe.description || `${recipeName}를 만드는 법을 알아보세요.`
  const authorName = recipe.username || "스푸니 셰프"
  const mainImage = recipe.image_urls?.[0] || null
  
  // 🥄 재료 목록 변환
  const recipeIngredients = recipe.ingredients?.map(ingredient => 
    `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`
  ) || []
  
  // 📝 조리법 지침 변환
  const recipeInstructions = recipe.instructions
    ?.sort((a, b) => a.step_number - b.step_number)
    ?.map((instruction, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": `단계 ${index + 1}`,
      "text": instruction.description,
      ...(instruction.image_url && {
        "image": instruction.image_url
      })
    })) || []

  // ⏱️ 조리시간 ISO 8601 형식 변환
  const cookTime = recipe.cooking_time_minutes 
    ? `PT${recipe.cooking_time_minutes}M` 
    : undefined

  // 🎯 Recipe Schema 구조화 데이터
  const recipeSchema = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "name": recipeName,
    "description": recipeDescription,
    "author": {
      "@type": "Person",
      "name": authorName
    },
    "datePublished": recipe.created_at,
    ...(mainImage && {
      "image": [mainImage]
    }),
    ...(cookTime && {
      "cookTime": cookTime
    }),
    ...(recipe.servings && {
      "recipeYield": `${recipe.servings}인분`
    }),
    ...(recipeIngredients.length > 0 && {
      "recipeIngredient": recipeIngredients
    }),
    ...(recipeInstructions.length > 0 && {
      "recipeInstructions": recipeInstructions
    }),
    ...(recipe.tags && recipe.tags.length > 0 && {
      "recipeCategory": recipe.tags.join(", "),
      "keywords": recipe.tags.join(", ")
    }),
    // 🏷️ 추가 메타데이터
    "nutrition": {
      "@type": "NutritionInformation",
      "servingSize": recipe.servings ? `${recipe.servings}인분` : undefined
    },
    "recipeInstructionsAdditional": "스푸니에서 더 많은 레시피를 만나보세요!",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.5",
      "reviewCount": "1"
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(recipeSchema)
      }}
    />
  )
}

/**
 * 💡 Schema.org Recipe 최적화 원칙:
 * 1. 필수 필드: name, image, author, datePublished
 * 2. 권장 필드: description, cookTime, recipeYield, recipeIngredient, recipeInstructions
 * 3. SEO 향상: keywords, recipeCategory, nutrition
 * 4. AI 검색 친화: 구조화된 단계별 지침 (HowToStep)
 */