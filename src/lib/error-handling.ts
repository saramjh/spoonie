/**
 * ⚡ 통합 에러 핸들링 시스템
 * 사용자 친화적 에러 처리, 재시도 로직, 에러 모니터링
 */

import { toast } from '@/hooks/use-toast'

// ================================
// 1. 에러 타입 정의
// ================================

export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation', 
  AUTH = 'auth',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  CLIENT = 'client',
  RATE_LIMIT = 'rate_limit',
  FILE_UPLOAD = 'file_upload',
  UNKNOWN = 'unknown'
}

export interface AppError extends Error {
  type: ErrorType
  code?: string
  statusCode?: number
  context?: Record<string, unknown>
  retryable?: boolean
  userMessage?: string
}

// ================================
// 2. 에러 분류기
// ================================

export function classifyError(error: any): AppError {
  // Supabase 에러
  if (error?.code) {
    return {
      ...error,
      type: mapSupabaseError(error.code),
      retryable: isRetryableSupabaseError(error.code),
      userMessage: getUserFriendlyMessage(error.code)
    }
  }

  // HTTP 에러
  if (error?.status || error?.statusCode) {
    const status = error.status || error.statusCode
    return {
      ...error,
      type: mapHttpError(status),
      statusCode: status,
      retryable: isRetryableHttpError(status),
      userMessage: getHttpErrorMessage(status)
    }
  }

  // 네트워크 에러
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    return {
      ...error,
      type: ErrorType.NETWORK,
      retryable: true,
      userMessage: '네트워크 연결을 확인해주세요.'
    }
  }

  // Zod 검증 에러
  if (error?.issues && Array.isArray(error.issues)) {
    return {
      ...error,
      type: ErrorType.VALIDATION,
      retryable: false,
      userMessage: '입력 정보를 다시 확인해주세요.'
    }
  }

  // 일반 에러
  return {
    ...error,
    type: ErrorType.UNKNOWN,
    retryable: false,
    userMessage: '예상치 못한 오류가 발생했습니다.'
  }
}

function mapSupabaseError(code: string): ErrorType {
  const errorMap: Record<string, ErrorType> = {
    '23505': ErrorType.VALIDATION, // unique_violation
    '23503': ErrorType.VALIDATION, // foreign_key_violation
    '42501': ErrorType.PERMISSION, // insufficient_privilege
    '42P01': ErrorType.SERVER,     // undefined_table
    'PGRST116': ErrorType.NOT_FOUND, // no rows found
    'PGRST301': ErrorType.PERMISSION, // RLS policy violation
  }
  
  return errorMap[code] || ErrorType.SERVER
}

function mapHttpError(status: number): ErrorType {
  if (status >= 400 && status < 500) {
    switch (status) {
      case 401: return ErrorType.AUTH
      case 403: return ErrorType.PERMISSION
      case 404: return ErrorType.NOT_FOUND
      case 422: return ErrorType.VALIDATION
      case 429: return ErrorType.RATE_LIMIT
      default: return ErrorType.CLIENT
    }
  }
  
  if (status >= 500) {
    return ErrorType.SERVER
  }
  
  return ErrorType.UNKNOWN
}

function isRetryableSupabaseError(code: string): boolean {
  // 일시적 오류들
  const retryableCodes = ['40001', '40P01', '53300', '53400']
  return retryableCodes.includes(code)
}

function isRetryableHttpError(status: number): boolean {
  // 서버 에러나 일시적 클라이언트 에러
  return status >= 500 || status === 408 || status === 429
}

function getUserFriendlyMessage(code: string): string {
  const messageMap: Record<string, string> = {
    '23505': '이미 존재하는 데이터입니다.',
    '23503': '연결된 데이터가 없습니다.',
    '42501': '권한이 없습니다.',
    'PGRST116': '요청한 데이터를 찾을 수 없습니다.',
    'PGRST301': '접근 권한이 없습니다.',
  }
  
  return messageMap[code] || '데이터베이스 오류가 발생했습니다.'
}

function getHttpErrorMessage(status: number): string {
  const messageMap: Record<number, string> = {
    400: '잘못된 요청입니다.',
    401: '로그인이 필요합니다.',
    403: '권한이 없습니다.',
    404: '요청한 페이지를 찾을 수 없습니다.',
    408: '요청 시간이 초과되었습니다.',
    422: '입력 정보가 올바르지 않습니다.',
    429: '너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요.',
    500: '서버 오류가 발생했습니다.',
    502: '서버에 연결할 수 없습니다.',
    503: '서버가 일시적으로 사용할 수 없습니다.',
  }
  
  return messageMap[status] || '네트워크 오류가 발생했습니다.'
}

