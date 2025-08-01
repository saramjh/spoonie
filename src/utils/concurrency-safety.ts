/**
 * 🔐 동시 작업 안전성 보장 유틸리티
 * Race Condition 방지, 트랜잭션 관리, 낙관적 업데이트 안전성
 */

// ================================
// 1. 뮤텍스 패턴 구현
// ================================

export class Mutex {
  private locked = false
  private waitingQueue: (() => void)[] = []

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true
        resolve(() => this.release())
      } else {
        this.waitingQueue.push(() => {
          this.locked = true
          resolve(() => this.release())
        })
      }
    })
  }

  private release(): void {
    const next = this.waitingQueue.shift()
    if (next) {
      next()
    } else {
      this.locked = false
    }
  }

  isLocked(): boolean {
    return this.locked
  }
}

// ================================
// 2. 세마포어 패턴 구현
// ================================

export class Semaphore {
  private permits: number
  private waitingQueue: (() => void)[] = []

  constructor(initialPermits: number) {
    this.permits = initialPermits
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--
        resolve(() => this.release())
      } else {
        this.waitingQueue.push(() => {
          this.permits--
          resolve(() => this.release())
        })
      }
    })
  }

  private release(): void {
    this.permits++
    const next = this.waitingQueue.shift()
    if (next) {
      next()
    }
  }

  availablePermits(): number {
    return this.permits
  }
}

// ================================
// 3. 작업 큐 관리자
// ================================

interface QueuedOperation<T> {
  id: string
  operation: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: any) => void
  priority: number
  timestamp: number
}

export class OperationQueue<T = any> {
  private queue: QueuedOperation<T>[] = []
  private processing = false
  private concurrencyLimit: number
  private activeOperations = 0

  constructor(concurrencyLimit: number = 1) {
    this.concurrencyLimit = concurrencyLimit
  }

  async add<R = T>(
    operation: () => Promise<R>,
    options: { id?: string; priority?: number } = {}
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const queuedOp: QueuedOperation<R> = {
        id: options.id || `op_${Date.now()}_${Math.random()}`,
        operation: operation as () => Promise<R>,
        resolve: resolve as (value: R) => void,
        reject,
        priority: options.priority || 0,
        timestamp: Date.now()
      }

      // 우선순위별로 삽입
      const insertIndex = this.queue.findIndex(
        item => item.priority < queuedOp.priority
      )
      
      if (insertIndex === -1) {
        this.queue.push(queuedOp as unknown as QueuedOperation<T>)
      } else {
        this.queue.splice(insertIndex, 0, queuedOp as unknown as QueuedOperation<T>)
      }

      this.processQueue()
    })
  }

  private async processQueue(): Promise<void> {
    if (this.activeOperations >= this.concurrencyLimit) {
      return
    }

    const operation = this.queue.shift()
    if (!operation) {
      return
    }

    this.activeOperations++

    try {
      const result = await operation.operation()
      operation.resolve(result)
    } catch (error) {
      operation.reject(error)
    } finally {
      this.activeOperations--
      // 다음 작업 처리
      this.processQueue()
    }
  }

  getQueueLength(): number {
    return this.queue.length
  }

  getActiveOperations(): number {
    return this.activeOperations
  }

  clear(): void {
    this.queue.forEach(op => op.reject(new Error('Queue cleared')))
    this.queue = []
  }
}

// ================================
// 4. 낙관적 업데이트 관리자
// ================================

interface OptimisticUpdate<T> {
  id: string
  originalData: T
  optimisticData: T
  operation: () => Promise<T>
  onSuccess?: (data: T) => void
  onError?: (error: any, originalData: T) => void
  rollback: () => void
  timestamp: number
  timeout?: NodeJS.Timeout
}

export class OptimisticUpdateManager<T = any> {
  private updates = new Map<string, OptimisticUpdate<T>>()
  private defaultTimeout = 30000 // 30초

  async performOptimisticUpdate(
    id: string,
    originalData: T,
    optimisticData: T,
    operation: () => Promise<T>,
    rollback: () => void,
    options: {
      onSuccess?: (data: T) => void
      onError?: (error: any, originalData: T) => void
      timeout?: number
    } = {}
  ): Promise<T> {
    // 이미 진행 중인 업데이트가 있으면 대기
    if (this.updates.has(id)) {
      throw new Error(`Operation ${id} is already in progress`)
    }

    const update: OptimisticUpdate<T> = {
      id,
      originalData,
      optimisticData,
      operation,
      onSuccess: options.onSuccess,
      onError: options.onError,
      rollback,
      timestamp: Date.now()
    }

    // 타임아웃 설정
    const timeout = options.timeout || this.defaultTimeout
    update.timeout = setTimeout(() => {
      this.handleTimeout(id)
    }, timeout)

    this.updates.set(id, update)

    try {
      const result = await operation()
      
      // 성공 시 정리
      this.cleanupUpdate(id)
      options.onSuccess?.(result)
      
      return result
    } catch (error) {
      // 실패 시 롤백
      this.rollbackUpdate(id, error)
      throw error
    }
  }

