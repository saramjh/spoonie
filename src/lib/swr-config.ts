import { SWRConfiguration } from 'swr'

/**
 * 🚀 SWR 전역 최적화 설정
 * 서버 부담 최소화와 사용자 경험 개선을 위한 균형 잡힌 캐시 전략
 */

// 캐시 키별 최적화 설정 매핑
const cacheKeyConfigs: Record<string, Partial<SWRConfiguration>> = {
  // 피드 데이터 - 자주 변경되므로 적당한 캐시
  'items|': {
    dedupingInterval: 5000, // 5초 중복 방지 (빠른 반응)
    focusThrottleInterval: 30000, // 30초 포커스 throttle
    revalidateOnFocus: true, // 포커스 시 재검증 (최신 데이터)
    refreshInterval: 0, // 자동 새로고침 비활성화
    errorRetryCount: 2,
    errorRetryInterval: 1000,
  },

  // 사용자 프로필 - 거의 변경되지 않음
  'profile_': {
    dedupingInterval: 30 * 60 * 1000, // 30분 중복 방지
    focusThrottleInterval: 60 * 60 * 1000, // 1시간 포커스 throttle
    revalidateOnFocus: false, // 포커스 시 재검증 안함
    refreshInterval: 0,
    errorRetryCount: 1,
  },

  // 참고 레시피 - 변경 빈도 낮음
  'cited-recipes:': {
    dedupingInterval: 15 * 60 * 1000, // 15분 중복 방지
    focusThrottleInterval: 30 * 60 * 1000, // 30분 포커스 throttle
    revalidateOnFocus: false,
    refreshInterval: 0,
    errorRetryCount: 1,
  },

  // 댓글 데이터 - 실시간성 중요
  'comments_': {
    dedupingInterval: 2000, // 2초 중복 방지 (빠른 반응)
    focusThrottleInterval: 10000, // 10초 포커스 throttle
    revalidateOnFocus: true, // 포커스 시 재검증
    refreshInterval: 0,
    errorRetryCount: 3, // 댓글은 중요하므로 재시도 많이
  },

  // 좋아요한 사용자 목록 - 적당한 캐시
  'likers|': {
    dedupingInterval: 10000, // 10초 중복 방지
    focusThrottleInterval: 60000, // 1분 포커스 throttle
    revalidateOnFocus: false,
    refreshInterval: 0,
    errorRetryCount: 1,
  },

  // 상세 페이지 데이터 - 변경 빈도 낮음
  'item_details_': {
    dedupingInterval: 10000, // 10초 중복 방지
    focusThrottleInterval: 30000, // 30초 포커스 throttle
    revalidateOnFocus: true, // 최신 상태 확인
    refreshInterval: 0,
    errorRetryCount: 2,
  },

  // 검색 결과 - 빠른 응답 필요
  'search|': {
    dedupingInterval: 5000, // 5초 중복 방지
    focusThrottleInterval: 15000, // 15초 포커스 throttle
    revalidateOnFocus: false, // 검색 결과는 즉시 응답
    refreshInterval: 0,
    errorRetryCount: 1,
  },

  // 인기 키워드/게시물 - 자주 변경되지 않음
  'popular_': {
    dedupingInterval: 5 * 60 * 1000, // 5분 중복 방지
    focusThrottleInterval: 10 * 60 * 1000, // 10분 포커스 throttle
    revalidateOnFocus: false,
    refreshInterval: 0,
    errorRetryCount: 1,
  }
}

