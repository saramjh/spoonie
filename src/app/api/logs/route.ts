/**
 * 📊 로그 수집 API
 * 클라이언트에서 전송된 로그를 수집하고 저장
 */

import { NextRequest, NextResponse } from 'next/server'

import { rateLimiter } from '@/lib/security-utils'
import { z } from 'zod'

// ================================
// 1. 로그 스키마 검증
// ================================

const logEntrySchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']),
  message: z.string().max(1000),
  timestamp: z.string(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
  userAgent: z.string().optional(),
  url: z.string().url().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  error: z.object({
    name: z.string(),
    message: z.string(),
    stack: z.string().optional(),
    code: z.string().optional()
  }).optional(),
  performance: z.object({
    duration: z.number(),
    memory: z.number().optional(),
    networkCalls: z.number().optional()
  }).optional(),
  userAction: z.object({
    type: z.string(),
    target: z.string(),
    data: z.record(z.string(), z.unknown()).optional()
  }).optional()
})



const logsRequestSchema = z.object({
  logs: z.array(logEntrySchema).max(100) // 최대 100개까지
})

// ================================
// 2. 로그 저장소 (간단한 파일 기반)
// ================================

class LogStorage {
  private static instance: LogStorage
  private logs: any[] = []
  private maxLogs = 10000

  static getInstance(): LogStorage {
    if (!this.instance) {
      this.instance = new LogStorage()
    }
    return this.instance
  }

  async saveLogs(logs: any[]): Promise<void> {
    // 메모리에 저장 (실제 운영에서는 데이터베이스나 로그 서비스 사용)
    this.logs.push(...logs)
    
    // 메모리 관리
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // 중요한 에러는 즉시 알림 (실제로는 Slack, Discord 등으로)
    const criticalErrors = logs.filter(log => 
      log.level === 'error' && 
      !this.isKnownError(log)
    )

    for (const error of criticalErrors) {
      await this.notifyCriticalError(error)
    }

    // 개발 환경에서는 콘솔에 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Received ${logs.length} logs:`)
      logs.forEach(log => {
        const emoji = this.getLogEmoji(log.level)
        console.log(`${emoji} [${log.level}] ${log.message}`, log)
      })
    }
  }

  private isKnownError(log: any): boolean {
    // 알려진 에러 패턴들 (무시할 수 있는 에러들)
    const knownErrorPatterns = [
      'ChunkLoadError', // Webpack chunk 로딩 에러
      'Loading chunk', // 동적 import 에러
      'Network request failed', // 네트워크 에러
      'ResizeObserver loop limit exceeded' // 브라우저 ResizeObserver 버그
    ]

    return knownErrorPatterns.some(pattern => 
      log.message.includes(pattern) || 
      log.error?.message?.includes(pattern)
    )
  }

  private async notifyCriticalError(log: any): Promise<void> {
    // 실제 환경에서는 알림 서비스 연동
    console.error('🚨 CRITICAL ERROR DETECTED:', {
      message: log.message,
      error: log.error,
      userId: log.userId,
      url: log.url,
      timestamp: log.timestamp
    })

    // 예: Slack 웹훅, Discord 알림, 이메일 등
    // await sendSlackNotification(log)
  }

  private getLogEmoji(level: string): string {
    const emojis = {
      error: '🔴',
      warn: '🟡', 
      info: '🔵',
      debug: '⚪'
    }
    return emojis[level as keyof typeof emojis] || '⚪'
  }

  // 로그 조회 기능
  async getLogs(filters: {
    level?: string
    userId?: string
    sessionId?: string
    startTime?: string
    endTime?: string
    limit?: number
  } = {}): Promise<any[]> {
    let filteredLogs = [...this.logs]

    // 필터 적용
    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level)
    }

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
    }

    if (filters.sessionId) {
      filteredLogs = filteredLogs.filter(log => log.sessionId === filters.sessionId)
    }

    if (filters.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startTime!)
    }

    if (filters.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endTime!)
    }

    // 최신순 정렬
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // 제한
    const limit = filters.limit || 100
    return filteredLogs.slice(0, limit)
  }

  // 통계 생성
  getStats(): {
    total: number
    byLevel: Record<string, number>
    recentErrors: number
    topErrors: Array<{ message: string; count: number }>
  } {
    const byLevel: Record<string, number> = {}
    const errorMessages: Record<string, number> = {}
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    for (const log of this.logs) {
      // 레벨별 카운트
      byLevel[log.level] = (byLevel[log.level] || 0) + 1

      // 최근 에러 카운트
      if (log.level === 'error' && log.timestamp >= oneHourAgo) {
        const errorKey = log.error?.message || log.message
        errorMessages[errorKey] = (errorMessages[errorKey] || 0) + 1
      }
    }

    // 상위 에러 메시지
    const topErrors = Object.entries(errorMessages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }))

    return {
      total: this.logs.length,
      byLevel,
      recentErrors: Object.values(errorMessages).reduce((sum, count) => sum + count, 0),
      topErrors
    }
  }
}