// ================================
// 3. 재시도 시스템
// ================================

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryCondition?: (error: AppError) => boolean
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error) => error.retryable === true
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...defaultRetryConfig, ...config }
  let lastError: AppError
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = classifyError(error)
      
      // 재시도 불가능한 에러
      if (!finalConfig.retryCondition!(lastError)) {
        throw lastError
      }
      
      // 마지막 시도
      if (attempt === finalConfig.maxAttempts) {
        throw lastError
      }
      
      // 백오프 대기
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt - 1),
        finalConfig.maxDelay
      )
      
      console.log(`🔄 Retry attempt ${attempt}/${finalConfig.maxAttempts} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// ================================
// 4. 에러 핸들러
// ================================

export interface ErrorHandlerConfig {
  showToast?: boolean
  logError?: boolean
  reportError?: boolean
  fallbackMessage?: string
}

const defaultErrorConfig: ErrorHandlerConfig = {
  showToast: true,
  logError: true,
  reportError: false, // 프로덕션에서 true로 설정
  fallbackMessage: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

export function handleError(
  error: any,
  operation: string,
  config: ErrorHandlerConfig = {}
): AppError {
  const finalConfig = { ...defaultErrorConfig, ...config }
  const appError = classifyError(error)
  
  // 로깅
  if (finalConfig.logError) {
    console.error(`❌ ${operation} failed:`, {
      type: appError.type,
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      context: appError.context,
      stack: appError.stack
    })
  }
  
  // 사용자 알림
  if (finalConfig.showToast) {
    const userMessage = appError.userMessage || finalConfig.fallbackMessage!
    
    toast({
      title: getErrorTitle(appError.type),
      description: userMessage,
      variant: "destructive",
    })
  }
  
  // 에러 모니터링 (향후 Sentry 등 연동)
  if (finalConfig.reportError && shouldReportError(appError)) {
    reportErrorToService(appError, operation)
  }
  
  return appError
}

function getErrorTitle(type: ErrorType): string {
  const titleMap: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: '네트워크 오류',
    [ErrorType.VALIDATION]: '입력 오류',
    [ErrorType.AUTH]: '인증 오류',
    [ErrorType.PERMISSION]: '권한 오류',
    [ErrorType.NOT_FOUND]: '찾을 수 없음',
    [ErrorType.SERVER]: '서버 오류',
    [ErrorType.CLIENT]: '클라이언트 오류',
    [ErrorType.RATE_LIMIT]: '요청 제한',
    [ErrorType.FILE_UPLOAD]: '파일 업로드 오류',
    [ErrorType.UNKNOWN]: '알 수 없는 오류'
  }
  
  return titleMap[type] || '오류'
}

function shouldReportError(error: AppError): boolean {
  // 사용자 에러나 예상 가능한 에러는 리포트하지 않음
  const skipTypes = [
    ErrorType.VALIDATION,
    ErrorType.AUTH,
    ErrorType.PERMISSION,
    ErrorType.NOT_FOUND,
    ErrorType.RATE_LIMIT
  ]
  
  return !skipTypes.includes(error.type)
}

function reportErrorToService(error: AppError, operation: string): void {
  // 향후 Sentry, LogRocket 등과 연동
  console.log('📊 Error reported:', { error, operation })
}

// ================================
// 5. 구체적 에러 핸들러들
// ================================

export const errorHandlers = {
  // 폼 제출 에러
  form: (error: any, formName: string) => handleError(error, `${formName} 폼 제출`, {
    fallbackMessage: '폼 제출 중 오류가 발생했습니다.'
  }),
  
  // 데이터 로드 에러
  dataLoad: (error: any, dataType: string) => handleError(error, `${dataType} 데이터 로드`, {
    showToast: false, // 데이터 로드 실패는 UI에서 처리
    fallbackMessage: '데이터를 불러오는 중 오류가 발생했습니다.'
  }),
  
  // 파일 업로드 에러
  fileUpload: (error: any) => handleError(error, '파일 업로드', {
    fallbackMessage: '파일 업로드 중 오류가 발생했습니다.'
  }),
  
  // 네트워크 에러
  network: (error: any, operation: string) => handleError(error, operation, {
    fallbackMessage: '네트워크 연결을 확인해주세요.'
  }),
  
  // 인증 에러
  auth: (error: any) => handleError(error, '인증 처리', {
    fallbackMessage: '로그인이 필요합니다.'
  })
}

// ================================
// 6. 유틸리티 함수들
// ================================

/**
 * 에러를 안전하게 문자열로 변환
 */
export function errorToString(error: any): string {
  if (typeof error === 'string') {
    return error
  }
  
  if (error?.message) {
    return error.message
  }
  
  return '알 수 없는 오류가 발생했습니다.'
}

/**
 * Promise를 안전하게 실행 (에러 처리 포함)
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
  errorHandler?: (error: any) => void
): Promise<T | undefined> {
  try {
    return await operation()
  } catch (error) {
    if (errorHandler) {
      errorHandler(error)
    } else {
      console.error('Unhandled async error:', error)
    }
    return fallback
  }
}

/**
 * 조건부 에러 무시
 */
export function ignoreError<T>(
  operation: () => T,
  condition: (error: any) => boolean = () => true
): T | undefined {
  try {
    return operation()
  } catch (error) {
    if (condition(error)) {
      return undefined
    }
    throw error
  }
}