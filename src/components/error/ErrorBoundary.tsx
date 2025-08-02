/**
 * 🛡️ React Error Boundary
 * 예상치 못한 에러로부터 앱 전체 크래시 방지
 */

"use client"

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { logger, logErrorBoundary, type ErrorBoundaryState } from '@/lib/monitoring'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: any) => void
  level?: 'page' | 'component' | 'global'
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // 로깅 시스템에 에러 전송
    logErrorBoundary(error, errorInfo)
    
    // 추가 정보 로깅
    logger.error('Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundaryLevel: this.props.level || 'component',
      retryCount: this.retryCount,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    })

    // 부모 컴포넌트에 에러 알림
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({
      hasError: true,
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    this.retryCount++
    
    logger.info('Error Boundary retry attempt', {
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    })

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined
    })
  }

  handleReload = () => {
    logger.info('Error Boundary triggered page reload')
    window.location.reload()
  }

  handleGoHome = () => {
    logger.info('Error Boundary navigation to home')
    window.location.href = '/'
  }

  handleReportError = () => {
    const { error, errorInfo } = this.state
    
    logger.info('User reported error via Error Boundary')
    
    // 에러 리포트 생성
    const errorReport = {
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      },
      errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAction: 'manual_report'
    }

    // 클립보드에 복사
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('에러 정보가 클립보드에 복사되었습니다. 개발팀에 전달해주세요.')
      })
      .catch(() => {
        console.log('Error Report:', errorReport)
        alert('에러 정보를 콘솔에서 확인할 수 있습니다.')
      })
  }

  renderError() {
    const { error } = this.state
    const { level = 'component' } = this.props
    
    // 에러 타입별 메시지
    const getErrorMessage = () => {
      if (error?.message.includes('ChunkLoadError')) {
        return '앱 업데이트로 인한 일시적 오류입니다. 페이지를 새로고침해주세요.'
      }
      
      if (error?.message.includes('Network')) {
        return '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.'
      }
      
      if (level === 'global') {
        return '앱에서 예상치 못한 오류가 발생했습니다.'
      }
      
      return '이 부분에서 오류가 발생했습니다.'
    }

    // 에러 레벨별 UI 스타일
    const getErrorStyle = () => {
      switch (level) {
        case 'global':
          return {
            container: 'min-h-screen bg-gray-50 flex items-center justify-center p-4',
            card: 'w-full max-w-md',
            icon: 'h-16 w-16 text-red-500 mx-auto mb-4'
          }
        case 'page':
          return {
            container: 'min-h-[400px] flex items-center justify-center p-4',
            card: 'w-full max-w-lg',
            icon: 'h-12 w-12 text-red-500 mx-auto mb-4'
          }
        default:
          return {
            container: 'flex items-center justify-center p-6',
            card: 'w-full max-w-sm',
            icon: 'h-8 w-8 text-red-500 mx-auto mb-2'
          }
      }
    }

    const style = getErrorStyle()
    const canRetry = this.retryCount < this.maxRetries
    const isChunkError = error?.message.includes('ChunkLoadError')

    return (
      <div className={style.container}>
        <Card className={style.card}>
          <CardHeader className="text-center">
            <AlertTriangle className={style.icon} />
            <CardTitle className="text-lg text-gray-900">
              {isChunkError ? '앱 업데이트 감지' : '오류 발생'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600 text-sm">
              {getErrorMessage()}
            </p>
            
            {/* 개발 환경에서만 에러 상세 정보 표시 */}
            {process.env.NODE_ENV === 'development' && (
              <details className="bg-gray-100 p-3 rounded text-xs">
                <summary className="cursor-pointer font-semibold mb-2">
                  에러 상세 정보
                </summary>
                <pre className="whitespace-pre-wrap break-all">
                  {error?.stack || error?.message}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-2">
              {/* Chunk Error는 새로고침 우선 */}
              {isChunkError ? (
                <>
                  <Button onClick={this.handleReload} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    페이지 새로고침
                  </Button>
                  <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    홈으로 이동
                  </Button>
                </>
              ) : (
                <>
                  {/* 일반 에러는 재시도 먼저 */}
                  {canRetry && (
                    <Button onClick={this.handleRetry} className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      다시 시도 ({this.maxRetries - this.retryCount}회 남음)
                    </Button>
                  )}
                  
                  {level !== 'component' && (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={this.handleReload} 
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        페이지 새로고침
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={this.handleGoHome} 
                        className="w-full"
                      >
                        <Home className="h-4 w-4 mr-2" />
                        홈으로 이동
                      </Button>
                    </>
                  )}
                </>
              )}

              {/* 에러 신고 버튼 (글로벌 레벨에서만) */}
              {level === 'global' && (
                <Button 
                  variant="ghost" 
                  onClick={this.handleReportError}
                  className="w-full text-xs"
                >
                  <Bug className="h-3 w-3 mr-2" />
                  에러 신고하기
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback이 제공된 경우
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 기본 에러 UI
      return this.renderError()
    }

    return this.props.children
  }
}

// ================================
// 특화된 Error Boundary들
// ================================

/**
 * 글로벌 Error Boundary (앱 전체)
 */
export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="global" onError={(error, errorInfo) => {
      // 글로벌 에러는 특별히 추적
      logger.error('Global Error Boundary triggered', error, {
        critical: true,
        errorInfo
      })
    }}>
      {children}
    </ErrorBoundary>
  )
}

/**
 * 페이지 레벨 Error Boundary
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="page">
      {children}
    </ErrorBoundary>
  )
}

/**
 * 컴포넌트 레벨 Error Boundary
 */
export function ComponentErrorBoundary({ 
  children, 
  name,
  fallback 
}: { 
  children: ReactNode
  name?: string
  fallback?: ReactNode
}) {
  return (
    <ErrorBoundary 
      level="component"
      fallback={fallback}
      onError={(error, errorInfo) => {
        logger.error(`Component Error in ${name || 'Unknown'}`, error, {
          componentName: name,
          errorInfo
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// ================================
// HOC (Higher-Order Component)
// ================================

/**
 * Error Boundary HOC
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode
    level?: 'page' | 'component' | 'global'
    name?: string
  }
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary 
      level={options?.level || 'component'}
      fallback={options?.fallback}
      onError={(error, errorInfo) => {
        logger.error(`HOC Error in ${options?.name || Component.name}`, error, {
          componentName: options?.name || Component.name,
          errorInfo
        })
      }}
    >
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// ================================
// 훅 기반 에러 처리
// ================================

/**
 * 에러 처리 훅
 */
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: Record<string, any>) => {
    logger.error('Hook-based error', error, context)
    
    // Error Boundary로 에러 전파
    throw error
  }, [])

  const safeExecute = React.useCallback(async (
    operation: () => Promise<unknown>,
    fallback?: any
  ): Promise<unknown> => {
    try {
      return await operation()
    } catch (error) {
      handleError(error as Error, { operation: operation.name })
      return fallback
    }
  }, [handleError])

  return {
    handleError,
    safeExecute
  }
}

// ================================
// 에러 상태 관리
// ================================

/**
 * 에러 상태 훅
 */
export function useErrorState() {
  const [error, setError] = React.useState<Error | null>(null)
  const [isRecovering, setIsRecovering] = React.useState(false)

  const clearError = React.useCallback(() => {
    setError(null)
    setIsRecovering(false)
  }, [])

  const handleError = React.useCallback((error: Error) => {
    setError(error)
    logger.error('State-managed error', error)
  }, [])

  const retry = React.useCallback(async (operation: () => Promise<void>) => {
    setIsRecovering(true)
    try {
      await operation()
      clearError()
    } catch (error) {
      handleError(error as Error)
    } finally {
      setIsRecovering(false)
    }
  }, [clearError, handleError])

  return {
    error,
    isRecovering,
    clearError,
    handleError,
    retry
  }
}