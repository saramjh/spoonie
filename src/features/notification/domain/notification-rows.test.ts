import { describe, expect, it } from "vitest"
import { toNotifications } from "./notification-rows"

describe("toNotifications", () => {
	it("관계 배열은 첫 번째, 빈 배열·없음은 null", () => {
		const p = { public_id: "p", username: "u", avatar_url: "a" }
		expect(
			toNotifications([
				{ id: "1", created_at: "c", type: "like", is_read: false, item_id: "i", from_profile: [p], related_item: [] },
				{ id: "2", created_at: "c", type: "follow", is_read: true, item_id: null, from_profile: p, related_item: null },
			])
		).toEqual([
			{ id: "1", created_at: "c", type: "like", is_read: false, item_id: "i", from_profile: p, related_item: null },
			{ id: "2", created_at: "c", type: "follow", is_read: true, item_id: null, from_profile: p, related_item: null },
		])
	})
})
