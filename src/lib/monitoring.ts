/**
 * 📊 통합 모니터링 & 로깅 시스템
 * 에러 추적, 성능 모니터링, 사용자 행동 분석
 */

// ================================
// 1. 로그 레벨 정의
// ================================

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug'
}

// ================================
// 2. 로그 인터페이스
// ================================

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  userId?: string
  sessionId?: string
  userAgent?: string
  url?: string
  context?: Record<string, any>
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  performance?: {
    duration: number
    memory?: number
    networkCalls?: number
  }
  userAction?: {
    type: string
    target: string
    data?: Record<string, any>
  }
}

// ================================
// 3. 로거 클래스
// ================================

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private sessionId: string
  private userId?: string

  constructor() {
    this.sessionId = this.generateSessionId()
    this.setupGlobalErrorHandlers()
    this.setupPerformanceMonitoring()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  setUserId(userId: string): void {
    this.userId = userId
  }

  private createLogEntry(
    level: LogLevel, 
    message: string, 
    context?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      context
    }
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    const logEntry = this.createLogEntry(LogLevel.ERROR, message, context)
    
    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    }

    this.addLog(logEntry)
    
    // 에러는 즉시 전송
    this.sendToServer([logEntry])
  }

  warn(message: string, context?: Record<string, any>): void {
    const logEntry = this.createLogEntry(LogLevel.WARN, message, context)
    this.addLog(logEntry)
  }

  info(message: string, context?: Record<string, any>): void {
    const logEntry = this.createLogEntry(LogLevel.INFO, message, context)
    this.addLog(logEntry)
  }

  debug(message: string, context?: Record<string, any>): void {
    const logEntry = this.createLogEntry(LogLevel.DEBUG, message, context)
    this.addLog(logEntry)
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry)
    
    // 메모리 사용량 제한
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // 개발 환경에서는 콘솔에도 출력
    if (process.env.NODE_ENV === 'development') {
      const style = this.getConsoleStyle(entry.level)
      console.log(`%c[${entry.level.toUpperCase()}] ${entry.message}`, style, entry)
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      [LogLevel.ERROR]: 'color: #ff4444; font-weight: bold;',
      [LogLevel.WARN]: 'color: #ffaa00; font-weight: bold;',
      [LogLevel.INFO]: 'color: #4444ff;',
      [LogLevel.DEBUG]: 'color: #888888;'
    }
    return styles[level]
  }

  // ================================
  // 4. 성능 모니터링
  // ================================

  startPerformanceTimer(operation: string): () => void {
    const startTime = performance.now()
    const startMemory = (performance as any).memory?.usedJSHeapSize

    return () => {
      const duration = performance.now() - startTime
      const endMemory = (performance as any).memory?.usedJSHeapSize
      const memoryDelta = endMemory ? endMemory - startMemory : undefined

      const logEntry = this.createLogEntry(LogLevel.INFO, `Performance: ${operation}`)
      logEntry.performance = {
        duration,
        memory: memoryDelta
      }

      this.addLog(logEntry)
    }
  }

  trackUserAction(type: string, target: string, data?: Record<string, any>): void {
    const logEntry = this.createLogEntry(LogLevel.INFO, `User Action: ${type}`)
    logEntry.userAction = {
      type,
      target,
      data
    }

    this.addLog(logEntry)
  }

  // ================================
  // 5. 글로벌 에러 핸들러 설정
  // ================================

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return

    // JavaScript 에러
    window.addEventListener('error', (event) => {
      this.error('Uncaught Error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    })

    // Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', event.reason, {
        promise: event.promise
      })
    })

    // React Error Boundary와 연동 (향후)
    if (typeof window !== 'undefined') {
      (window as any).__SPOONIE_ERROR_LOGGER__ = this
    }
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined') return

    // 페이지 로드 성능
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        
        this.info('Page Load Performance', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart
        })
      }, 0)
    })

    // 큰 레이아웃 시프트 감지
    if ('LayoutShift' in window) {
      let clsValue = 0
      let clsEntries: any[] = []

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
            clsEntries.push(entry)
          }
        }

        if (clsValue > 0.1) { // CLS 임계값
          this.warn('High Cumulative Layout Shift detected', {
            clsValue,
            entries: clsEntries.length
          })
        }
      })

      observer.observe({ type: 'layout-shift', buffered: true })
    }
  }

  // ================================
  // 6. 서버 전송
  // ================================

  private sendToServer(logs: LogEntry[]): void {
    if (typeof window === 'undefined') return

    // 에러가 아닌 로그는 배치로 전송
    const errorLogs = logs.filter(log => log.level === LogLevel.ERROR)
    const otherLogs = logs.filter(log => log.level !== LogLevel.ERROR)

    // 에러 로그 즉시 전송
    if (errorLogs.length > 0) {
      this.sendBatch(errorLogs)
    }

    // 다른 로그는 배치 처리
    if (otherLogs.length > 0) {
      this.batchSend(otherLogs)
    }
  }

  private batchQueue: LogEntry[] = []
  private batchTimeout?: NodeJS.Timeout

  private batchSend(logs: LogEntry[]): void {
    this.batchQueue.push(...logs)

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    // 5초 후 또는 50개 로그가 쌓이면 전송
    this.batchTimeout = setTimeout(() => {
      if (this.batchQueue.length > 0) {
        this.sendBatch([...this.batchQueue])
        this.batchQueue = []
      }
    }, 5000)

    if (this.batchQueue.length >= 50) {
      this.sendBatch([...this.batchQueue])
      this.batchQueue = []
      
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout)
        this.batchTimeout = undefined
      }
    }
  }

  private async sendBatch(logs: LogEntry[]): Promise<void> {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs })
      })
    } catch (error) {
      console.error('Failed to send logs to server:', error)
    }
  }

  // ================================
  // 7. 데이터 내보내기
  // ================================

  exportLogs(level?: LogLevel): LogEntry[] {
    return level 
      ? this.logs.filter(log => log.level === level)
      : [...this.logs]
  }

  getStats(): {
    totalLogs: number
    errorCount: number
    warningCount: number
    sessionDuration: number
  } {
    const errors = this.logs.filter(log => log.level === LogLevel.ERROR).length
    const warnings = this.logs.filter(log => log.level === LogLevel.WARN).length
    const firstLog = this.logs[0]
    const lastLog = this.logs[this.logs.length - 1]
    
    const sessionDuration = firstLog && lastLog 
      ? new Date(lastLog.timestamp).getTime() - new Date(firstLog.timestamp).getTime()
      : 0

    return {
      totalLogs: this.logs.length,
      errorCount: errors,
      warningCount: warnings,
      sessionDuration
    }
  }
}

