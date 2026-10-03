import { createBrowserClient } from "@supabase/ssr"

export function createSupabaseBrowserClient() {
	return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// 서버 클라이언트는 별도 파일(supabase-server.ts)로 분리됨
