import { describe, expect, it } from "vitest"
import {
	hasSearchIndexableProfileContent,
	isNormalPublicRecipeed,
	isSearchIndexableProfile,
	isSearchIndexableRecipeed,
	isSearchIndexableTopic,
	isTopicContributingRecipeed,
	isUsefulTopicTag,
	publicContentTitle,
} from "./search-exposure"

describe("Recipeed search eligibility", () => {
	it("정상 공개 사진 기록은 짧아도 검색 후보로 허용한다", () => {
		const item = { title: "해봄", content: "맛있음", cited_recipe_ids: ["r1"], image_urls: ["a.jpg"] }
		expect(isNormalPublicRecipeed(item)).toBe(true)
		expect(isSearchIndexableRecipeed(item)).toBe(true)
		expect(isTopicContributingRecipeed(item)).toBe(false)
	})
	it("레시피와 무관한 긴 요리·식생활 경험도 허용하고 Topic에도 기여할 수 있다", () => {
		const item = {
			title: "정수기 가짜 필터를 구별하며 확인한 점",
			content: "직접 주문한 필터를 비교해 보니 포장과 재질에서 차이가 있었다. 사용 전에 확인하면 좋은 부분과 실제로 물맛이 어떻게 달랐는지 기록한다.",
			tags: ["정수기", "주방", "필터"], image_urls: ["a.jpg"],
		}
		expect(isSearchIndexableRecipeed(item)).toBe(true)
		expect(isTopicContributingRecipeed(item)).toBe(true)
	})
	it("사진 한 장뿐인 정상 원본도 글자 수 때문에 배제하지 않는다", () => {
		expect(isSearchIndexableRecipeed({ title: "맛있는 상추!", content: "오늘 밭에서 딴 상추", image_urls: ["a.jpg"] })).toBe(true)
	})
	it("빈 글·테스트 placeholder는 제외한다", () => {
		expect(isSearchIndexableRecipeed({})).toBe(false)
		expect(isSearchIndexableRecipeed({ title: "테스트", content: "ㅋㅋ" })).toBe(false)
	})
	it("반복 문구를 길게 늘인 글은 제외한다", () => {
		expect(isSearchIndexableRecipeed({ title: "후기", content: "맛있어요 ".repeat(20), tags: ["후기"], image_urls: ["a.jpg"] })).toBe(false)
	})
	it("링크만 여러 개 붙인 짧은 글은 제외한다", () => {
		expect(isSearchIndexableRecipeed({ title: "추천", content: "https://a.test https://b.test https://c.test 좋아요", tags: ["추천"] })).toBe(false)
	})
	it("제목이 없으면 실제 본문이나 태그로 정직한 제목을 만든다", () => {
		expect(publicContentTitle({ content: "냉동 대파를 볶아 본 기록입니다" })).toBe("냉동 대파를 볶아 본 기록입니다")
		expect(publicContentTitle({ image_urls: ["a.jpg"], tags: ["개복숭아"] })).toBe("개복숭아 레시피드")
	})
})

describe("topic exposure", () => {
	it("의미가 약한 자유 태그는 자산이 많아도 색인하지 않는다", () => {
		expect(isUsefulTopicTag("오늘")).toBe(false)
		expect(isSearchIndexableTopic({ tag: "오늘", searchAssetCount: 10, distinctAuthorCount: 5 })).toBe(false)
	})
	it("서로 다른 작성자의 기여 자산이 둘 이상이면 구체 주제를 색인한다", () => {
		expect(isSearchIndexableTopic({ tag: "개복숭아", searchAssetCount: 2, distinctAuthorCount: 2 })).toBe(true)
	})
	it("한 작성자의 얇은 태그 묶음은 2개만으로 색인하지 않는다", () => {
		expect(isSearchIndexableTopic({ tag: "개복숭아", searchAssetCount: 2, distinctAuthorCount: 1 })).toBe(false)
		expect(isSearchIndexableTopic({ tag: "개복숭아", searchAssetCount: 4, distinctAuthorCount: 1 })).toBe(true)
	})
})

describe("profile exposure", () => {
	it("공개 식별자와 이름, 실제 공개 활동을 독립적으로 요구한다", () => {
		const profile = { public_id: "cook1", username: "cook" }
		expect(isSearchIndexableProfile(profile, 0, 0)).toBe(false)
		expect(isSearchIndexableProfile(profile, 0, 1)).toBe(true)
		expect(isSearchIndexableProfile({ public_id: null, username: "cook" }, 1, 0)).toBe(false)
	})
	it("기존 콘텐츠 존재 helper도 유지한다", () => {
		expect(hasSearchIndexableProfileContent(0, 0)).toBe(false)
		expect(hasSearchIndexableProfileContent(1, 0)).toBe(true)
	})
})