// ================================
// 3. API 핸들러
// ================================

export async function POST(request: NextRequest) {
  try {
    // 레이트 리미팅
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'

    const rateCheck = rateLimiter.checkLimit(
      `logs_${clientIP}`,
      100, // 1분에 100개 로그
      60000
    )

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many log requests' },
        { status: 429 }
      )
    }

    // 요청 파싱 및 검증
    const body = await request.json()
    const parseResult = logsRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid log format', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { logs } = parseResult.data

    // 로그 저장
    const storage = LogStorage.getInstance()
    await storage.saveLogs(logs)

    return NextResponse.json({ 
      success: true, 
      received: logs.length 
    })

  } catch (error) {
    console.error('❌ Log API error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================
// 4. 로그 조회 API (관리자용)
// ================================

export async function GET(request: NextRequest) {
  try {
    // 간단한 인증 (실제로는 더 강력한 인증 필요)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = {
      level: searchParams.get('level') || undefined,
      userId: searchParams.get('userId') || undefined,
      sessionId: searchParams.get('sessionId') || undefined,
      startTime: searchParams.get('startTime') || undefined,
      endTime: searchParams.get('endTime') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    }

    const storage = LogStorage.getInstance()
    
    // 통계 요청
    if (searchParams.get('stats') === 'true') {
      const stats = storage.getStats()
      return NextResponse.json(stats)
    }

    // 로그 조회
    const logs = await storage.getLogs(filters)
    
    return NextResponse.json({
      logs,
      total: logs.length,
      filters
    })

  } catch (error) {
    console.error('❌ Log query error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================
// 5. 로그 분석 API
// ================================

export async function PUT(request: NextRequest) {
  try {
    // 관리자 인증
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action } = await request.json()

    const storage = LogStorage.getInstance()

    switch (action) {
      case 'analyze_errors':
        return NextResponse.json(await analyzeErrors(storage))
      
      case 'performance_report':
        return NextResponse.json(await generatePerformanceReport(storage))
      
      case 'user_behavior':
        return NextResponse.json(await analyzeUserBehavior(storage))
      
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Log analysis error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ================================
// 6. 분석 함수들
// ================================

async function analyzeErrors(storage: LogStorage): Promise<unknown> {
  const allLogs = await storage.getLogs({ level: 'error', limit: 1000 })
  
  const errorAnalysis = {
    totalErrors: allLogs.length,
    errorsByHour: {} as Record<number, number>,
    topErrorMessages: {} as Record<string, number>,
    errorsByUser: {} as Record<string, number>,
    errorsByPage: {} as Record<string, number>
  }

  for (const log of allLogs) {
    // 시간별 에러
    const hour = new Date(log.timestamp).getHours()
    errorAnalysis.errorsByHour[hour] = (errorAnalysis.errorsByHour[hour] || 0) + 1

    // 에러 메시지별
    const errorMsg = log.error?.message || log.message
    errorAnalysis.topErrorMessages[errorMsg] = (errorAnalysis.topErrorMessages[errorMsg] || 0) + 1

    // 사용자별
    if (log.userId) {
      errorAnalysis.errorsByUser[log.userId] = (errorAnalysis.errorsByUser[log.userId] || 0) + 1
    }

    // 페이지별
    if (log.url) {
      const pathname = new URL(log.url).pathname
      errorAnalysis.errorsByPage[pathname] = (errorAnalysis.errorsByPage[pathname] || 0) + 1
    }
  }

  return errorAnalysis
}

async function generatePerformanceReport(storage: LogStorage): Promise<unknown> {
  const allLogs = await storage.getLogs({ limit: 1000 })
  const performanceLogs = allLogs.filter(log => log.performance)

  const performanceReport = {
    totalMeasurements: performanceLogs.length,
    averageLoadTime: 0,
    slowOperations: [] as Array<{operation: any, duration: any, timestamp: any, url: any}>,
    memoryUsage: [] as Array<{timestamp: any, memory: any}>,
    performanceByPage: {} as Record<string, {count: number, totalDuration: number, averageDuration: number}>
  }

  let totalDuration = 0
  for (const log of performanceLogs) {
    totalDuration += log.performance.duration

    // 느린 작업들 (1초 이상)
    if (log.performance.duration > 1000) {
      performanceReport.slowOperations.push({
        operation: log.message,
        duration: log.performance.duration,
        timestamp: log.timestamp,
        url: log.url
      })
    }

    // 메모리 사용량
    if (log.performance.memory) {
      performanceReport.memoryUsage.push({
        timestamp: log.timestamp,
        memory: log.performance.memory
      })
    }

    // 페이지별 성능
    if (log.url) {
      const pathname = new URL(log.url).pathname
      if (!performanceReport.performanceByPage[pathname]) {
        performanceReport.performanceByPage[pathname] = {
          count: 0,
          totalDuration: 0,
          averageDuration: 0
        }
      }
      
      performanceReport.performanceByPage[pathname].count++
      performanceReport.performanceByPage[pathname].totalDuration += log.performance.duration
      performanceReport.performanceByPage[pathname].averageDuration = 
        performanceReport.performanceByPage[pathname].totalDuration / 
        performanceReport.performanceByPage[pathname].count
    }
  }

  performanceReport.averageLoadTime = totalDuration / performanceLogs.length

  return performanceReport
}

async function analyzeUserBehavior(storage: LogStorage): Promise<unknown> {
  const allLogs = await storage.getLogs({ limit: 1000 })
  const actionLogs = allLogs.filter(log => log.userAction)

  const behaviorAnalysis = {
    totalActions: actionLogs.length,
    actionsByType: {} as Record<string, number>,
    userJourneys: {} as Record<string, Array<{action: any, target: any, timestamp: any, url: any}>>,
    popularPages: {} as Record<string, number>,
    actionsByHour: {} as Record<number, number>
  }

  for (const log of actionLogs) {
    // 액션 타입별
    const actionType = log.userAction.type
    behaviorAnalysis.actionsByType[actionType] = (behaviorAnalysis.actionsByType[actionType] || 0) + 1

    // 시간별 액션
    const hour = new Date(log.timestamp).getHours()
    behaviorAnalysis.actionsByHour[hour] = (behaviorAnalysis.actionsByHour[hour] || 0) + 1

    // 인기 페이지
    if (log.url) {
      const pathname = new URL(log.url).pathname
      behaviorAnalysis.popularPages[pathname] = (behaviorAnalysis.popularPages[pathname] || 0) + 1
    }

    // 사용자 여정 분석
    if (log.sessionId) {
      if (!behaviorAnalysis.userJourneys[log.sessionId]) {
        behaviorAnalysis.userJourneys[log.sessionId] = []
      }
      behaviorAnalysis.userJourneys[log.sessionId].push({
        action: actionType,
        target: log.userAction.target,
        timestamp: log.timestamp,
        url: log.url
      })
    }
  }

  return behaviorAnalysis
}