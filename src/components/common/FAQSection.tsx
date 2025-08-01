/**
 * 🤖 FAQ 섹션 UI 컴포넌트
 * SEO 최적화를 위한 실제 사용자 대면 FAQ 인터페이스
 * Schema.org 구조화 데이터와 연동
 */

"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  faqs: FAQItem[]
  title?: string
  className?: string
}

export default function FAQSection({ 
  faqs, 
  title = "자주 묻는 질문", 
  className = "" 
}: FAQSectionProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index)
    } else {
      newOpenItems.add(index)
    }
    setOpenItems(newOpenItems)
  }

  if (!faqs || faqs.length === 0) {
    return null
  }

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
          <HelpCircle className="w-5 h-5 text-orange-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {faqs.map((faq, index) => (
          <div 
            key={index}
            className="border border-gray-200 rounded-lg overflow-hidden hover:border-orange-200 transition-colors"
          >
            {/* 질문 영역 */}
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-4 py-3 text-left flex items-center justify-between bg-gray-50 hover:bg-orange-50 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset"
              aria-expanded={openItems.has(index)}
              aria-controls={`faq-answer-${index}`}
            >
              <span className="font-medium text-gray-800 text-sm leading-relaxed">
                {faq.question}
              </span>
              {openItems.has(index) ? (
                <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
              )}
            </button>

            {/* 답변 영역 */}
            {openItems.has(index) && (
              <div 
                id={`faq-answer-${index}`}
                className="px-4 py-3 bg-white border-t border-gray-100"
              >
                <p className="text-gray-700 text-sm leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// FAQ 접근성 및 SEO 향상을 위한 헬퍼 함수들
export const createFAQStructure = (faqs: FAQItem[], pageTitle: string) => {
  return {
    seoTitle: `${pageTitle} - 자주 묻는 질문`,
    totalQuestions: faqs.length,
    hasQuestions: faqs.length > 0
  }
}

// 일반적인 레시피 FAQ 템플릿
export const getRecipeFAQTemplate = (recipeTitle: string, servings?: number, cookingTime?: number) => {
  return [
    {
      question: `${recipeTitle}는 몇 인분인가요?`,
      answer: servings ? `${servings}인분입니다.` : '레시피 정보를 확인해주세요.'
    },
    {
      question: `${recipeTitle} 조리 시간은 얼마나 걸리나요?`,
      answer: cookingTime ? `약 ${cookingTime}분 소요됩니다.` : '조리 시간은 레시피 정보를 참고해주세요.'
    },
    {
      question: `${recipeTitle} 만들 때 주의사항이 있나요?`,
      answer: '레시피 조리법을 차례대로 따라하시면 맛있게 만들 수 있습니다. 재료의 신선도와 조리 순서를 지켜주세요.'
    },
    {
      question: `재료를 다른 것으로 대체할 수 있나요?`,
      answer: '기본 재료를 권장하지만, 알레르기나 개인 취향에 따라 유사한 재료로 대체 가능합니다. 맛이 조금 달라질 수 있어요.'
    }
  ]
}

// 일반적인 포스트 FAQ 템플릿  
export const getPostFAQTemplate = (authorName: string) => {
  return [
    {
      question: '이 레시피드는 누가 작성했나요?',
      answer: `${authorName}님이 작성한 요리 이야기입니다.`
    },
    {
      question: '레시피드에서 언급한 요리를 따라 만들 수 있나요?',
      answer: '레시피드는 요리 경험과 이야기를 공유하는 콘텐츠입니다. 구체적인 레시피는 작성자의 레시피북을 확인해보세요.'
    },
    {
      question: '댓글로 질문할 수 있나요?',
      answer: '네! 댓글을 통해 작성자와 다른 사용자들과 요리에 대해 이야기를 나눌 수 있습니다.'
    }
  ]
}