import { normalizeTags, normalizeTopicTag } from "@/shared/lib/topics"

export interface RecipeedSearchSignals {
	title?: string | null
	content?: string | null
	tags?: string[] | null
	image_urls?: string[] | null
	cited_recipe_ids?: string[] | null
}

export interface TopicSearchSignals {
	tag: string
	searchAssetCount: number
	distinctAuthorCount: number
}

const LOW_INFORMATION_TOPIC_TAGS = new Set([
	"오늘",
	"일상",
	"기록",
	"맛있다",
	"맛있음",
	"존맛",
	"아침",
	"점심",
	"저녁",
])

function plainText(value: string | null | undefined): string {
	return (value || "")
		.replace(/<[^>]*>/g, " ")
		.replace(/https?:\/\/\S+/gi, " ")
		.replace(/\s+/g, " ")
		.trim()
}

function plainTextLength(value: string | null | undefined): number {
	return plainText(value).length
}

function looksLowInformation(value: string | null | undefined): boolean {
	const text = plainText(value)
	if (!text) return true
	const meaningful = text.toLocaleLowerCase("ko-KR").replace(/[^0-9a-z가-힣]/gi, "")
	if (meaningful.length >= 20 && new Set(meaningful).size < 8) return true
	const tokens = text.toLocaleLowerCase("ko-KR").split(/\s+/).filter((token) => token.length >= 2)
	if (tokens.length >= 6) {
		const counts = new Map<string, number>()
		for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1)
		const maxFrequency = Math.max(...counts.values())
		if (maxFrequency / tokens.length >= 0.6) return true
	}
	return false
}

function hasLinkSpamPattern(value: string | null | undefined): boolean {
	const raw = value || ""
	const links = raw.match(/https?:\/\/\S+/gi)?.length ?? 0
	return links >= 3 && plainTextLength(raw) < 120
}

/**
 * 공개 레시피드를 검색 랜딩으로 보낼지 정하는 자동 정책.
 * 인기(좋아요·팔로워)는 쓰지 않는다. 글 자체의 정보량과 주제 신호만 사용한다.
 */
export function isSearchIndexableRecipeed(item: RecipeedSearchSignals): boolean {
	const titleLength = plainTextLength(item.title)
	const contentLength = plainTextLength(item.content)
	const tagCount = normalizeTags(item.tags).length
	const imageCount = item.image_urls?.filter(Boolean).length ?? 0
	const citedCount = item.cited_recipe_ids?.filter(Boolean).length ?? 0

	if (hasLinkSpamPattern(item.content)) return false
	if (contentLength >= 20 && looksLowInformation(item.content)) return false

	const hasClearSubject = titleLength >= 2 || tagCount >= 1 || contentLength >= 120
	if (!hasClearSubject) return false

	// 독립적인 장문 경험은 레시피 인용 없이도 검색 자산이다.
	if (contentLength >= 60) return true

	const contextSignals = Number(titleLength >= 2) + Number(tagCount >= 2) + Number(imageCount >= 1) + Number(citedCount >= 1)
	if (contentLength >= 20 && contextSignals >= 2) return true

	// 사진 중심 기록은 제목·주제·복수 사진이 함께 있을 때만 짧은 본문을 허용한다.
	if (contentLength >= 8 && titleLength >= 2 && tagCount >= 2 && imageCount >= 2) return true

	return false
}

export function isUsefulTopicTag(value: string): boolean {
	const tag = normalizeTopicTag(value)
	if (tag.length < 2 || tag.length > 40) return false
	if (LOW_INFORMATION_TOPIC_TAGS.has(tag.toLocaleLowerCase("ko-KR"))) return false
	if (/^https?:/i.test(tag) || /^www\./i.test(tag)) return false
	if (!/[0-9a-z가-힣]/i.test(tag)) return false
	return true
}

/**
 * topic은 콘텐츠 2개만으로 자동 색인하지 않는다.
 * 최소 2개 검색 자산 + 서로 다른 작성자 2명, 또는 한 작성자가 충분히 축적한 4개 이상의 자산이 필요하다.
 */
export function isSearchIndexableTopic(signals: TopicSearchSignals): boolean {
	if (!isUsefulTopicTag(signals.tag)) return false
	if (signals.searchAssetCount < 2) return false
	return signals.distinctAuthorCount >= 2 || signals.searchAssetCount >= 4
}

export function hasSearchIndexableProfileContent(publicRecipeCount: number, searchableRecipeedCount: number): boolean {
	return publicRecipeCount > 0 || searchableRecipeedCount > 0
}
