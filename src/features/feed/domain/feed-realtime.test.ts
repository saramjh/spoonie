import { describe, expect, it } from "vitest"
import { shouldSignalNewFeedItem } from "./feed-realtime"

describe("shouldSignalNewFeedItem", () => {
	it("signals a new public insert", () => {
		expect(shouldSignalNewFeedItem("INSERT", { is_public: true, created_at: "2026-10-05T00:00:00Z" }, "2026-10-04T23:00:00Z")).toBe(true)
	})

	it("ignores private rows", () => {
		expect(shouldSignalNewFeedItem("INSERT", { is_public: false, created_at: "2026-10-05T00:00:00Z" }, null)).toBe(false)
	})

	it("signals a public update only when it becomes newer than the current feed head", () => {
		expect(shouldSignalNewFeedItem("UPDATE", { is_public: true, created_at: "2026-10-05T00:00:00Z" }, "2026-10-04T23:59:00Z")).toBe(true)
		expect(shouldSignalNewFeedItem("UPDATE", { is_public: true, created_at: "2026-10-04T22:00:00Z" }, "2026-10-04T23:59:00Z")).toBe(false)
	})
})
