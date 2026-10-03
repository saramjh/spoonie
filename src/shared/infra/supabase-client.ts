import { createBrowserClient } from "@supabase/ssr"

let authListenerAttached = false

export function createSupabaseBrowserClient() {
	// 옵션을 따로 주지 않는다: @supabase/ssr이 브라우저에서 로그인 정보 저장(쿠키), PKCE, 토큰 자동 갱신을
	// 항상 자기 값으로 덮어쓴다 (예전에 적어 둔 localStorage·pkce 옵션은 실제로 쓰이지 않았다).
	// 브라우저에서는 처음 만든 클라이언트 하나를 계속 돌려준다 (같은 로그인 상태를 모든 화면이 함께 쓴다)
	const client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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
