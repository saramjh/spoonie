/**
 * 🤖 FAQ Schema 컴포넌트 
 * AI 검색 최적화를 위한 FAQ 구조화 데이터
 */

interface FAQItem {
  question: string
  answer: string
}

interface FAQSchemaProps {
  faqs: FAQItem[]
  pageTitle: string
}

export default function FAQSchema({ faqs, pageTitle }: FAQSchemaProps) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "name": `${pageTitle} - 자주 묻는 질문`,
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer", 
        "text": faq.answer
      }
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(faqSchema, null, 2)
      }}
    />
  )
}

// 스푸니 관련 공통 FAQ들
export const commonRecipeFAQs: FAQItem[] = [
  {
    question: "이 레시피는 몇 인분인가요?",
    answer: "레시피 정보에 표시된 인분수를 확인해주세요. 대부분의 레시피는 2-4인분 기준으로 작성되어 있습니다."
  },
  {
    question: "조리 시간은 얼마나 걸리나요?",
    answer: "각 레시피마다 예상 조리 시간이 표시되어 있습니다. 준비 시간과 조리 시간을 합쳐서 계산해주세요."
  },
  {
    question: "재료를 다른 것으로 대체할 수 있나요?",
    answer: "대부분의 재료는 비슷한 성질의 다른 재료로 대체 가능합니다. 댓글에서 다른 사용자들의 대체 재료 경험을 확인해보세요."
  },
  {
    question: "레시피를 저장하거나 공유할 수 있나요?",
    answer: "네, 북마크 기능으로 레시피를 저장하고, 공유 버튼으로 다른 사람들과 레시피를 공유할 수 있습니다."
  },
  {
    question: "초보자도 따라할 수 있나요?",
    answer: "스푸니의 레시피들은 단계별로 자세히 설명되어 있어 요리 초보자도 쉽게 따라할 수 있습니다. 사진과 함께 설명이 제공됩니다."
  }
]

export const commonPostFAQs: FAQItem[] = [
  {
    question: "레시피드란 무엇인가요?",
    answer: "레시피드는 레시피(Recipe)와 피드(Feed)를 합친 말로, 요리 과정이나 음식에 대한 일상적인 이야기를 공유하는 게시물입니다."
  },
  {
    question: "레시피드에 어떤 내용을 올릴 수 있나요?",
    answer: "요리 후기, 맛집 방문 경험, 요리 팁, 재료 소개 등 음식과 요리에 관련된 모든 이야기를 자유롭게 공유할 수 있습니다."
  },
  {
    question: "다른 사용자와 어떻게 소통하나요?",
    answer: "좋아요, 댓글, 팔로우 기능을 통해 다른 사용자들과 소통할 수 있습니다. 관심있는 요리사를 팔로우해서 새 게시물을 받아보세요."
  }
]

export const platformFAQs: FAQItem[] = [
  {
    question: "스푸니는 어떤 서비스인가요?",
    answer: "스푸니는 레시피 공유와 요리 이야기를 나누는 커뮤니티 플랫폼입니다. 개인 레시피북 관리, 요리법 검색, 팔로우 기능을 제공합니다."
  },
  {
    question: "무료로 사용할 수 있나요?",
    answer: "네, 스푸니의 모든 기본 기능은 무료로 사용할 수 있습니다. 회원가입만 하면 레시피 작성, 공유, 검색 모든 기능을 이용할 수 있습니다."
  },
  {
    question: "모바일에서도 사용할 수 있나요?",
    answer: "네, 스푸니는 모바일 최적화된 웹 서비스로 스마트폰, 태블릿에서도 편리하게 사용할 수 있습니다."
  },
  {
    question: "개인정보는 안전한가요?",
    answer: "스푸니는 사용자의 개인정보 보호를 최우선으로 합니다. 모든 데이터는 암호화되어 안전하게 저장되며, 개인정보 처리방침을 준수합니다."
  }
]