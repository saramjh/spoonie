"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface ExpandableTextProps {
  text: string
  maxLines?: 2 | 3
  maxCharacters?: number
  // 글자 크기·색·줄 간격은 부르는 쪽이 정한다 (기본값보다 우선)
  className?: string
  // 있으면 "더보기"가 펼치는 대신 이것을 부른다 (예: 상세로 이동)
  onExpand?: () => void
}

// Tailwind가 클래스를 찾을 수 있게 문자열 그대로 둔다
const CLAMP = { 2: "line-clamp-2", 3: "line-clamp-3" } as const

/**
 * 긴 글을 몇 줄로 접고 "더보기"를 단다. 줄바꿈은 그대로 두고, 한국어 줄바꿈 규칙(keep-all)은 전역 설정을 따른다.
 */
export default function ExpandableText({ text, maxLines = 2, maxCharacters = 120, className, onExpand }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!text) return null

  const isLongText = text.length > maxCharacters || text.split("\n").length > maxLines
  const shouldTruncate = isLongText && !isExpanded

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 전체의 상세 이동과 겹치지 않게
    if (onExpand) onExpand()
    else setIsExpanded(true)
  }

  return (
    <div>
      <p className={cn("whitespace-pre-line text-sm leading-relaxed text-ink", className, shouldTruncate && CLAMP[maxLines])}>{text}</p>
      {shouldTruncate && (
        <button type="button" onClick={handleExpand} className="mt-1 text-sm font-medium text-orange-ink">
          더보기
        </button>
      )}
    </div>
  )
}
