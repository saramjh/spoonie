/**
 * 🚀 알림 시스템 서비스
 * 
 * SSA 아키텍처 기반으로 실시간 알림 처리
 * 댓글, 좋아요, 팔로우 등의 이벤트에 대한 알림 관리
 */

export interface NotificationTarget {
  userId: string
  type: 'post_author' | 'comment_author' | 'mentioned_user'
}

export interface NotificationData {
  type: 'comment' | 'reply' | 'like' | 'follow'
  itemId: string
  actorUserId: string
  targetUserId: string
  parentCommentId?: string // 대댓글의 경우
  message?: string
}

/**
 * 📢 알림 서비스 인터페이스
 */
export interface INotificationService {
  // 댓글 알림 (게시글 작성자에게)
  notifyComment(itemId: string, actorUserId: string, commentId: string): Promise<void>
  
  // 대댓글 알림 (게시글 작성자 + 원댓글 작성자에게)
  notifyReply(itemId: string, parentCommentId: string, actorUserId: string, replyId: string): Promise<void>
  
  // 좋아요 알림 (게시글 작성자에게)
  notifyLike(itemId: string, actorUserId: string): Promise<void>
  
  // 팔로우 알림 (팔로우 대상자에게)
  notifyFollow(targetUserId: string, actorUserId: string): Promise<void>
}

/**
 * 🚀 알림 서비스 구현 (추후 개발 예정)
 */
class NotificationService implements INotificationService {
  
  async notifyComment(itemId: string, actorUserId: string, commentId: string): Promise<void> {
    // TODO: 구현 예정
    // 1. 게시글 작성자 조회
    // 2. 알림 데이터 생성
    // 3. 실시간 알림 발송 (Supabase Realtime)
    // 4. 알림 히스토리 저장
    console.log(`📢 [준비됨] 댓글 알림: ${itemId} by ${actorUserId}`)
  }

  async notifyReply(itemId: string, parentCommentId: string, actorUserId: string, replyId: string): Promise<void> {
    // TODO: 구현 예정  
    // 1. 게시글 작성자 + 원댓글 작성자 조회
    // 2. 중복 제거 (같은 사람인 경우)
    // 3. 각각에게 알림 발송
    console.log(`📢 [준비됨] 대댓글 알림: ${parentCommentId} by ${actorUserId}`)
  }

  async notifyLike(itemId: string, actorUserId: string): Promise<void> {
    // TODO: 구현 예정
    console.log(`📢 [준비됨] 좋아요 알림: ${itemId} by ${actorUserId}`)
  }

  async notifyFollow(targetUserId: string, actorUserId: string): Promise<void> {
    // TODO: 구현 예정  
    console.log(`📢 [준비됨] 팔로우 알림: ${targetUserId} by ${actorUserId}`)
  }
}

/**
 * 🎯 싱글톤 인스턴스
 */
export const notificationService = new NotificationService()

/**
 * 📋 알림 시스템 구현 계획:
 * 
 * 1. 데이터베이스 스키마
 *    - notifications 테이블 (type, actor_id, target_id, item_id, created_at, is_read)
 *    
 * 2. 실시간 알림 (Supabase Realtime)
 *    - 브라우저 푸시 알림
 *    - 인앱 알림 배지
 *    
 * 3. SSA 통합
 *    - 알림 수 캐시 관리
 *    - 실시간 동기화
 *    
 * 4. UI 컴포넌트
 *    - 알림 벨 아이콘 (헤더)
 *    - 알림 목록 모달
 *    - 읽음/미읽음 상태 관리
 */ 