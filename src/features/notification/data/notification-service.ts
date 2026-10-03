/**
 * 알림 생성 (브라우저 측)
 *
 * 좋아요, 댓글/답글, 팔로우 알림은 DB 트리거가 서버에서 만든다 (supabase/notifications_triggers.sql).
 * 푸시 발송도 알림이 저장되면 서버가 처리한다 (supabase/push_dispatch.sql, netlify/functions/push-dispatch.js).
 * 레시피 인용 알림만 작성 화면이 알고 있는 정보(인용한 레시피 목록, 공개 여부)가 필요해 여기서 만든다.
 * DB 정책상 본인 명의의 recipe_cited 알림만 만들 수 있다.
 */

import { createSupabaseBrowserClient } from '@/shared/infra/supabase-client'

class NotificationService {
  async notifyRecipeCited(newItemId: string, citedRecipeIds: string[], actorUserId: string, isPublic: boolean): Promise<void> {
    try {
      // 비공개 게시물은 알리지 않는다
      if (!isPublic || !citedRecipeIds || citedRecipeIds.length === 0) return

      const supabase = createSupabaseBrowserClient()

      // 인용한 레시피들의 작성자 (본인 제외, 중복 제거)
      const { data: citedRecipes } = await supabase
        .from('items')
        .select('id, user_id')
        .in('id', citedRecipeIds)
        .eq('item_type', 'recipe')

      const recipientIds = new Set(
        (citedRecipes ?? []).map((recipe) => recipe.user_id).filter((userId) => userId !== actorUserId)
      )
      if (recipientIds.size === 0) return

      const { error } = await supabase.from('notifications').insert(
        Array.from(recipientIds).map((userId) => ({
          user_id: userId,
          type: 'recipe_cited',
          item_id: newItemId,
          from_user_id: actorUserId,
          is_read: false,
        }))
      )

      if (error) {
        console.error('❌ 참고레시피 알림 생성 실패:', error)
      }
    } catch (error) {
      console.error('❌ 참고레시피 알림 처리 중 오류:', error)
    }
  }
}

export const notificationService = new NotificationService()
