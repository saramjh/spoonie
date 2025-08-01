/**
 * 🏠 홈화면 피드 새로고침 이벤트 시스템
 * 업계 표준 방식: 간단하고 안정적인 Cache Invalidation
 */

export interface HomeFeedRefreshEvent {
  reason: 'comment_added' | 'comment_deleted' | 'like_toggled' | 'post_updated'
  itemId: string
  delta?: number
}

/**
 * 홈화면 새로고침 요청
 */
export const requestHomeFeedRefresh = (event: HomeFeedRefreshEvent) => {

  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('home:refresh', { 
      detail: event 
    }))
  }
} 