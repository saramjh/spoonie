import type { Notification, NotificationRow } from "../contracts"

// 알림 줄을 화면 모양으로 (관계 배열은 첫 번째, 없으면 null). notifications/page.tsx에서 내용 그대로 옮김
export function toNotifications(rows: NotificationRow[]): Notification[] {
	return rows.map((item) => ({
		id: item.id,
		created_at: item.created_at,
		type: item.type,
		is_read: item.is_read,
		item_id: item.item_id,
		from_profile: Array.isArray(item.from_profile) ? item.from_profile[0] || null : item.from_profile,
		related_item: Array.isArray(item.related_item) ? item.related_item[0] || null : item.related_item,
	}))
}