// 기본 SWR 설정
export const defaultSWRConfig: SWRConfiguration = {
  // 기본 캐시 설정 (보수적)
  dedupingInterval: 10000, // 10초 기본 중복 방지
  focusThrottleInterval: 60000, // 1분 기본 포커스 throttle
  
  // 네트워크 설정
  loadingTimeout: 5000, // 5초 로딩 타임아웃
  errorRetryCount: 2, // 기본 2번 재시도
  errorRetryInterval: 1000, // 1초 재시도 간격
  
  // 사용자 경험 설정
  revalidateOnFocus: true, // 포커스 시 기본적으로 재검증
  revalidateOnReconnect: true, // 재연결 시 재검증
  refreshWhenHidden: false, // 숨겨진 상태에서 새로고침 안함
  refreshWhenOffline: false, // 오프라인에서 새로고침 안함
  
  // 개발 환경 설정
  refreshInterval: 0, // 자동 새로고침 비활성화 (배터리 절약)
  
  // 성능 최적화
  revalidateIfStale: true, // stale 데이터일 때만 재검증
  
  // 에러 처리
  shouldRetryOnError: (error) => {
    // 4xx 에러는 재시도 안함 (클라이언트 에러)
    if (error?.status >= 400 && error?.status < 500) {
      return false
    }
    return true
  },

  // 조건부 설정 적용 함수
  use: [
    (useSWRNext) => (key, fetcher, config) => {
      // 캐시 키에 따른 최적화 설정 적용
      let optimizedConfig = { ...config }

      if (typeof key === 'string') {
        // 캐시 키 패턴에 맞는 설정 찾기
        for (const [pattern, patternConfig] of Object.entries(cacheKeyConfigs)) {
          if (key.startsWith(pattern)) {
            optimizedConfig = { ...optimizedConfig, ...patternConfig }
        
            break
          }
        }
      }

      return useSWRNext(key, fetcher, optimizedConfig)
    }
  ]
}

/**
 * 🔍 SWR 성능 모니터링 헬퍼
 */
export class SWRMetrics {
  private static metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    totalResponseTime: 0,
    keyPatternStats: new Map<string, { hits: number; misses: number; errors: number }>()
  }

  static recordRequest(key: string, fromCache: boolean, responseTime?: number, error?: boolean): void {
    this.metrics.totalRequests++
    
    if (error) {
      this.metrics.errors++
    } else if (fromCache) {
      this.metrics.cacheHits++
    } else {
      this.metrics.cacheMisses++
      if (responseTime) {
        this.metrics.totalResponseTime += responseTime
      }
    }

    // 키 패턴별 통계
    const pattern = this.getKeyPattern(key)
    if (!this.metrics.keyPatternStats.has(pattern)) {
      this.metrics.keyPatternStats.set(pattern, { hits: 0, misses: 0, errors: 0 })
    }
    
    const patternStats = this.metrics.keyPatternStats.get(pattern)!
    if (error) {
      patternStats.errors++
    } else if (fromCache) {
      patternStats.hits++
    } else {
      patternStats.misses++
    }
  }

  private static getKeyPattern(key: string): string {
    for (const pattern of Object.keys(cacheKeyConfigs)) {
      if (key.startsWith(pattern)) {
        return pattern
      }
    }
    return 'other'
  }

  static getMetrics() {
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests * 100).toFixed(2) + '%'
      : '0%'
    
    const avgResponseTime = this.metrics.cacheMisses > 0
      ? (this.metrics.totalResponseTime / this.metrics.cacheMisses).toFixed(0) + 'ms'
      : '0ms'

    return {
      ...this.metrics,
      cacheHitRate,
      avgResponseTime,
      keyPatternStats: Object.fromEntries(this.metrics.keyPatternStats)
    }
  }

  static reset(): void {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      totalResponseTime: 0,
      keyPatternStats: new Map()
    }
  }
}

/**
 * 개발 환경에서 SWR 상태 디버깅
 */
export const enableSWRDevtools = () => {
  if (process.env.NODE_ENV === 'development') {
    // 전역 window 객체에 SWR 메트릭 노출
    if (typeof window !== 'undefined') {
      (window as typeof window & { swrMetrics: typeof SWRMetrics }).swrMetrics = SWRMetrics
    
    }
  }
} 