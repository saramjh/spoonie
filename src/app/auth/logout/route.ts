import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
	const supabase = createSupabaseRouteHandlerClient()

	// Check if we have a session
	const {
		data: { session },
	} = await supabase.auth.getSession()

	if (session) {
		await supabase.auth.signOut()
	}

	return NextResponse.redirect(new URL("/", request.url), {
		status: 302,
	})
}
