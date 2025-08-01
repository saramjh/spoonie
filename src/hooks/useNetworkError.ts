/**
 * 🌐 네트워크 에러 및 오프라인 상태 관리 훅
 * 연결 상태 감지, 자동 재시도, 백그라운드 동기화
 */

"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from '@/hooks/use-toast'

// ================================
// 1. 타입 정의
// ================================

interface NetworkState {
  isOnline: boolean
  isConnecting: boolean
  lastOnlineTime?: number
  connectionType?: string
}

interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
}

interface NetworkErrorOptions {
  enableToast?: boolean
  enableRetry?: boolean
  retryConfig?: Partial<RetryConfig>
  onOffline?: () => void
  onOnline?: () => void
}

// ================================
// 2. 기본 설정
// ================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
}

// ================================
// 3. 온라인 상태 감지 훅
// ================================

export function useOnlineStatus() {
  const [networkState, setNetworkState] = useState<NetworkState>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnecting: false
  }))

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine
      setNetworkState(prev => ({
        ...prev,
        isOnline,
        isConnecting: false,
        lastOnlineTime: isOnline ? Date.now() : prev.lastOnlineTime
      }))
    }

    const handleOnline = () => {
      updateOnlineStatus()
      // 연결 복구 시 토스트
      toast({
        title: "🌐 연결 복구됨",
        description: "인터넷 연결이 복구되었습니다.",
        duration: 2000
      })
    }

    const handleOffline = () => {
      updateOnlineStatus()
      // 연결 끊김 시 토스트
      toast({
        title: "📡 연결 끊김",
        description: "인터넷 연결을 확인해주세요.",
        variant: "destructive",
        duration: 5000
      })
    }

    // 이벤트 리스너 등록
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Connection API 지원 시 추가 정보
    const connection = (navigator as any).connection
    if (connection) {
      const handleConnectionChange = () => {
        setNetworkState(prev => ({
          ...prev,
          connectionType: connection.effectiveType
        }))
      }
      connection.addEventListener('change', handleConnectionChange)
      
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        connection.removeEventListener('change', handleConnectionChange)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return networkState
}

// ================================
// 4. 자동 재시도 훅
// ================================

export function useRetryableOperation<T>(
  operation: () => Promise<T>,
  options: NetworkErrorOptions = {}
) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState<Error | null>(null)
  
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig }
  const { isOnline } = useOnlineStatus()
  const timeoutRef = useRef<NodeJS.Timeout>()

  const executeWithRetry = useCallback(async (): Promise<T | null> => {
    // 오프라인 상태면 즉시 실패
    if (!isOnline) {
      const error = new Error('오프라인 상태입니다. 연결을 확인해주세요.')
      setLastError(error)
      if (options.enableToast) {
        toast({
          title: "연결 오류",
          description: error.message,
          variant: "destructive"
        })
      }
      return null
    }

    try {
      const result = await operation()
      
      // 성공 시 상태 초기화
      setRetryCount(0)
      setLastError(null)
      setIsRetrying(false)
      
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      setLastError(err)

      // 재시도 가능한 에러인지 확인
      const isRetryableError = isNetworkError(err) && options.enableRetry
      
      if (isRetryableError && retryCount < retryConfig.maxAttempts) {
        setIsRetrying(true)
        setRetryCount(prev => prev + 1)

        // 지수 백오프로 재시도 지연
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, retryCount),
          retryConfig.maxDelay
        )

        if (options.enableToast) {
          toast({
            title: `재시도 중... (${retryCount + 1}/${retryConfig.maxAttempts})`,
            description: `${delay / 1000}초 후 다시 시도합니다.`,
            duration: delay
          })
        }

        // 재시도 예약
        timeoutRef.current = setTimeout(() => {
          executeWithRetry()
        }, delay)

        return null
      } else {
        // 최종 실패
        setIsRetrying(false)
        if (options.enableToast) {
          toast({
            title: "작업 실패",
            description: err.message,
            variant: "destructive"
          })
        }
        throw err
      }
    }
  }, [operation, retryCount, isOnline, options, retryConfig])

  // 수동 재시도
  const retry = useCallback(() => {
    setRetryCount(0)
    setLastError(null)
    return executeWithRetry()
  }, [executeWithRetry])

  // 재시도 취소
  const cancelRetry = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsRetrying(false)
    setRetryCount(0)
  }, [])

  // 클린업
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    execute: executeWithRetry,
    retry,
    cancelRetry,
    isRetrying,
    retryCount,
    lastError,
    maxRetries: retryConfig.maxAttempts
  }
}

// ================================
// 5. 백그라운드 동기화 훅
// ================================

export function useBackgroundSync<T>(
  syncOperation: () => Promise<T>,
  interval: number = 30000 // 30초
) {
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<Error | null>(null)
  
  const { isOnline } = useOnlineStatus()
  const intervalRef = useRef<NodeJS.Timeout>()

  const performSync = useCallback(async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    setSyncError(null)

    try {
      await syncOperation()
      setLastSyncTime(Date.now())
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Sync failed')
      setSyncError(err)
      console.warn('Background sync failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [syncOperation, isOnline, isSyncing])

  // 주기적 동기화 설정
  useEffect(() => {
    if (!isOnline) return

    intervalRef.current = setInterval(performSync, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [performSync, interval, isOnline])

  // 온라인 복구 시 즉시 동기화
  useEffect(() => {
    if (isOnline && !lastSyncTime) {
      performSync()
    }
  }, [isOnline, lastSyncTime, performSync])

  return {
    performSync,
    lastSyncTime,
    isSyncing,
    syncError
  }
}

// ================================
// 6. 헬퍼 함수들
// ================================

function isNetworkError(error: Error): boolean {
  const networkErrorPatterns = [
    /network/i,
    /fetch/i,
    /timeout/i,
    /connection/i,
    /abort/i,
    /offline/i
  ]

  return networkErrorPatterns.some(pattern => 
    pattern.test(error.message) || pattern.test(error.name)
  )
}

// ================================
// 7. 전역 네트워크 상태 관리
// ================================

class NetworkStateManager {
  private static instance: NetworkStateManager
  private listeners: Set<(state: NetworkState) => void> = new Set()
  private currentState: NetworkState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnecting: false
  }

  static getInstance(): NetworkStateManager {
    if (!NetworkStateManager.instance) {
      NetworkStateManager.instance = new NetworkStateManager()
    }
    return NetworkStateManager.instance
  }

  subscribe(listener: (state: NetworkState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  updateState(newState: Partial<NetworkState>): void {
    this.currentState = { ...this.currentState, ...newState }
    this.listeners.forEach(listener => listener(this.currentState))
  }

  getState(): NetworkState {
    return this.currentState
  }
}

export const networkStateManager = NetworkStateManager.getInstance()