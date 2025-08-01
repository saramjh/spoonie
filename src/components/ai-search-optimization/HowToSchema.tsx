/**
 * 🤖 HowTo Schema 컴포넌트 
 * AI 검색 최적화를 위한 단계별 지침 구조화 데이터
 */

interface HowToStep {
  name: string
  text: string
  image?: string
  url?: string
}

interface HowToSchemaProps {
  name: string
  description: string
  steps: HowToStep[]
  totalTime?: string
  category?: string
  image?: string
}

export default function HowToSchema({ 
  name, 
  description, 
  steps, 
  totalTime, 
  category = "Recipe",
  image 
}: HowToSchemaProps) {
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "description": description,
    ...(image && { "image": image }),
    ...(totalTime && { "totalTime": totalTime }),
    "category": category,
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      ...(step.url && { "url": step.url }),
      ...(step.image && {
        "image": {
          "@type": "ImageObject",
          "url": step.image,
          "caption": `${name} - ${step.name}`
        }
      })
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(howToSchema, null, 2)
      }}
    />
  )
}

// 요리 관련 공통 HowTo 템플릿들
export const cookingHowToTemplates = {
  basicCooking: {
    category: "Recipe",
    commonSteps: [
      "재료 준비 및 손질",
      "조리 도구 준비",
      "재료 조리하기",
      "간 맞추기",
      "완성 및 플레이팅"
    ]
  },
  
  baking: {
    category: "Baking",
    commonSteps: [
      "오븐 예열하기",
      "재료 계량하기", 
      "반죽 만들기",
      "굽기",
      "식히기 및 장식"
    ]
  },

  mealPrep: {
    category: "Meal Prep",
    commonSteps: [
      "주간 메뉴 계획",
      "재료 구매 목록 작성",
      "재료 준비 및 손질",
      "조리 및 보관",
      "일주일간 활용"
    ]
  }
}