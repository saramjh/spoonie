import type { RecipeActivity } from "../contracts"

const REMIND_WITHIN_DAYS = 30
const NEW_RECIPE_PHOTO_PROMPT_MS = 10 * 24 * 60 * 60 * 1000

// 게시 후 10일 동안만 상세 상단에서 사진 기록 참여를 강조한다.
// 10일이 지난 레시피도 별도 참여 경로를 유지한다.
export function isWithinNewRecipePhotoPromptWindow(createdAt: string | null | undefined, now: number): boolean {
	const publishedAt = createdAt ? Date.parse(createdAt) : Number.NaN
	return Number.isFinite(publishedAt) && publishedAt <= now && now - publishedAt <= NEW_RECIPE_PHOTO_PROMPT_MS
}

// 다시 권할지는 받아 온 시점에 정한다: 최근에 시작했고 아직 기록이 없을 때만 (받은 객체에 remind를 붙인다)
export function markRemind(activity: RecipeActivity | null, now: number): RecipeActivity | null {
	if (activity?.role === "viewer" && activity.last_cook_start && !activity.recorded) {
		activity.remind = now - new Date(activity.last_cook_start).getTime() < REMIND_WITHIN_DAYS * 24 * 60 * 60 * 1000
	}
	return activity
}
