import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

// 글자 역할(text-display ~ text-micro)을 크기로 알려 준다. 모르면 색(text-ink)과 같은 무리로 보고 서로 지운다
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["display", "step", "title", "heading", "read", "body", "label", "meta", "micro"] }] } },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(dateString: string): string {
  // 방어적 코딩: 유효하지 않은 날짜 처리
  if (!dateString) {
    return "방금 전";
  }
  
  const date = new Date(dateString);
  
  // Invalid Date 확인
  if (isNaN(date.getTime())) {
    console.warn("Invalid date string:", dateString);
    return "방금 전";
  }
  
  return formatDistanceToNow(date, { addSuffix: true, locale: ko });
}

/**
 * 시간을 간단한 형태로 표시 (모바일 친화적)
 * @param dateString ISO 날짜 문자열
 * @returns 축약된 시간 (예: 2시간, 3일, 1개월)
 */
export function formatCompactTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / 30)
  
  if (diffHours < 1) return "방금"
  if (diffHours < 24) return `${diffHours}시간`
  if (diffDays < 30) return `${diffDays}일`
  if (diffMonths < 12) return `${diffMonths}개월`
  
  const diffYears = Math.floor(diffMonths / 12)
  return `${diffYears}년`
}
