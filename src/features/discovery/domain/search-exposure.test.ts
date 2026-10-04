import { describe, expect, it } from "vitest"
import { hasSearchIndexableProfileContent, isSearchIndexableRecipeed, isSearchIndexableTopic, isUsefulTopicTag } from "./search-exposure"

describe("isSearchIndexableRecipeed", () => {
	it("레시피와 무관한 긴 요리·식생활 경험도 색인한다", () => {
		expect(isSearchIndexableRecipeed({
			title: "정수기 가짜 필터를 구별하며 확인한 점",
			content: "직접 주문한 필터를 비교해 보니 포장과 재질에서 차이가 있었다. 사용 전에 확인하면 좋은 부분과 실제로 물맛이 어떻게 달랐는지 기록한다.",
			tags: ["정수기", "주방", "필터"], image_urls: ["a.jpg"],
		})).toBe(true)
	})
	it("레시피 인용 없이도 사진 중심 주제가 분명한 기록은 색인한다", () => {
		expect(isSearchIndexableRecipeed({ title: "개복숭아 잼", content: "오늘 만든 잼 기록", tags: ["개복숭아", "잼", "여름과일"], image_urls: ["a.jpg", "b.jpg"] })).toBe(true)
	})
	it("레시피를 인용했다는 이유만으로 짧은 반응 글을 색인하지 않는다", () => {
		expect(isSearchIndexableRecipeed({ title: "해봄", content: "맛있음", cited_recipe_ids: ["r1"], image_urls: ["a.jpg"] })).toBe(false)
	})
	it("반복 문구를 길게 늘인 글을 정보 자산으로 오인하지 않는다", () => {
		expect(isSearchIndexableRecipeed({ title: "후기", content: "맛있어요 ".repeat(20), tags: ["후기"], image_urls: ["a.jpg"] })).toBe(false)
	})
	it("링크만 여러 개 붙인 짧은 글을 검색 랜딩으로 보내지 않는다", () => {
		expect(isSearchIndexableRecipeed({ title: "추천", content: "https://a.test https://b.test https://c.test 좋아요", tags: ["추천"] })).toBe(false)
	})
	it("제목이나 태그가 없어도 충분히 구체적인 긴 본문은 색인할 수 있다", () => {
		expect(isSearchIndexableRecipeed({ content: "냉동실에 한 달 정도 보관했던 대파를 국물 요리와 볶음 요리에 각각 써봤다. 국물 요리에서는 향과 식감이 크게 거슬리지 않았지만 볶음에서는 수분이 더 빨리 나오고 조직이 무른 편이었다. 다음에는 볶음용은 더 짧게 보관하려고 한다." })).toBe(true)
	})
})

describe("topic exposure", () => {
	it("의미가 약한 자유 태그는 자산이 많아도 색인하지 않는다", () => {
		expect(isUsefulTopicTag("오늘")).toBe(false)
		expect(isSearchIndexableTopic({ tag: "오늘", searchAssetCount: 10, distinctAuthorCount: 5 })).toBe(false)
	})
	it("서로 다른 작성자의 검색 자산이 둘 이상이면 구체 주제를 색인한다", () => {
		expect(isSearchIndexableTopic({ tag: "개복숭아", searchAssetCount: 2, distinctAuthorCount: 2 })).toBe(true)
	})
	it("한 작성자의 얇은 태그 묶음은 2개만으로 색인하지 않는다", () => {
		expect(isSearchIndexableTopic({ tag: "개복숭아", searchAssetCount: 2, distinctAuthorCount: 1 })).toBe(false)
		expect(isSearchIndexableTopic({ tag: "개복숭아", searchAssetCount: 4, distinctAuthorCount: 1 })).toBe(true)
	})
})

describe("profile exposure", () => {
	it("레시피 또는 검색 가능한 레시피드 중 하나만 있어도 검색 자산이다", () => {
		expect(hasSearchIndexableProfileContent(0, 0)).toBe(false)
		expect(hasSearchIndexableProfileContent(1, 0)).toBe(true)
		expect(hasSearchIndexableProfileContent(0, 1)).toBe(true)
	})
})
