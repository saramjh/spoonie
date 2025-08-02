/**
 * 💰 무료 플랜 최적화 유틸리티
 * Netlify + Supabase 무료 티어 제한 대응
 */

// 💰 Supabase 무료 플랜 제한
export const FREE_TIER_LIMITS = {
  // API 호출 제한
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 3600,
  
  // 실시간 연결 제한
  MAX_REALTIME_CONNECTIONS: 200,
  
  // 스토리지 제한
  MAX_STORAGE_GB: 1,
  
  // 데이터베이스 제한
  MAX_DB_SIZE_MB: 500,
} as const

// 💰 캐시 최적화 설정
export const CACHE_CONFIG = {
  // SWR 캐싱 설정
  DEDUPING_INTERVAL: 60000, // 1분
  FOCUS_THROTTLE: 30000, // 30초
  ERROR_RETRY_INTERVAL: 10000, // 10초
  
  // 브라우저 캐시 설정
  LOCAL_STORAGE_TTL: 5 * 60 * 1000, // 5분
  SESSION_STORAGE_TTL: 30 * 60 * 1000, // 30분
} as const

// 💰 폴링 최적화 설정
export const POLLING_CONFIG = {
  // 알림 배지 폴링 (백그라운드)
  BADGE_POLL_INTERVAL: 3 * 60 * 1000, // 3분
  
  // 알림 리스트 폴링 (활성 페이지)
  LIST_POLL_INTERVAL: 30 * 1000, // 30초
  
  // 페이지 비활성 시 폴링 중단
  VISIBILITY_AWARE: true,
} as const

/**
 * 💰 API 호출 제한 확인
 */
export function isWithinApiLimits(): boolean {
  const now = Date.now()
  const minute = Math.floor(now / 60000)
  const hour = Math.floor(now / 3600000)
  
  // localStorage에서 호출 횟수 추적
  const minuteKey = `api_calls_${minute}`
  const hourKey = `api_calls_${hour}`
  
  const minuteCalls = parseInt(localStorage.getItem(minuteKey) || '0')
  const hourCalls = parseInt(localStorage.getItem(hourKey) || '0')
  
  return (
    minuteCalls < FREE_TIER_LIMITS.MAX_REQUESTS_PER_MINUTE &&
    hourCalls < FREE_TIER_LIMITS.MAX_REQUESTS_PER_HOUR
  )
}

/**
 * 💰 API 호출 기록
 */
export function recordApiCall(): void {
  const now = Date.now()
  const minute = Math.floor(now / 60000)
  const hour = Math.floor(now / 3600000)
  
  const minuteKey = `api_calls_${minute}`
  const hourKey = `api_calls_${hour}`
  
  const minuteCalls = parseInt(localStorage.getItem(minuteKey) || '0') + 1
  const hourCalls = parseInt(localStorage.getItem(hourKey) || '0') + 1
  
  localStorage.setItem(minuteKey, minuteCalls.toString())
  localStorage.setItem(hourKey, hourCalls.toString())
  
  // 이전 기록 정리 (메모리 절약)
  cleanupOldApiRecords()
}

/**
 * 💰 오래된 API 호출 기록 정리
 */
function cleanupOldApiRecords(): void {
  const now = Date.now()
  // const currentMinute = Math.floor(now / 60000) // Not used in current implementation
  const currentHour = Math.floor(now / 3600000)
  
  // localStorage에서 오래된 기록 삭제
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    
    if (key.startsWith('api_calls_')) {
      const timestamp = parseInt(key.split('_')[2])
      
      // 1시간 이상 된 기록 삭제
      if (timestamp < currentHour - 1) {
        localStorage.removeItem(key)
      }
    }
  }
}

/**
 * 💰 배치 처리 최적화
 */
export class BatchProcessor<T> {
  private batch: T[] = []
  private timer: NodeJS.Timeout | null = null
  private readonly maxBatchSize: number
  private readonly batchDelay: number
  private readonly processor: (items: T[]) => Promise<void>

  constructor(
    processor: (items: T[]) => Promise<void>,
    maxBatchSize = 10,
    batchDelay = 1000
  ) {
    this.processor = processor
    this.maxBatchSize = maxBatchSize
    this.batchDelay = batchDelay
  }

  add(item: T): void {
    this.batch.push(item)

    // 배치 크기 도달 시 즉시 처리
    if (this.batch.length >= this.maxBatchSize) {
      this.flush()
      return
    }

    // 타이머 설정 (일정 시간 후 처리)
    if (this.timer) {
      clearTimeout(this.timer)
    }

    this.timer = setTimeout(() => {
      this.flush()
    }, this.batchDelay)
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return

    const itemsToProcess = [...this.batch]
    this.batch = []

    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    try {
      await this.processor(itemsToProcess)
    } catch (error) {
      console.error('💰 배치 처리 실패:', error)
    }
  }

  destroy(): void {
    this.flush()
    if (this.timer) {
      clearTimeout(this.timer)
    }
  }
}

/**
 * 💰 브라우저 캐시 유틸리티
 */
export class BrowserCache {
  private static setWithTTL(key: string, value: unknown, ttl: number, storage: Storage): void {
    const item = {
      value,
      expiry: Date.now() + ttl
    }
    storage.setItem(key, JSON.stringify(item))
  }

  private static getWithTTL(key: string, storage: Storage): unknown | null {
    const itemStr = storage.getItem(key)
    if (!itemStr) return null

    try {
      const item = JSON.parse(itemStr)
      if (Date.now() > item.expiry) {
        storage.removeItem(key)
        return null
      }
      return item.value
    } catch {
      storage.removeItem(key)
      return null
    }
  }

  // 로컬 스토리지 (5분 TTL)
  static setLocal(key: string, value: unknown): void {
    this.setWithTTL(key, value, CACHE_CONFIG.LOCAL_STORAGE_TTL, localStorage)
  }

  static getLocal(key: string): unknown | null {
    return this.getWithTTL(key, localStorage)
  }

  // 세션 스토리지 (30분 TTL)
  static setSession(key: string, value: unknown): void {
    this.setWithTTL(key, value, CACHE_CONFIG.SESSION_STORAGE_TTL, sessionStorage)
  }

  static getSession(key: string): unknown | null {
    return this.getWithTTL(key, sessionStorage)
  }
}

/**
 * 💰 네트워크 상태 감지
 */
export function useNetworkOptimization() {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } })?.connection

  return {
    isOnline,
    isSlowConnection: connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g',
    saveData: connection?.saveData === true,
    
    // 느린 연결에서 폴링 주기 조정
    getOptimizedPollingInterval: (baseInterval: number) => {
      if (!isOnline) return Infinity // 오프라인 시 폴링 중단
      if (connection?.saveData) return baseInterval * 2 // 데이터 절약 모드
      if (connection?.effectiveType === 'slow-2g') return baseInterval * 3
      return baseInterval
    }
  }
}