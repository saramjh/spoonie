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
// 2. 파일 업로드 검증
// ================================

export interface FileValidationResult {
  isValid: boolean
  error?: string
  warnings?: string[]
}

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_TOTAL_SIZE = 20 * 1024 * 1024 // 20MB (전체)

/**
 * 이미지 파일 검증
 */
export function validateImageFile(file: File): FileValidationResult {
  // 1. 파일 타입 검증
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `지원하지 않는 파일 형식입니다. (지원: JPG, PNG, WebP)`
    }
  }

  // 2. 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `파일 크기가 너무 큽니다. (최대: ${MAX_FILE_SIZE / 1024 / 1024}MB)`
    }
  }

  // 3. 파일명 검증 (경로 조작 방지)
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      isValid: false,
      error: '올바르지 않은 파일명입니다.'
    }
  }

  const warnings: string[] = []
  
  // 4. 경고사항
  if (file.size > 2 * 1024 * 1024) { // 2MB 이상
    warnings.push('큰 파일은 업로드 시간이 오래 걸릴 수 있습니다.')
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * 다중 파일 검증
 */
export function validateMultipleFiles(files: File[]): FileValidationResult {
  // 1. 개별 파일 검증
  for (const file of files) {
    const result = validateImageFile(file)
    if (!result.isValid) {
      return result
    }
  }

  // 2. 전체 크기 검증
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      isValid: false,
      error: `전체 파일 크기가 너무 큽니다. (최대: ${MAX_TOTAL_SIZE / 1024 / 1024}MB)`
    }
  }

  // 3. 파일 개수 검증
  if (files.length > 10) {
    return {
      isValid: false,
      error: '최대 10개 파일까지 업로드할 수 있습니다.'
    }
  }

  return { isValid: true }
}

// ================================
// 3. URL 검증
// ================================

/**
 * 안전한 URL 검증
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * 내부 링크 검증 (오픈 리다이렉트 방지)
 */
export function validateInternalLink(path: string): boolean {
  // 절대 경로나 외부 URL 차단
  if (path.startsWith('http') || path.startsWith('//') || path.includes('..')) {
    return false
  }
  
  // 허용된 경로 패턴
  const allowedPatterns = [
    /^\/$/,                          // 홈
    /^\/recipes\/[a-zA-Z0-9-]+$/,    // 레시피 상세
    /^\/posts\/[a-zA-Z0-9-]+$/,      // 포스트 상세
    /^\/profile\/[a-zA-Z0-9-]+$/,    // 프로필
    /^\/search/,                     // 검색
    /^\/notifications$/              // 알림
  ]
  
  return allowedPatterns.some(pattern => pattern.test(path))
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
 * UUID 검증
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * 안전한 정수 변환
 */
export function safeParseInt(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return Math.floor(value)
  }
  
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return !isNaN(parsed) ? parsed : defaultValue
  }
  
  return defaultValue
}

/**
 * 🔢 안전한 실수 변환 (소숫점 지원)
 * 재료량 등 소숫점 입력을 위한 안전한 parseFloat 대안
 */
export function safeParseFloat(value: any, defaultValue: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return !isNaN(parsed) ? parsed : defaultValue
  }
  
  return defaultValue
}