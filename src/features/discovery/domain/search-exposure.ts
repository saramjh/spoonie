import { normalizeTags } from "@/shared/lib/topics"

export interface RecipeedSearchSignals {
	title?: string | null
	content?: string | null
	tags?: string[] | null
	image_urls?: string[] | null
	cited_recipe_ids?: string[] | null
}

function plainTextLength(value: string | null | undefined): number {
	return (value || "")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim().length
}

/**
 * 공개 레시피드를 검색 랜딩으로 보낼지 정하는 자동 정책.
 * 인기(좋아요·팔로워)는 쓰지 않는다. 글 자체의 정보량과 주제 신호만 사용해
 * 새 글이 늘어나도 운영자가 게시물마다 index/noindex를 지정할 필요가 없게 한다.
 */
export function isSearchIndexableRecipeed(item: RecipeedSearchSignals): boolean {
	const titleLength = plainTextLength(item.title)
	const contentLength = plainTextLength(item.content)
	const tagCount = normalizeTags(item.tags).length
	const imageCount = item.image_urls?.filter(Boolean).length ?? 0
	const citedCount = item.cited_recipe_ids?.filter(Boolean).length ?? 0

	// 검색자가 무엇에 관한 글인지 식별할 수 있어야 한다. 긴 본문 자체가 주제를 충분히 설명하는 경우는 예외.
	const hasClearSubject = titleLength >= 2 || tagCount >= 1 || contentLength >= 120
	if (!hasClearSubject) return false

	// 긴 경험/정보 글은 독립적으로 검색 가치가 있다. 레시피 인용 여부는 필수 조건이 아니다.
	if (contentLength >= 60) return true

	// 중간 길이 글은 사진·태그·제목·참고 관계 중 두 가지 이상의 맥락 신호가 있을 때 노출한다.
	const contextSignals = Number(titleLength >= 2) + Number(tagCount >= 2) + Number(imageCount >= 1) + Number(citedCount >= 1)
	if (contentLength >= 20 && contextSignals >= 2) return true

	// 사진 중심의 짧은 요리 기록도 제목·주제·복수 사진이 명확하면 검색 랜딩이 될 수 있다.
	if (contentLength >= 8 && titleLength >= 2 && tagCount >= 2 && imageCount >= 2) return true

	return false
}


export const MIN_TOPIC_SEARCH_ASSETS = 2

export function isSearchIndexableTopic(searchAssetCount: number): boolean {
	return searchAssetCount >= MIN_TOPIC_SEARCH_ASSETS
}

export function hasSearchIndexableProfileContent(publicRecipeCount: number, searchableRecipeedCount: number): boolean {
	return publicRecipeCount > 0 || searchableRecipeedCount > 0
}
