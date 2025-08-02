/**
 * 🔄 동시성 제어 시스템
 * Race condition 방지, 동시 요청 처리, 상태 동기화
 */

// ================================
// 1. 뮤텍스 (Mutex) 구현
// ================================

class Mutex {
  private locked = false
  private queue: Array<() => void> = []

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true
        resolve()
      } else {
        this.queue.push(resolve)
      }
    })
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!
      next()
    } else {
      this.locked = false
    }
  }

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }
}

// ================================
// 2. 동시 요청 제어기
// ================================

class ConcurrencyController {
  private mutexes = new Map<string, Mutex>()
  private inProgress = new Map<string, Promise<unknown>>()

  private getMutex(key: string): Mutex {
    if (!this.mutexes.has(key)) {
      this.mutexes.set(key, new Mutex())
    }
    return this.mutexes.get(key)!
  }

  /**
   * 동일한 키에 대한 동시 실행 방지
   */
  async withMutex<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const mutex = this.getMutex(key)
    return mutex.withLock(operation)
  }

  /**
   * 동일한 요청 중복 실행 방지 (동일한 Promise 반환)
   */
  async deduplicate<T>(key: string, operation: () => Promise<T>): Promise<T> {
    // 이미 진행 중인 요청이 있으면 그 결과를 반환
    if (this.inProgress.has(key)) {
      return this.inProgress.get(key) as T
    }

    // 새로운 요청 시작
    const promise = operation().finally(() => {
      this.inProgress.delete(key)
    })

    this.inProgress.set(key, promise)
    return promise
  }

  /**
   * 최대 동시 실행 수 제한
   */
  private semaphores = new Map<string, Semaphore>()

  async withSemaphore<T>(
    key: string, 
    maxConcurrency: number, 
    operation: () => Promise<T>
  ): Promise<T> {
    if (!this.semaphores.has(key)) {
      this.semaphores.set(key, new Semaphore(maxConcurrency))
    }
    
    const semaphore = this.semaphores.get(key)!
    return semaphore.acquire().then(async (release) => {
      try {
        return await operation()
      } finally {
        release()
      }
    })
  }
}

class Semaphore {
  private available: number
  private queue: Array<() => void> = []

  constructor(private maxConcurrency: number) {
    this.available = maxConcurrency
  }

  acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.available > 0) {
        this.available--
        resolve(() => this.release())
      } else {
        this.queue.push(() => {
          this.available--
          resolve(() => this.release())
        })
      }
    })
  }

  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!
      next()
    } else {
      this.available++
    }
  }
}

// ================================
// 3. 옵티미스틱 업데이트 관리자
// ================================

interface OptimisticUpdate<T> {
  id: string
  timestamp: number
  rollback: () => void
  data: T
  confirmed: boolean
}

class OptimisticUpdateManager<T> {
  private updates = new Map<string, OptimisticUpdate<T>>()
  private confirmationTimeout = 5000 // 5초

  /**
   * 옵티미스틱 업데이트 등록
   */
  register(id: string, data: T, rollback: () => void): void {
    const update: OptimisticUpdate<T> = {
      id,
      timestamp: Date.now(),
      rollback,
      data,
      confirmed: false
    }

    this.updates.set(id, update)

    // 타임아웃 후 자동 롤백
    setTimeout(() => {
      if (this.updates.has(id) && !this.updates.get(id)!.confirmed) {
        console.warn(`⚠️ Optimistic update ${id} timed out, rolling back`)
        this.rollback(id)
      }
    }, this.confirmationTimeout)
  }

  /**
   * 옵티미스틱 업데이트 확인
   */
  confirm(id: string): boolean {
    const update = this.updates.get(id)
    if (update) {
      update.confirmed = true
      this.updates.delete(id)
      return true
    }
    return false
  }

  /**
   * 옵티미스틱 업데이트 롤백
   */
  rollback(id: string): boolean {
    const update = this.updates.get(id)
    if (update && !update.confirmed) {
      update.rollback()
      this.updates.delete(id)
      return true
    }
    return false
  }

  /**
   * 모든 미확인 업데이트 롤백
   */
  rollbackAll(): void {
    for (const [, update] of this.updates) {
      if (!update.confirmed) {
        update.rollback()
      }
    }
    this.updates.clear()
  }

  /**
   * 오래된 업데이트 정리
   */
  cleanup(maxAge: number = 30000): void {
    const now = Date.now()
    for (const [id, update] of this.updates) {
      if (now - update.timestamp > maxAge) {
        if (!update.confirmed) {
          update.rollback()
        }
        this.updates.delete(id)
      }
    }
  }
}

// ================================
// 4. 상태 동기화 관리자
// ================================

