/**
 * 🚀 알림 시스템 서비스
 * 
 * 폴링 기반 알림 처리 (비용 효율적)
 * 댓글, 좋아요, 팔로우 등의 이벤트에 대한 알림 관리
 */

import { createSupabaseBrowserClient } from '@/lib/supabase-client'

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
  
  // 참고레시피 알림 (참고레시피 작성자들에게)
  notifyRecipeCited(newItemId: string, citedRecipeIds: string[], actorUserId: string, isPublic: boolean): Promise<void>
}

/**
 * 🚀 알림 서비스 구현 (추후 개발 예정)
 */
class NotificationService implements INotificationService {
  
  async notifyComment(itemId: string, actorUserId: string, _commentId: string): Promise<void> {
    try {
      const supabase = createSupabaseBrowserClient()
      
      // 1. 게시글 작성자 조회
      const { data: item } = await supabase
        .from('items')
        .select('user_id')
        .eq('id', itemId)
        .single()
      
      if (!item || item.user_id === actorUserId) return // 자신의 게시글이면 알림 안보냄
      
      // 2. 알림 데이터 생성
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: item.user_id,
          type: 'comment',
          item_id: itemId,
          from_user_id: actorUserId,
          is_read: false
        })
      
      if (error) {
        console.error('❌ 댓글 알림 생성 실패:', error)
      } else {
        // 🔔 하이브리드 전략: 기존 DB 알림 + 선택적 푸시
        // 사용자가 푸시 알림을 활성화한 경우에만 푸시 발송
        await this.sendPushIfEnabled(item.user_id, {
          title: '새 댓글이 달렸습니다',
          type: 'comment',
          itemId
        })
      }
    } catch (error) {
      console.error('❌ 댓글 알림 처리 중 오류:', error)
    }
  }

  private async sendPushIfEnabled(userId: string, notification: any): Promise<void> {
    try {
      const supabase = createSupabaseBrowserClient()
      
      // 🎯 서버 부담 최소화: 사용자 푸시 설정 체크
      const { data: pushSettings } = await supabase
        .from('user_push_settings')
        .select('enabled, subscription_data')
        .eq('user_id', userId)
        .eq('enabled', true)
        .single()

      if (pushSettings?.subscription_data) {
        console.log('📱 푸시 알림 발송 시도:', { userId, notificationType: notification.type });
        
        // 🆓 무료 푸시 알림 API 호출 (Netlify Functions)
        const response = await fetch('/.netlify/functions/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: pushSettings.subscription_data,
            notification: {
              title: notification.title,
              body: `새로운 ${notification.type === 'comment' ? '댓글' : 
                             notification.type === 'like' ? '좋아요' : 
                             notification.type === 'follow' ? '팔로우' : '활동'}이 있습니다`,
              type: notification.type,
              url: `/posts/${notification.itemId}`, // 알림 클릭 시 이동할 URL
              itemId: notification.itemId
            }
          })
        });

        if (response.ok) {
          console.log('✅ 푸시 알림 발송 성공');
        } else {
          const errorData = await response.text();
          console.error('❌ 푸시 발송 실패:', response.status, errorData);
        }
      } else {
        console.log('ℹ️ 푸시 설정 없음 또는 비활성화:', userId);
      }
    } catch (error) {
      console.warn('푸시 설정 조회 실패 (무시):', error)
    }
  }

  async notifyReply(itemId: string, parentCommentId: string, actorUserId: string, _replyId: string): Promise<void> {
    try {
      const supabase = createSupabaseBrowserClient()
      
      // 1. 게시글 작성자 조회
      const { data: item } = await supabase
        .from('items')
        .select('user_id')
        .eq('id', itemId)
        .single()
      
      // 2. 원댓글 작성자 조회
      const { data: parentComment } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', parentCommentId)
        .single()
      
      if (!item || !parentComment) return
      
      // 3. 알림 받을 사용자 목록 (중복 제거 + 본인 제외)
      const notifyUserIds = new Set<string>()
      
      // 게시글 작성자에게 알림 (본인이 아닌 경우)
      if (item.user_id !== actorUserId) {
        notifyUserIds.add(item.user_id)
      }
      
      // 원댓글 작성자에게 알림 (본인이 아닌 경우)
      if (parentComment.user_id !== actorUserId) {
        notifyUserIds.add(parentComment.user_id)
      }
      
      // 4. 각 사용자에게 알림 발송
      for (const userId of notifyUserIds) {
        // 중복 알림 방지 체크
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'comment')
          .eq('item_id', itemId)
          .eq('from_user_id', actorUserId)
          .gte('created_at', new Date(Date.now() - 60000).toISOString()) // 1분 이내 중복 방지
          .limit(1)
        
        if (existing && existing.length > 0) continue
        
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'comment',
            item_id: itemId,
            from_user_id: actorUserId,
            is_read: false
          })
        
        if (error) {
          console.error(`❌ 대댓글 알림 생성 실패 (${userId}):`, error)
        } else {
    
        }
      }
      
    } catch (error) {
      console.error('❌ 대댓글 알림 처리 중 오류:', error)
    }
  }

  async notifyLike(itemId: string, actorUserId: string): Promise<void> {
    try {
      const supabase = createSupabaseBrowserClient()
      
      // 1. 게시글 작성자 조회
      const { data: item } = await supabase
        .from('items')
        .select('user_id')
        .eq('id', itemId)
        .single()
      
      if (!item || item.user_id === actorUserId) return // 자신의 게시글이면 알림 안보냄
      
      // 2. 중복 알림 방지 (같은 사용자가 같은 게시글에 좋아요 알림이 이미 있는지 확인)
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', item.user_id)
        .eq('type', 'like')
        .eq('item_id', itemId)
        .eq('from_user_id', actorUserId)
        .limit(1)
      
      if (existing && existing.length > 0) return // 이미 알림이 있으면 중단
      
      // 3. 알림 데이터 생성
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: item.user_id,
          type: 'like',
          item_id: itemId,
          from_user_id: actorUserId,
          is_read: false
        })
      
      if (error) {
        console.error('❌ 좋아요 알림 생성 실패:', error)
      } else {
    
      }
    } catch (error) {
      console.error('❌ 좋아요 알림 처리 중 오류:', error)
    }
  }

  async notifyFollow(targetUserId: string, actorUserId: string): Promise<void> {
    try {
      const supabase = createSupabaseBrowserClient()
      
      if (targetUserId === actorUserId) return // 자기 자신을 팔로우하는 경우 제외
      
      // 1. 중복 알림 방지
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('type', 'follow')
        .eq('from_user_id', actorUserId)
        .limit(1)
      
      if (existing && existing.length > 0) return // 이미 알림이 있으면 중단
      
      // 2. 팔로우 알림 생성
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: 'follow',
          item_id: null, // 팔로우는 특정 게시글과 연결되지 않음
          from_user_id: actorUserId,
          is_read: false
        })
      
      if (error) {
        console.error('❌ 팔로우 알림 생성 실패:', error)
      } else {
    
      }
    } catch (error) {
      console.error('❌ 팔로우 알림 처리 중 오류:', error)
    }
  }

  async notifyRecipeCited(newItemId: string, citedRecipeIds: string[], actorUserId: string, isPublic: boolean): Promise<void> {
    try {
      const supabase = createSupabaseBrowserClient()
      
      // 🔒 비공개 게시물인 경우 알림 발송 안함
      if (!isPublic) {
  
        return
      }
      
      if (!citedRecipeIds || citedRecipeIds.length === 0) return
      
      // 1. 참고레시피들의 작성자 조회
      const { data: citedRecipes } = await supabase
        .from('items')
        .select('id, user_id')
        .in('id', citedRecipeIds)
        .eq('item_type', 'recipe')
      
      if (!citedRecipes || citedRecipes.length === 0) return
      
      // 2. 알림 받을 사용자 목록 (중복 제거 + 본인 제외)
      const notifyUserIds = new Set<string>()
      
      citedRecipes.forEach(recipe => {
        if (recipe.user_id !== actorUserId) { // 본인이 작성한 레시피는 제외
          notifyUserIds.add(recipe.user_id)
        }
      })
      
      if (notifyUserIds.size === 0) return
      
      // 3. 각 사용자에게 알림 발송
      for (const userId of notifyUserIds) {
        // 🎯 개선된 중복 방지: 해당 게시물에 대해 이미 recipe_cited 알림을 보낸 적이 있는지 확인
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'recipe_cited')
          .eq('item_id', newItemId)
          .eq('from_user_id', actorUserId)
          .limit(1)
        
        if (existing && existing.length > 0) {
  
          continue
        }
        
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'recipe_cited',
            item_id: newItemId, // 새로 작성된 게시물 ID
            from_user_id: actorUserId,
            is_read: false
          })
        
        if (error) {
          console.error(`❌ 참고레시피 알림 생성 실패 (${userId}):`, error)
        } else {
  
        }
      }
      
    } catch (error) {
      console.error('❌ 참고레시피 알림 처리 중 오류:', error)
    }
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