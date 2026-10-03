"use client"

import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { IntentLink, RelativeTime } from "@/components/kit"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { fetchRecipeActivity } from "@/features/recipe/data/recipe-repository"
import { markRemind } from "@/features/recipe/domain/recipe-activity"

// 레시피 상세의 사람별 한 줄 (docs/discovery-and-behavior.md)
// - 작성자: 내 레시피가 다른 사람에게 실제로 어떻게 쓰였는지. 정보형 피드백이라 비교·순위는 보이지 않는다
// - 다른 사람: 이 레시피로 요리를 시작했는데 아직 기록이 없으면, 다시 열었을 때 한 번 권한다 (알림으로 재촉하지 않는다)
// 로그인했을 때만 한 번 호출하고, 보여 줄 것이 없으면 아무것도 그리지 않는다.
export function RecipeActivity({ recipeId, userId }: { recipeId: string; userId?: string | null }) {
	const { data } = useSWR(userId ? `recipeActivity|${recipeId}|${userId}` : null, async () => {
		// 다시 권할지는 받아 온 시점에 정한다: 최근에 시작했고 아직 기록이 없을 때만
		return markRemind(await fetchRecipeActivity(createSupabaseBrowserClient(), recipeId), Date.now())
	}, { revalidateOnFocus: false, dedupingInterval: 60000 })

	if (!data) return null

	if (data.role === "owner") {
		const facts = [
			data.viewers ? `열어 본 사람 ${data.viewers}` : null,
			data.saves ? `저장 ${data.saves}` : null,
			data.cook_starts ? `요리 시작 ${data.cook_starts}명` : null,
			data.cook_completes ? `끝까지 요리 ${data.cook_completes}명` : null,
			data.made ? `기록 남김 ${data.made}명` : null,
			data.profile_visits ? `이 레시피로 내 프로필 방문 ${data.profile_visits}명` : null,
		].filter(Boolean)
		if (facts.length === 0) return null
		return (
			<div className="mt-4 border-l-2 border-orange-ink pl-3">
				<p className="text-meta font-semibold text-ink">내 레시피가 쓰인 기록</p>
				<p className="mt-0.5 text-label tabular-nums text-ink">{facts.join(" · ")}</p>
				<p className="mt-0.5 text-meta text-ink-soft">나만 보여요. 로그인한 다른 사람 기준이에요.</p>
			</div>
		)
	}

	if (!data.remind || !data.last_cook_start) return null
	return (
		<div className="mt-4 flex items-center justify-between gap-3 border-y border-border py-3">
			<p className="min-w-0 text-label text-ink">
				이 레시피로 요리를 시작했어요
				<span className="block text-meta text-ink-soft">
					<RelativeTime iso={data.last_cook_start} />
				</span>
			</p>
			<Button asChild size="sm" className="flex-shrink-0">
				<IntentLink href={`/posts/new?source=${recipeId}&origin=cook_mode`}>사진으로 남기기</IntentLink>
			</Button>
		</div>
	)
}
