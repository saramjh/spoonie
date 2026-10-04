export type FeedRealtimeEvent = "INSERT" | "UPDATE"

interface FeedRealtimeRow {
	is_public?: unknown
	created_at?: unknown
}

export function shouldSignalNewFeedItem(event: FeedRealtimeEvent, row: FeedRealtimeRow, newestKnownCreatedAt: string | null) {
	if (row.is_public !== true) return false
	if (event === "INSERT") return true
	if (typeof row.created_at !== "string") return false
	if (!newestKnownCreatedAt) return true

	const changedCreatedAt = Date.parse(row.created_at)
	const newestKnown = Date.parse(newestKnownCreatedAt)
	if (!Number.isFinite(changedCreatedAt) || !Number.isFinite(newestKnown)) return false

	return changedCreatedAt > newestKnown
}
