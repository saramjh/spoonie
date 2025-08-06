import { createBrowserClient } from "@supabase/ssr"

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

	// 인증 상태 변화 처리
	client.auth.onAuthStateChange(async (event, session) => {
		if (event === 'TOKEN_REFRESHED') {
			if (process.env.NODE_ENV === 'development') {
				console.log('✅ Auth token refreshed successfully')
			}
		} else if (event === 'SIGNED_OUT') {
			if (process.env.NODE_ENV === 'development') {
				console.log('👋 User signed out')
			}
			// 로그아웃 시 캐시 정리
			if (typeof window !== 'undefined') {
				window.localStorage.removeItem('supabase.auth.token')
			}
		} else if (event === 'SIGNED_IN' && session) {
			if (process.env.NODE_ENV === 'development') {
				console.log('✅ User signed in successfully')
			}
		} else if (event === 'PASSWORD_RECOVERY') {
			// 비밀번호 복구 처리
			if (process.env.NODE_ENV === 'development') {
				console.log('🔄 Password recovery initiated')
			}
		}
	})

	return client
}
