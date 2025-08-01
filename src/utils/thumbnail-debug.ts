/**
 * 🔍 썸네일 디버깅 유틸리티
 * 썸네일 변경 흐름을 체계적으로 추적하고 분석
 */

interface ThumbnailDebugData {
  itemId: string
  title?: string
  thumbnailIndex: number | null
  imageUrls: string[]
  timestamp: string
  location: string
  action: string
}

export class ThumbnailDebugger {
  private static logs: ThumbnailDebugData[] = []
  
  static log(data: {
    itemId: string
    title?: string
    thumbnailIndex: number | null
    imageUrls: string[]
    location: string
    action: string
  }) {
    const logEntry: ThumbnailDebugData = {
      ...data,
      timestamp: new Date().toISOString()
    }
    
    this.logs.push(logEntry)
    
    // 콘솔에 깔끔하게 출력
    console.group(`🔍 THUMBNAIL DEBUG: ${data.action} at ${data.location}`)
  
  
    // Thumbnail debug completed
    console.groupEnd()
    
    // 최근 10개만 유지
    if (this.logs.length > 10) {
      this.logs = this.logs.slice(-10)
    }
  }
  
  static getRecentLogs(itemId?: string): ThumbnailDebugData[] {
    if (itemId) {
      return this.logs.filter(log => log.itemId === itemId)
    }
    return this.logs
  }
  
  static analyzeFlow(itemId: string) {
    const itemLogs = this.getRecentLogs(itemId)
    
    console.group(`📊 THUMBNAIL FLOW ANALYSIS for ${itemId}`)
    
    if (itemLogs.length === 0) {
  
      console.groupEnd()
      return
    }
    
    itemLogs.forEach((log, index) => {
  
    })
    
    // 인덱스 변화 감지
    const indexChanges = itemLogs.filter((log, i) => 
      i > 0 && log.thumbnailIndex !== itemLogs[i-1].thumbnailIndex
    )
    
    if (indexChanges.length > 0) {
      console.warn('🚨 Thumbnail index changes detected:', indexChanges)
    }
    
    console.groupEnd()
  }
  
  static clear() {
    this.logs = []
  
  }
}

// 전역에서 사용할 수 있도록 window 객체에 추가 (개발 모드에서만)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).thumbnailDebugger = ThumbnailDebugger as any
  
  // 🎯 브라우저 콘솔에서 쉽게 사용할 수 있는 헬퍼 함수들
  (window as any).analyzeThumbnail = (itemId: string) => {
    console.clear()
  
    ThumbnailDebugger.analyzeFlow(itemId)
  }
  
  (window as any).showRecentThumbnailLogs = () => {
    console.clear()
  
    ThumbnailDebugger.getRecentLogs().forEach((log, i) => {

    })
  }
  
  (window as any).clearThumbnailLogs = () => {
    ThumbnailDebugger.clear()
  }
  
  
} 