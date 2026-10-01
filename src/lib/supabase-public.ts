import { createClient } from "@supabase/supabase-js"

// 로그인 정보(쿠키) 없이 공개 데이터만 읽는 서버용 클라이언트.
// 쿠키를 읽지 않으므로 이 클라이언트만 쓰는 페이지는 미리 만들어 CDN에서 보낼 수 있다 (홈 피드, 레시피·레시피드 상세).
export function createSupabasePublicClient() {
	return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
	})
}
