/**
 * 🎨 토스 스타일 FAQ 섹션
 * 토스 수석 UX/UI 디자이너 이토스의 디자인 철학 적용
 * 
 * 핵심 원칙:
 * 1. 정보 우선순위 명확화
 * 2. 부드러운 마이크로 인터랙션
 * 3. 한국 사용자에게 친숙한 패턴
 * 4. 접근성 최우선 고려
 */

"use client"

import { useState } from "react"
import { ChevronDown, MessageCircle, HelpCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface FAQItem {
  question: string
  answer: string
}

interface TossStyleFAQSectionProps {
  faqs: FAQItem[]
  title?: string
  className?: string
}

export default function TossStyleFAQSection({ 
  faqs, 
  title = "자주 묻는 질문", 
  className = "" 
}: TossStyleFAQSectionProps) {
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
    <div className={`space-y-4 ${className}`}>
      {/* 🎨 토스 스타일 섹션 헤더 */}
      <div className="flex items-center gap-3 px-4">
        <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-orange-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">궁금한 점을 빠르게 해결해보세요</p>
        </div>
      </div>

      {/* 🎨 토스 스타일 FAQ 아이템들 */}
      <div className="bg-white rounded-2xl overflow-hidden">
        {faqs.map((faq, index) => (
          <div key={index} className="border-b border-gray-100 last:border-b-0">
            {/* 질문 버튼 */}
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors focus:outline-none focus:bg-orange-50 group"
              aria-expanded={openItems.has(index)}
              aria-controls={`faq-answer-${index}`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-orange-100 group-focus:bg-orange-200 transition-colors">
                  <HelpCircle className="w-3 h-3 text-gray-500 group-hover:text-orange-500 group-focus:text-orange-600" />
                </div>
                <span className="font-medium text-gray-900 text-sm leading-relaxed">
                  {faq.question}
                </span>
              </div>
              
              <motion.div
                animate={{ rotate: openItems.has(index) ? 180 : 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="ml-4"
              >
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </motion.div>
            </button>

            {/* 답변 영역 - 토스 스타일 애니메이션 */}
            <AnimatePresence>
              {openItems.has(index) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  id={`faq-answer-${index}`}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-5 pt-2">
                    <div className="bg-orange-50 rounded-xl p-4 border-l-4 border-orange-200">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* 🎨 토스 스타일 도움말 메시지 */}
      <div className="px-4">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">
            더 궁금한 점이 있으시면 댓글로 질문해주세요!
          </p>
        </div>
      </div>
    </div>
  )
}

// 🎨 토스 스타일 FAQ 데이터 생성 헬퍼
export const createTossStyleFAQs = {
  recipe: (title: string, servings?: number, cookingTime?: number) => [
    {
      question: `${title} 몇 인분인가요?`,
      answer: servings ? `${servings}인분 기준으로 만들어져요. 가족 구성원에 맞게 재료를 조절해보세요!` : '레시피 정보를 확인해주세요.'
    },
    {
      question: `조리 시간은 얼마나 걸리나요?`,
      answer: cookingTime ? `약 ${cookingTime}분 정도 소요돼요. 준비 시간과 조리 시간을 포함한 예상 시간입니다.` : '조리 시간은 레시피를 참고해주세요.'
    },
    {
      question: `초보자도 따라 할 수 있나요?`,
      answer: '네! 단계별로 자세히 설명되어 있어서 요리 초보자분도 쉽게 따라 하실 수 있어요. 천천히 단계를 따라가보세요.'
    },
    {
      question: `재료를 다른 것으로 바꿔도 되나요?`,
      answer: '기본 재료를 추천하지만, 알레르기나 취향에 따라 비슷한 재료로 대체 가능해요. 맛이 조금 달라질 수 있습니다.'
    }
  ],

  post: (authorName: string) => [
    {
      question: `이 레시피드는 누가 썼나요?`,
      answer: `${authorName}님의 요리 경험담이에요. 실제 요리를 해보신 후기와 팁을 공유해주셨습니다.`
    },
    {
      question: `레시피드와 레시피의 차이는 뭔가요?`,
      answer: '레시피드는 요리 경험과 일상을 공유하는 콘텐츠이고, 레시피는 구체적인 조리법을 담은 가이드예요.'
    },
    {
      question: `댓글로 질문해도 되나요?`,
      answer: '물론이에요! 댓글로 궁금한 점을 물어보시면 작성자나 다른 분들이 답변해드릴 거예요.'
    }
  ]
}