class StateSyncManager {
  private subscribers = new Map<string, Set<(data: any) => void>>()
  private lastUpdates = new Map<string, { data: any; timestamp: number }>()

  /**
   * 상태 변경 구독
   */
  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }
    
    this.subscribers.get(key)!.add(callback)
    
    // 마지막 상태가 있으면 즉시 콜백 호출
    const lastUpdate = this.lastUpdates.get(key)
    if (lastUpdate) {
      callback(lastUpdate.data)
    }

    // 구독 해제 함수 반환
    return () => {
      this.subscribers.get(key)?.delete(callback)
      if (this.subscribers.get(key)?.size === 0) {
        this.subscribers.delete(key)
      }
    }
  }

  /**
   * 상태 변경 알림
   */
  notify(key: string, data: any): void {
    // 중복 업데이트 방지
    const lastUpdate = this.lastUpdates.get(key)
    if (lastUpdate && JSON.stringify(lastUpdate.data) === JSON.stringify(data)) {
      return
    }

    this.lastUpdates.set(key, { data, timestamp: Date.now() })
    
    const subscribers = this.subscribers.get(key)
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`❌ State sync callback failed for ${key}:`, error)
        }
      })
    }
  }

  /**
   * 구독자 수 확인
   */
  getSubscriberCount(key: string): number {
    return this.subscribers.get(key)?.size || 0
  }

  /**
   * 오래된 상태 정리
   */
  cleanup(maxAge: number = 300000): void { // 5분
    const now = Date.now()
    for (const [key, update] of this.lastUpdates) {
      if (now - update.timestamp > maxAge && this.getSubscriberCount(key) === 0) {
        this.lastUpdates.delete(key)
      }
    }
  }
}

// ================================
// 5. 전역 인스턴스
// ================================

export const concurrencyController = new ConcurrencyController()
export const optimisticUpdateManager = new OptimisticUpdateManager()
export const stateSyncManager = new StateSyncManager()

// ================================
// 6. 유틸리티 함수들
// ================================

/**
 * 좋아요 토글 (Race condition 방지)
 */
export async function safeLikeToggle(
  itemId: string,
  userId: string,
  currentState: { liked: boolean; count: number },
  updateFunction: (liked: boolean) => Promise<{ liked: boolean; count: number }>
): Promise<{ liked: boolean; count: number }> {
  const key = `like_${itemId}_${userId}`
  
  return concurrencyController.withMutex(key, async () => {
    // 옵티미스틱 업데이트 ID 생성
    const updateId = `${key}_${Date.now()}`
    
    // UI 즉시 업데이트
    const optimisticState = {
      liked: !currentState.liked,
      count: currentState.liked ? currentState.count - 1 : currentState.count + 1
    }
    
    try {
      // 서버 업데이트
      const result = await updateFunction(optimisticState.liked)
      
      // 옵티미스틱 업데이트 확인
      optimisticUpdateManager.confirm(updateId)
      
      return result
    } catch (error) {
      // 실패 시 롤백
      optimisticUpdateManager.rollback(updateId)
      throw error
    }
  })
}

/**
 * 댓글 추가 (중복 방지)
 */
export async function safeCommentAdd(
  itemId: string,
  userId: string,
  content: string,
  addFunction: (content: string) => Promise<unknown>
): Promise<unknown> {
  const key = `comment_${itemId}_${userId}_${content.slice(0, 20)}`
  
  return concurrencyController.deduplicate(key, () => addFunction(content))
}

/**
 * 파일 업로드 (동시 업로드 수 제한)
 */
export async function safeFileUpload<T>(
  uploadFunction: () => Promise<T>,
  maxConcurrentUploads: number = 3
): Promise<T> {
  return concurrencyController.withSemaphore(
    'file_upload',
    maxConcurrentUploads,
    uploadFunction
  )
}

// ================================
// 7. React Hook 통합
// ================================

/**
 * 동시성 제어가 적용된 상태 훅
 */
export function useConcurrentState<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void, boolean] {
  const [state, setState] = React.useState<T>(initialValue)
  const [isUpdating, setIsUpdating] = React.useState(false)

  React.useEffect(() => {
    const unsubscribe = stateSyncManager.subscribe(key, (newValue: T) => {
      setState(newValue)
    })

    return unsubscribe
  }, [key])

  const updateState = React.useCallback(async (newValue: T) => {
    setIsUpdating(true)
    try {
      await concurrencyController.withMutex(key, async () => {
        setState(newValue)
        stateSyncManager.notify(key, newValue)
      })
    } finally {
      setIsUpdating(false)
    }
  }, [key])

  return [state, updateState, isUpdating]
}

// React import (실제 프로젝트에서는 상단에 위치)
import React from 'react'