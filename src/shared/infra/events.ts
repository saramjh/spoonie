import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"

// 성장 이벤트는 두 층으로 보낸다.
// - GA4: 비로그인 포함 acquisition/funnel 관측
// - Supabase events: 로그인 사용자의 관계/행동 분석
// 어느 쪽이 실패해도 사용자 동작에는 영향을 주지 않는다.
export type EventType =
	| "detail_open"
	| "cook_start"
	| "cook_complete"
	| "save"
	| "recipeed_create"
	| "derived_create"
	| "profile_open"
	| "feed_impression"
	| "follow"
	| "unfollow"
	| "share"
	| "recipeed_start"
	| "related_open"
	| "signup_submitted"
	| "partner_auth_complete"
	| "recipe_create"

type GtagWindow = Window & {
	gtag?: (command: "event", eventName: string, params?: Record<string, string | number | boolean | undefined>) => void
}

function logAnalytics(type: EventType, itemId?: string | null, origin?: string) {
	if (typeof window === "undefined") return
	const gtag = (window as GtagWindow).gtag
	if (!gtag) return
	gtag("event", type, {
		item_id: itemId ?? undefined,
		origin: origin ?? undefined,
	})
}

export async function logEvent(type: EventType, itemId?: string | null, origin?: string): Promise<void> {
	logAnalytics(type, itemId, origin)

	// 피드 노출은 빈도가 너무 높아 DB row-per-card로 저장하지 않는다.
	// GA4에서 집계하고, Supabase에는 의도가 강한 저빈도 행동만 남긴다.
	if (type === "feed_impression") return

	try {
		const supabase = createSupabaseBrowserClient()
		const { data: { session } } = await supabase.auth.getSession()
		if (!session) return
		await supabase.from("events").insert({ type, item_id: itemId ?? null, origin: origin ?? null })
	} catch {
		// 계측 실패가 제품 동작을 막아서는 안 된다.
	}
}
