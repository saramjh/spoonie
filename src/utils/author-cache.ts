/**
 * 🎭 작성자 정보 캐싱 유틸리티
 * 작성자 정보를 클라이언트 사이드에서 캐싱하여 깜빡임 현상 방지
 */

interface AuthorInfo {
  user_id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  user_public_id: string | null
  cached_at: number
}

class AuthorCache {
  private static instance: AuthorCache
  private cache = new Map<string, AuthorInfo>()
  private readonly CACHE_DURATION = 10 * 60 * 1000 // 10분 캐시

  static getInstance(): AuthorCache {
    if (!AuthorCache.instance) {
      AuthorCache.instance = new AuthorCache()
    }
    return AuthorCache.instance
  }

  /**
   * 작성자 정보 캐시에 저장
   */
  setAuthor(userId: string, authorInfo: Omit<AuthorInfo, 'user_id' | 'cached_at'>): void {
    this.cache.set(userId, {
      user_id: userId,
      ...authorInfo,
      cached_at: Date.now()
    })
  }

  /**
   * 캐시에서 작성자 정보 조회
   */
  getAuthor(userId: string): AuthorInfo | null {
    const cached = this.cache.get(userId)
    
    if (!cached) return null
    
    // 캐시 만료 확인
    if (Date.now() - cached.cached_at > this.CACHE_DURATION) {
      this.cache.delete(userId)
      return null
    }
    
    return cached
  }

  /**
   * 여러 작성자 정보를 배치로 캐시에 저장
   */
  setAuthors(items: Array<{ user_id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; user_public_id?: string | null }>): void {
    items.forEach(item => {
      if (item.user_id) {
        this.setAuthor(item.user_id, {
          username: item.username || null,
          display_name: item.display_name || null,
          avatar_url: item.avatar_url || null,
          user_public_id: item.user_public_id || null
        })
      }
    })
  }

  /**
   * 아이템에 캐시된 작성자 정보 적용
   */
  enrichItemWithCachedAuthor<T extends { user_id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; user_public_id?: string | null }>(item: T): T {
    const cached = this.getAuthor(item.user_id)
    
    if (!cached) return item
    
    return {
      ...item,
      username: item.username || cached.username,
      display_name: item.display_name || cached.display_name,
      avatar_url: item.avatar_url || cached.avatar_url,
      user_public_id: item.user_public_id || cached.user_public_id
    }
  }

  /**
   * 캐시 정리 (메모리 관리)
   */
  cleanup(): void {
    const now = Date.now()
    const entriesToDelete: string[] = []
    
    this.cache.forEach((info, userId) => {
      if (now - info.cached_at > this.CACHE_DURATION) {
        entriesToDelete.push(userId)
      }
    })
    
    entriesToDelete.forEach(userId => {
      this.cache.delete(userId)
    })
  }

  /**
   * 캐시 통계
   */
  getStats(): { totalCached: number; recentlyUsed: number } {
    const now = Date.now()
    const recentThreshold = 5 * 60 * 1000 // 5분 이내
    
    let recentlyUsed = 0
    this.cache.forEach(info => {
      if (now - info.cached_at < recentThreshold) {
        recentlyUsed++
      }
    })
    
    return {
      totalCached: this.cache.size,
      recentlyUsed
    }
  }
}

// 싱글톤 인스턴스
export const authorCache = AuthorCache.getInstance()

// 편의 함수들
export const cacheAuthors = (items: Parameters<typeof authorCache.setAuthors>[0]) => 
  authorCache.setAuthors(items)

export const enrichWithCachedAuthor = <T extends Parameters<typeof authorCache.enrichItemWithCachedAuthor>[0]>(item: T) => 
  authorCache.enrichItemWithCachedAuthor(item)

export const getAuthorFromCache = (userId: string) => 
  authorCache.getAuthor(userId)

// 🔧 메모리 안전: React Hook 기반 캐시 정리로 변경
// 전역 setInterval 대신 useEffect에서 관리하도록 수정
// 사용처: components/layout/ClientLayoutWrapper.tsx에서 useAuthorCacheCleanup() 호출

let cleanupInterval: NodeJS.Timeout | null = null

export function startAuthorCacheCleanup(): () => void {
  if (typeof window === 'undefined' || cleanupInterval) return () => {}
  
  cleanupInterval = setInterval(() => {
    authorCache.cleanup()
  }, 5 * 60 * 1000) // 5분마다 정리
  
  return () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }
  }
}

// 브라우저 환경에서만 자동 시작 (개발 편의성)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  startAuthorCacheCleanup()
} 