import type { RecipeActivity } from "../contracts"

export const REMIND_WITHIN_DAYS = 30

// 다시 권할지는 받아 온 시점에 정한다: 최근에 시작했고 아직 기록이 없을 때만 (받은 객체에 remind를 붙인다)
export function markRemind(activity: RecipeActivity | null, now: number): RecipeActivity | null {
	if (activity?.role === "viewer" && activity.last_cook_start && !activity.recorded) {
		activity.remind = now - new Date(activity.last_cook_start).getTime() < REMIND_WITHIN_DAYS * 24 * 60 * 60 * 1000
	}
	return activity
}
