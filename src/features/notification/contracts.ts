/**
 * 알림 기능의 계약(타입만). 계층 규칙은 features/recipe/contracts.ts와 같다.
 */

export interface Notification {
	id: string
	created_at: string
	type: "like" | "comment" | "follow" | "recipe_cited" | "admin"
	is_read: boolean
	item_id: string | null
	from_profile: {
		public_id: string
		username: string
		avatar_url: string
	} | null
	related_item: {
		item_type: "recipe" | "post"
		creation_origin?: string | null
	} | null
}

// DB가 돌려주는 줄: 관계는 하나여도 배열로 올 수 있다
export type NotificationRow = Omit<Notification, "from_profile" | "related_item"> & {
	from_profile: Notification["from_profile"] | Notification["from_profile"][]
	related_item: Notification["related_item"] | Notification["related_item"][]
}

export interface PushSubscriptionData {
	endpoint: string
	keys: { p256dh: string; auth: string }
}
