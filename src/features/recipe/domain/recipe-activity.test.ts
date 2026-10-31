import { describe, expect, it } from "vitest"
import { isWithinNewRecipePhotoPromptWindow } from "./recipe-activity"

describe("isWithinNewRecipePhotoPromptWindow", () => {
	const day = 24 * 60 * 60 * 1000
	const now = Date.UTC(2026, 9, 31, 12)

	it("게시 직후부터 정확히 10일째까지 상단 참여 안내를 표시한다", () => {
		expect(isWithinNewRecipePhotoPromptWindow(new Date(now).toISOString(), now)).toBe(true)
		expect(isWithinNewRecipePhotoPromptWindow(new Date(now - 10 * day).toISOString(), now)).toBe(true)
	})

	it("10일을 넘긴 레시피, 미래 게시일, 잘못된 날짜는 신규 안내 대상이 아니다", () => {
		expect(isWithinNewRecipePhotoPromptWindow(new Date(now - 10 * day - 1).toISOString(), now)).toBe(false)
		expect(isWithinNewRecipePhotoPromptWindow(new Date(now + 1).toISOString(), now)).toBe(false)
		expect(isWithinNewRecipePhotoPromptWindow("not-a-date", now)).toBe(false)
		expect(isWithinNewRecipePhotoPromptWindow(null, now)).toBe(false)
	})
})