  private rollbackUpdate(id: string, error?: any): void {
    const update = this.updates.get(id)
    if (!update) return

    try {
      update.rollback()
      update.onError?.(error, update.originalData)
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError)
    }

    this.cleanupUpdate(id)
  }

  private handleTimeout(id: string): void {
    const update = this.updates.get(id)
    if (!update) return

    console.warn(`Optimistic update ${id} timed out, rolling back`)
    this.rollbackUpdate(id, new Error('Operation timeout'))
  }

  private cleanupUpdate(id: string): void {
    const update = this.updates.get(id)
    if (update?.timeout) {
      clearTimeout(update.timeout)
    }
    this.updates.delete(id)
  }

  getPendingUpdates(): string[] {
    return Array.from(this.updates.keys())
  }

  cancelUpdate(id: string): void {
    this.rollbackUpdate(id, new Error('Operation cancelled'))
  }

  cancelAllUpdates(): void {
    const ids = Array.from(this.updates.keys())
    ids.forEach(id => this.cancelUpdate(id))
  }
}

// ================================
// 5. 데이터 일관성 검증기
// ================================

export class DataConsistencyChecker<T> {
  private snapshots = new Map<string, T>()

  createSnapshot(key: string, data: T): void {
    this.snapshots.set(key, JSON.parse(JSON.stringify(data)))
  }

  verifyConsistency(key: string, currentData: T): boolean {
    const snapshot = this.snapshots.get(key)
    if (!snapshot) return true

    return JSON.stringify(snapshot) === JSON.stringify(currentData)
  }

  removeSnapshot(key: string): void {
    this.snapshots.delete(key)
  }

  clearAllSnapshots(): void {
    this.snapshots.clear()
  }
}

// ================================
// 6. 전역 동시성 관리자
// ================================

class ConcurrencyManager {
  private static instance: ConcurrencyManager
  private mutexes = new Map<string, Mutex>()
  private semaphores = new Map<string, Semaphore>()
  private queues = new Map<string, OperationQueue>()
  private optimisticManagers = new Map<string, OptimisticUpdateManager>()

  static getInstance(): ConcurrencyManager {
    if (!ConcurrencyManager.instance) {
      ConcurrencyManager.instance = new ConcurrencyManager()
    }
    return ConcurrencyManager.instance
  }

  getMutex(key: string): Mutex {
    if (!this.mutexes.has(key)) {
      this.mutexes.set(key, new Mutex())
    }
    return this.mutexes.get(key)!
  }

  getSemaphore(key: string, permits: number = 1): Semaphore {
    if (!this.semaphores.has(key)) {
      this.semaphores.set(key, new Semaphore(permits))
    }
    return this.semaphores.get(key)!
  }

  getQueue(key: string, concurrencyLimit: number = 1): OperationQueue {
    if (!this.queues.has(key)) {
      this.queues.set(key, new OperationQueue(concurrencyLimit))
    }
    return this.queues.get(key)!
  }

  getOptimisticManager<T>(key: string): OptimisticUpdateManager<T> {
    if (!this.optimisticManagers.has(key)) {
      this.optimisticManagers.set(key, new OptimisticUpdateManager<T>())
    }
    return this.optimisticManagers.get(key)! as OptimisticUpdateManager<T>
  }

  cleanup(key: string): void {
    this.mutexes.delete(key)
    this.semaphores.delete(key)
    this.queues.get(key)?.clear()
    this.queues.delete(key)
    this.optimisticManagers.get(key)?.cancelAllUpdates()
    this.optimisticManagers.delete(key)
  }
}

export const concurrencyManager = ConcurrencyManager.getInstance()

// ================================
// 7. 편의 함수들
// ================================

export async function withMutex<T>(
  key: string,
  operation: () => Promise<T>
): Promise<T> {
  const mutex = concurrencyManager.getMutex(key)
  const release = await mutex.acquire()
  
  try {
    return await operation()
  } finally {
    release()
  }
}

export async function withSemaphore<T>(
  key: string,
  operation: () => Promise<T>,
  permits: number = 1
): Promise<T> {
  const semaphore = concurrencyManager.getSemaphore(key, permits)
  const release = await semaphore.acquire()
  
  try {
    return await operation()
  } finally {
    release()
  }
}

export async function withQueue<T>(
  queueKey: string,
  operation: () => Promise<T>,
  options: { priority?: number; operationId?: string } = {}
): Promise<T> {
  const queue = concurrencyManager.getQueue(queueKey)
  return queue.add(operation, {
    id: options.operationId,
    priority: options.priority
  })
}