/**
 * 🛡️ 보안 유틸리티
 * XSS, 파일 업로드, 입력 검증 등 보안 관련 기능 통합
 */

import DOMPurify from 'dompurify'

// ================================
// 1. XSS 방지
// ================================

/**
 * HTML 태그 및 스크립트 제거
 */
export function sanitizeHtml(input: string): string {
  if (typeof window === 'undefined') {
    // 서버사이드에서는 기본 sanitization
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
  }
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // HTML 태그 완전 제거
    ALLOWED_ATTR: []
  })
}

/**
 * 사용자 입력 텍스트 안전화 (마크다운 허용 버전)
 */
export function sanitizeUserContent(input: string): string {
  if (typeof window === 'undefined') {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: []
  })
}

// ================================
// 4. 레이트 리미팅
// ================================

class RateLimiter {
  private attempts = new Map<string, number[]>()
  
  /**
   * 레이트 리미팅 체크
   */
  checkLimit(
    key: string, 
    maxAttempts: number = 5, 
    windowMs: number = 60000 // 1분
  ): { allowed: boolean; resetTime?: number } {
    const now = Date.now()
    const windowStart = now - windowMs
    
    // 기존 시도 기록 가져오기
    const attempts = this.attempts.get(key) || []
    
    // 윈도우 밖의 시도들 제거
    const recentAttempts = attempts.filter(time => time > windowStart)
    
    // 제한 확인
    if (recentAttempts.length >= maxAttempts) {
      const resetTime = recentAttempts[0] + windowMs
      return { allowed: false, resetTime }
    }
    
    // 새 시도 기록
    recentAttempts.push(now)
    this.attempts.set(key, recentAttempts)
    
    return { allowed: true }
  }
  
  /**
   * 특정 키의 시도 기록 초기화
   */
  reset(key: string): void {
    this.attempts.delete(key)
  }
}

export const rateLimiter = new RateLimiter()

// ================================
// 5. 입력 검증 헬퍼
// ================================

/**
 * 이메일 검증
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 안전한 정수 변환
 */
// ✅ Removed unused export for better tree shaking
// export function safeParseInt(value: unknown, defaultValue: number = 0): number {
//   if (typeof value === 'number' && !isNaN(value)) {
//     return Math.floor(value)
//   }
//   
//   if (typeof value === 'string') {
//     const parsed = parseInt(value, 10)
//     return !isNaN(parsed) ? parsed : defaultValue
//   }
//   
//   return defaultValue
// }

/**
 * 🔢 안전한 실수 변환 (소숫점 지원)
 * 재료량 등 소숫점 입력을 위한 안전한 parseFloat 대안
 */
export function safeParseFloat(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return !isNaN(parsed) ? parsed : defaultValue
  }
  
  return defaultValue
}