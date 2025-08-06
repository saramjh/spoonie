import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"

export function createSupabaseServerClient(isRouteHandler = false) {
	const cookieStore = cookies()
	
	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!, 
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // 서버에서도 ANON 키 사용
		{
			cookies: {
				get(name: string) {
					return cookieStore.get(name)?.value
				},
				set(name: string, value: string, options: CookieOptions) {
					if (isRouteHandler) {
						// Route Handler나 Server Action에서만 쿠키 수정 허용
						cookieStore.set({ name, value, ...options })
					} else {
						// Server Component에서는 쿠키 수정 금지
						if (process.env.NODE_ENV === 'development') {
							console.warn('⚠️ Cookie modification blocked in Server Component:', name)
						}
					}
				},
				remove(name: string, options: CookieOptions) {
					if (isRouteHandler) {
						// Route Handler나 Server Action에서만 쿠키 제거 허용
						cookieStore.set({ name, value: "", ...options })
					} else {
						// Server Component에서는 쿠키 제거 금지
						if (process.env.NODE_ENV === 'development') {
							console.warn('⚠️ Cookie removal blocked in Server Component:', name)
						}
					}
				},
			},
			auth: {
				// 서버에서는 자동 토큰 갱신 비활성화
				autoRefreshToken: false,
				persistSession: false,
				detectSessionInUrl: false
			}
		}
	)
}

// Route Handler 전용 함수
export function createSupabaseRouteHandlerClient() {
	return createSupabaseServerClient(true)
}
