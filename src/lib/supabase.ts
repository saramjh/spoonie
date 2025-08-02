import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr"

export function createSupabaseBrowserClient() {
	return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export function createSupabaseServerClient() {
	// Dynamic import required for server-side only functionality
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { cookies } = require("next/headers")
	const cookieStore = cookies()

	return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
		cookies: {
			get(name: string) {
				return cookieStore.get(name)?.value
			},
			set(name: string, value: string, options: CookieOptions) {
				cookieStore.set({ name, value, ...options })
			},
			remove(name: string, options: CookieOptions) {
				cookieStore.set({ name, value: "", ...options })
			},
		},
	})
}
