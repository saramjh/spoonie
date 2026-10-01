import { createSupabaseBrowserClient } from "@/lib/supabase-client"

// 레시피가 실제로 쓰였는지 보는 행동 기록. 로그인 사용자만 남기고, 실패해도 화면 동작에 영향을 주지 않는다.
// 읽기는 관리자(서비스 키)만 가능하다 (events RLS).
export type EventType = "detail_open" | "cook_start" | "cook_complete" | "save" | "recipeed_create" | "derived_create" | "profile_open"

export function logEvent(type: EventType, itemId?: string | null, origin?: string) {
	const supabase = createSupabaseBrowserClient()
	supabase.auth
		.getSession()
		.then(({ data: { session } }) => {
			if (!session) return
			return supabase.from("events").insert({ type, item_id: itemId ?? null, origin: origin ?? null })
		})
		.catch(() => {})
}