// ================================
// 8. 특화된 모니터링 함수들
// ================================

export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>()

  static measure<T>(operation: string, fn: () => T): T
  static measure<T>(operation: string, fn: () => Promise<T>): Promise<T>
  static measure<T>(operation: string, fn: () => T | Promise<T>): T | Promise<T> {
    const start = performance.now()
    
    try {
      const result = fn()
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.recordMetric(operation, performance.now() - start)
        })
      } else {
        this.recordMetric(operation, performance.now() - start)
        return result
      }
    } catch (error) {
      this.recordMetric(operation, performance.now() - start)
      throw error
    }
  }

  private static recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }
    
    const metrics = this.metrics.get(operation)!
    metrics.push(duration)
    
    // 최대 100개까지만 저장
    if (metrics.length > 100) {
      metrics.shift()
    }

    // 성능 임계값 체크
    if (duration > 1000) { // 1초 이상
      logger.warn(`Slow operation detected: ${operation}`, {
        duration,
        average: this.getAverage(operation)
      })
    }
  }

  static getAverage(operation: string): number {
    const metrics = this.metrics.get(operation)
    if (!metrics || metrics.length === 0) return 0
    
    return metrics.reduce((sum, value) => sum + value, 0) / metrics.length
  }

  static getStats(): Record<string, { count: number; average: number; min: number; max: number }> {
    const stats: Record<string, any> = {}
    
    for (const [operation, metrics] of this.metrics) {
      if (metrics.length > 0) {
        stats[operation] = {
          count: metrics.length,
          average: this.getAverage(operation),
          min: Math.min(...metrics),
          max: Math.max(...metrics)
        }
      }
    }
    
    return stats
  }
}

// ================================
// 9. 사용자 행동 추적기
// ================================

export class UserActionTracker {
  private static actions: Array<{
    type: string
    target: string
    timestamp: string
    data?: Record<string, any>
  }> = []

  static track(type: string, target: string, data?: Record<string, any>): void {
    this.actions.push({
      type,
      target, 
      timestamp: new Date().toISOString(),
      data
    })

    logger.trackUserAction(type, target, data)

    // 메모리 관리
    if (this.actions.length > 500) {
      this.actions = this.actions.slice(-500)
    }
  }

  static getActions(type?: string): typeof this.actions {
    return type 
      ? this.actions.filter(action => action.type === type)
      : [...this.actions]
  }

  static getActionStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    
    for (const action of this.actions) {
      stats[action.type] = (stats[action.type] || 0) + 1
    }
    
    return stats
  }
}

// ================================
// 10. 전역 인스턴스
// ================================

export const logger = new Logger()

// 브라우저 환경에서만 자동 추적 설정
if (typeof window !== 'undefined') {
  // 클릭 이벤트 자동 추적
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const tagName = target.tagName.toLowerCase()
    const className = target.className
    const id = target.id
    
    UserActionTracker.track('click', tagName, {
      className,
      id,
      text: target.textContent?.slice(0, 50)
    })
  })

  // 페이지 이탈 시 남은 로그 전송
  window.addEventListener('beforeunload', () => {
    logger.exportLogs().forEach(log => {
      if (log.level === LogLevel.ERROR) {
        // 에러 로그는 즉시 전송 (navigator.sendBeacon 사용)
        navigator.sendBeacon('/api/logs', JSON.stringify({ logs: [log] }))
      }
    })
  })
}

// ================================
// 11. React Error Boundary 연동
// ================================

export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

export function logErrorBoundary(error: Error, errorInfo: any): void {
  logger.error('React Error Boundary triggered', error, {
    componentStack: errorInfo.componentStack,
    errorBoundary: true
  })
}

// ================================
// 12. 유틸리티 함수들
// ================================

/**
 * API 호출 모니터링 래퍼
 */
export function monitoredFetch(url: string, options?: RequestInit): Promise<Response> {
  return PerformanceMonitor.measure(`fetch_${url}`, async () => {
    const response = await fetch(url, options)
    
    UserActionTracker.track('api_call', url, {
      method: options?.method || 'GET',
      status: response.status,
      ok: response.ok
    })

    if (!response.ok) {
      logger.warn(`API call failed: ${url}`, {
        status: response.status,
        statusText: response.statusText
      })
    }

    return response
  })
}

/**
 * 개발 모드에서 성능 통계 표시
 */
export function showPerformanceStats(): void {
  if (process.env.NODE_ENV === 'development') {
    console.table(PerformanceMonitor.getStats())
    console.table(UserActionTracker.getActionStats())
    console.log('Logger Stats:', logger.getStats())
  }
}