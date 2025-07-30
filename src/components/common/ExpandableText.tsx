"use client"

import { useState } from "react"

interface ExpandableTextProps {
  text: string
  maxLines?: number
  maxCharacters?: number // 글자 수 기준 추가
  className?: string
  expandButtonClass?: string
  onExpand?: () => void
}

/**
 * 🚀 업계 표준 방식의 확장 가능한 텍스트 컴포넌트 (Instagram/Facebook/Twitter 스타일)
 * 
 * @param text - 표시할 텍스트
 * @param maxLines - 초기 표시할 최대 줄 수 (기본: 2줄)
 * @param maxCharacters - 글자 수 기준 (기본: 120자)
 * @param className - 텍스트 스타일
 * @param expandButtonClass - 더보기 버튼 스타일
 * @param onExpand - 더보기 클릭시 실행할 함수 (예: 상세페이지로 이동)
 */
export default function ExpandableText({ 
  text, 
  maxLines = 2, 
  maxCharacters = 120,
  className = "text-sm text-gray-700",
  expandButtonClass = "text-orange-500 hover:text-orange-600 text-sm font-medium ml-1",
  onExpand
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!text) return null

  // 🎯 간단한 방식: 글자 수와 줄바꿈 개수 기준으로 생략 여부 결정
  const lineCount = text.split('\n').length
  const isLongText = text.length > maxCharacters || lineCount > maxLines
  const shouldTruncate = isLongText && !isExpanded

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation() // 부모 클릭 이벤트 방지
    
    if (onExpand) {
      onExpand() // 상세페이지로 이동
    } else {
      setIsExpanded(true) // 인라인 확장
    }
  }

  // 텍스트 잘라내기
  const displayText = shouldTruncate 
    ? text.substring(0, maxCharacters) + (text.length > maxCharacters ? '...' : '')
    : text

  return (
    <div className="relative">
      <div
        className={`${className} break-words leading-relaxed ${
          shouldTruncate ? 'line-clamp-2' : ''
        }`}
        style={{
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-line', // 🚀 줄바꿈 보존
        }}
      >
        {displayText}
      </div>
      
      {/* 🎯 Instagram/Facebook 스타일 더보기 버튼 */}
      {isLongText && !isExpanded && (
        <button
          onClick={handleExpand}
          className={`${expandButtonClass} inline-block transition-colors duration-200 mt-1`}
          aria-label="더 보기"
        >
          더보기
        </button>
      )}
    </div>
  )
} 