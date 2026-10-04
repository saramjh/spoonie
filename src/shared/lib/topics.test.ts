import { describe, expect, it } from "vitest"
import { normalizeTags, normalizeTopicTag, topicHref } from "./topics"

describe("topics", () => {
	it("#와 공백을 정리하고 중복 태그를 제거한다", () => {
		expect(normalizeTags([" #카레 ", "카레", " 집밥  요리 "])).toEqual(["카레", "집밥 요리"])
	})
	it("한글 주제 URL을 안전하게 만든다", () => {
		expect(normalizeTopicTag("##여름 과일")).toBe("여름 과일")
		expect(topicHref("여름 과일")).toBe(`/topics/${encodeURIComponent("여름 과일")}`)
	})
})
