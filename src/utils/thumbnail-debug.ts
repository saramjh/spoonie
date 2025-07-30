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
    console.log(`📝 Item: ${data.itemId} (${data.title || 'No title'})`)
    console.log(`🎯 Thumbnail Index: ${data.thumbnailIndex}`)
    console.log(`📦 Images (${data.imageUrls.length}):`, 
      data.imageUrls.map((url, i) => `${i}: ${url.split('/').pop()}`).join(', ')
    )
    console.log(`⏰ Time: ${new Date().toLocaleTimeString()}`)
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
      console.log('❌ No logs found for this item')
      console.groupEnd()
      return
    }
    
    itemLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.action} (${log.location}) - Index: ${log.thumbnailIndex}`)
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
    console.log('🧹 Thumbnail debug logs cleared')
  }
}

// 전역에서 사용할 수 있도록 window 객체에 추가 (개발 모드에서만)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  ;(window as any).thumbnailDebugger = ThumbnailDebugger as any
  
  // 🎯 브라우저 콘솔에서 쉽게 사용할 수 있는 헬퍼 함수들
  (window as any).analyzeThumbnail = (itemId: string) => {
    console.clear()
    console.log('🔍 썸네일 디버깅 분석 시작...')
    ThumbnailDebugger.analyzeFlow(itemId)
  }
  
  (window as any).showRecentThumbnailLogs = () => {
    console.clear()
    console.log('📋 최근 썸네일 로그:')
    ThumbnailDebugger.getRecentLogs().forEach((log, i) => {
      console.log(`${i + 1}. [${log.timestamp.split('T')[1].split('.')[0]}] ${log.action} - ${log.itemId} (idx: ${log.thumbnailIndex})`)
    })
  }
  
  (window as any).clearThumbnailLogs = () => {
    ThumbnailDebugger.clear()
  }
  
  console.log('🎯 썸네일 디버깅 도구가 준비되었습니다!')
  console.log('사용법:')
  console.log('  - analyzeThumbnail("item_id") : 특정 아이템의 썸네일 흐름 분석')
  console.log('  - showRecentThumbnailLogs() : 최근 모든 썸네일 로그 보기')
  console.log('  - clearThumbnailLogs() : 로그 초기화')
} 