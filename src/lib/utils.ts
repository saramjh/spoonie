import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

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

export function formatQuantity(quantity: number): string {
  // 소수점 첫째 자리까지 표시 (필요에 따라 정밀도 조절 가능)
  return quantity.toFixed(1);
}

/**
 * 대용량 숫자를 사용자 친화적으로 축약 (Instagram/YouTube 방식)
 * @param count 숫자
 * @returns 축약된 문자열 (예: 1.2K, 5.8M)
 */
export function formatCount(count: number): string {
  if (count < 1000) {
    return count.toString()
  }
  
  if (count < 10000) {
    // 1K ~ 9.9K
    const k = count / 1000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`
  }
  
  if (count < 1000000) {
    // 10K ~ 999K
    return `${Math.floor(count / 1000)}K`
  }
  
  if (count < 10000000) {
    // 1M ~ 9.9M
    const m = count / 1000000
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
  }
  
  // 10M+
  return `${Math.floor(count / 1000000)}M`
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
