/**
 * 🔐 보안 검증 및 입력 정화 유틸리티
 * XSS, 파일 업로드, 사용자 입력 보안 강화
 */

import DOMPurify from 'isomorphic-dompurify'

// ================================
// 1. 파일 업로드 보안 검증
// ================================

export interface FileValidationOptions {
  maxSize?: number // bytes
  allowedTypes?: string[]
  allowedExtensions?: string[]
  maxFiles?: number
}

export interface FileValidationResult {
  valid: boolean
  error?: string
  sanitizedFile?: File
}

const DEFAULT_FILE_OPTIONS: Required<FileValidationOptions> = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  maxFiles: 10
}

export function validateFile(
  file: File, 
  options: FileValidationOptions = {}
): FileValidationResult {
  const opts = { ...DEFAULT_FILE_OPTIONS, ...options }

  // 파일 크기 검증
  if (file.size > opts.maxSize) {
    return {
      valid: false,
      error: `파일 크기는 ${Math.round(opts.maxSize / 1024 / 1024)}MB를 초과할 수 없습니다.`
    }
  }

  // MIME 타입 검증
  if (!opts.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `지원하지 않는 파일 형식입니다. (${opts.allowedTypes.join(', ')}만 허용)`
    }
  }

  // 파일 확장자 검증 (MIME 타입 우회 방지)
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!opts.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `지원하지 않는 파일 확장자입니다. (${opts.allowedExtensions.join(', ')}만 허용)`
    }
  }

  // 파일명 정화
  const sanitizedName = sanitizeFileName(file.name)
  const sanitizedFile = new File([file], sanitizedName, { type: file.type })

  return {
    valid: true,
    sanitizedFile
  }
}

export function validateMultipleFiles(
  files: FileList | File[],
  options: FileValidationOptions = {}
): { valid: boolean; errors: string[]; validFiles: File[] } {
  const opts = { ...DEFAULT_FILE_OPTIONS, ...options }
  const fileArray = Array.from(files)
  
  // 파일 개수 검증
  if (fileArray.length > opts.maxFiles) {
    return {
      valid: false,
      errors: [`최대 ${opts.maxFiles}개의 파일만 업로드할 수 있습니다.`],
      validFiles: []
    }
  }

  const errors: string[] = []
  const validFiles: File[] = []

  fileArray.forEach((file, index) => {
    const result = validateFile(file, options)
    if (result.valid && result.sanitizedFile) {
      validFiles.push(result.sanitizedFile)
    } else {
      errors.push(`파일 ${index + 1}: ${result.error}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    validFiles
  }
}

// ================================
// 2. 텍스트 입력 정화
// ================================

export interface SanitizeOptions {
  allowHTML?: boolean
  allowedTags?: string[]
  allowedAttributes?: string[]
  maxLength?: number
}

const DEFAULT_SANITIZE_OPTIONS: SanitizeOptions = {
  allowHTML: false,
  allowedTags: ['b', 'i', 'em', 'strong', 'br'],
  allowedAttributes: [],
  maxLength: 10000
}

export function sanitizeInput(
  input: string,
  options: SanitizeOptions = {}
): string {
  if (!input || typeof input !== 'string') return ''

  const opts = { ...DEFAULT_SANITIZE_OPTIONS, ...options }

  // 길이 제한
  let sanitized = input.slice(0, opts.maxLength)

  if (opts.allowHTML) {
    // HTML 허용 시 DOMPurify로 정화
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: opts.allowedTags,
      ALLOWED_ATTR: opts.allowedAttributes,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false
    })
  } else {
    // HTML 완전 제거
    sanitized = sanitized
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/javascript:/gi, '') // JavaScript URL 제거
      .replace(/on\w+\s*=/gi, '') // 이벤트 핸들러 제거
  }

  // 특수 문자 정화
  return sanitized.trim()
}

export function sanitizeSearchQuery(query: string): string {
  return sanitizeInput(query, {
    allowHTML: false,
    maxLength: 100
  })
    .replace(/[^\w\s\u3131-\u318E\uAC00-\uD7A3]/g, '') // 한글, 영숫자만 허용
    .replace(/\s+/g, ' ') // 연속 공백 정리
}

// ================================
// 3. URL 및 경로 검증
// ================================

export function validateURL(url: string): boolean {
  try {
    const parsedURL = new URL(url)
    
    // 허용된 프로토콜만
    const allowedProtocols = ['http:', 'https:']
    if (!allowedProtocols.includes(parsedURL.protocol)) {
      return false
    }

    // 로컬호스트 금지 (SSRF 방지)
    const forbiddenHosts = ['localhost', '127.0.0.1', '0.0.0.0']
    if (forbiddenHosts.includes(parsedURL.hostname)) {
      return false
    }

    // 내부 IP 대역 금지
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (ipRegex.test(parsedURL.hostname)) {
      const parts = parsedURL.hostname.split('.').map(Number)
      // 사설 IP 대역 체크
      if (
        (parts[0] === 10) ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168)
      ) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

// ================================
// 4. 사용자명 및 ID 검증
// ================================

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: '사용자명이 필요합니다.' }
  }

  // 길이 검증
  if (username.length < 2 || username.length > 20) {
    return { valid: false, error: '사용자명은 2-20자 사이여야 합니다.' }
  }

  // 허용된 문자만 (한글, 영숫자, 언더스코어)
  const validChars = /^[a-zA-Z0-9가-힣_]+$/
  if (!validChars.test(username)) {
    return { valid: false, error: '사용자명은 한글, 영숫자, 언더스코어만 사용할 수 있습니다.' }
  }

  // 금지된 단어 검사
  const forbiddenWords = ['admin', 'administrator', 'root', 'system', 'test']
  if (forbiddenWords.some(word => username.toLowerCase().includes(word))) {
    return { valid: false, error: '사용할 수 없는 사용자명입니다.' }
  }

  return { valid: true }
}

// ================================
// 5. 헬퍼 함수들
// ================================

function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9가-힣.\-_]/g, '_') // 특수문자를 언더스코어로
    .replace(/\.+/g, '.') // 연속 점 정리
    .replace(/^\.+|\.+$/g, '') // 앞뒤 점 제거
    .slice(0, 100) // 길이 제한
}

export function generateSecureToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// ================================
// 6. 레이트 리미팅 유틸리티
// ================================

class RateLimiter {
  private attempts = new Map<string, number[]>()

  checkLimit(
    key: string,
    maxAttempts: number,
    windowMs: number
  ): { allowed: boolean; resetTime?: number } {
    const now = Date.now()
    const windowStart = now - windowMs
    
    // 기존 기록 정리
    const keyAttempts = this.attempts.get(key) || []
    const validAttempts = keyAttempts.filter(time => time > windowStart)
    
    if (validAttempts.length >= maxAttempts) {
      const resetTime = validAttempts[0] + windowMs
      return { allowed: false, resetTime }
    }
    
    // 새 시도 기록
    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    
    return { allowed: true }
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }
}

export const rateLimiter = new RateLimiter()