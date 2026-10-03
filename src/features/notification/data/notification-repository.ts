/**
 * 알림 저장소. notifications/page.tsx, hooks/usePushNotification.ts에서 쿼리·오류 처리를 바꾸지 않고 옮겼다.
 * Supabase 클라이언트는 부르는 쪽 것을 받는다 (화면이 쓰던 같은 클라이언트로 동작하게).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { NotificationRow, PushSubscriptionData } from "../contracts"

// 내 알림 개수 (바뀌었을 때만 목록을 다시 받기 위해)
export async function countNotifications(supabase: SupabaseClient, userId: string): Promise<number | null> {
	const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId)
	return count
}

// 최근 50개 (보낸 사람, 관련 글 종류 포함)
export async function fetchNotificationRows(supabase: SupabaseClient, userId: string) {
	const { data, error } = await supabase
		.from("notifications")
		.select(`
        id,
        created_at,
        type,
        is_read,
        item_id,
        from_profile:profiles!notifications_from_user_id_fkey ( public_id, username, avatar_url ),
        related_item:items!notifications_item_id_fkey ( item_type, creation_origin )
      `)
		.eq("user_id", userId)
		.order("created_at", { ascending: false })
		.limit(50)
	return { rows: (data || []) as unknown as NotificationRow[], error }
}

export async function markNotificationRead(supabase: SupabaseClient, id: string) {
	const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id)
	return { error }
}

export async function markAllNotificationsRead(supabase: SupabaseClient, userId: string) {
	const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false)
	return { error }
}

export async function deleteNotifications(supabase: SupabaseClient, ids: string[], userId: string) {
	const { error } = await supabase.from("notifications").delete({ count: "exact" }).in("id", ids).eq("user_id", userId)
	return { error }
}

// 웹 푸시 구독 저장 / 끄기
export async function savePushSubscription(supabase: SupabaseClient, userId: string, subscriptionData: PushSubscriptionData) {
	const { error } = await supabase
		.from("user_push_settings")
		.upsert({ user_id: userId, subscription_data: subscriptionData, enabled: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
	return { error }
}

export async function disablePushSubscription(supabase: SupabaseClient, userId: string) {
	await supabase.from("user_push_settings").update({ enabled: false }).eq("user_id", userId)
}
