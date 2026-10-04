export function normalizeTopicTag(value: string): string {
	return value.trim().replace(/^#+/, "").replace(/\s+/g, " ")
}

export function normalizeTags(values: readonly string[] | null | undefined): string[] {
	const seen = new Set<string>()
	const result: string[] = []
	for (const value of values ?? []) {
		const normalized = normalizeTopicTag(value)
		if (!normalized) continue
		const key = normalized.toLocaleLowerCase("ko-KR")
		if (seen.has(key)) continue
		seen.add(key)
		result.push(normalized)
	}
	return result
}

export function topicHref(tag: string): string {
	return `/topics/${encodeURIComponent(normalizeTopicTag(tag))}`
}
