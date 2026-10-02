import { createBrowserClient } from "@supabase/ssr"

let authListenerAttached = false

export function createSupabaseBrowserClient() {
	const client = createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!, 
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			auth: {
				// 자동 토큰 새로고침 활성화
				autoRefreshToken: true,
				// 세션 지속성 설정
				persistSession: true,
				// 잘못된 토큰 감지 시 자동 로그아웃
				detectSessionInUrl: true,
				// 토큰 갱신 실패 시 처리
				flowType: 'pkce',
				storage: typeof window !== 'undefined' ? window.localStorage : undefined
			}
		}
	)

	// 브라우저에서는 @supabase/ssr이 같은 클라이언트를 돌려준다. 인증 이벤트 처리기는 한 번만 단다
	// (이 함수는 컴포넌트가 렌더될 때마다 불리므로, 매번 달면 처리기가 계속 쌓인다)
	if (typeof window !== "undefined" && !authListenerAttached) {
		authListenerAttached = true
		client.auth.onAuthStateChange((event) => {
			// 예전 방식으로 저장된 토큰이 남아 있으면 로그아웃 때 지운다
			if (event === "SIGNED_OUT") window.localStorage.removeItem("supabase.auth.token")
		})
	}

	return client
}
