import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { generateUniqueUsername } from "@/lib/username-generator"
import { generateUniquePublicId } from "@/lib/public-id-generator"

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get("code")
	const next = searchParams.get("next") ?? "/"

	if (code) {
		const supabase = createSupabaseServerClient()
		const { error } = await supabase.auth.exchangeCodeForSession(code)

		if (!error) {
			// 인증 성공 후 사용자 정보 가져오기
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser()

			if (user && !userError) {
				// 프로필 존재 여부 확인
				const { data: existingProfile, error: profileError } = await supabase.from("profiles").select("id").eq("id", user.id).single()

				// 프로필이 없으면 생성
				if (!existingProfile && profileError?.code === "PGRST116") {
					console.log("🆕 Creating new profile for user:", user.id)

					try {
						// 유니크한 username과 public_id 생성
						const username = await generateUniqueUsername()
						const publicId = await generateUniquePublicId()

						const { error: insertError } = await supabase.from("profiles").insert({
							id: user.id,
							username: username,
							public_id: publicId,
							display_name: user.user_metadata?.full_name || username,
							avatar_url: user.user_metadata?.avatar_url || null,
							bio: null,
							profile_message: null,
							username_changed_count: 0,
						})

						if (insertError) {
							console.error("❌ Error creating profile:", insertError)
						} else {
							console.log("✅ Profile created successfully for user:", user.id)
						}
					} catch (error) {
						console.error("❌ Error in profile creation process:", error)
					}
				}
			}

			// 🎯 올바른 도메인으로 강제 리디렉션
			const redirectOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'
			console.log('🔍 Callback redirect:', { origin, redirectOrigin, next })
			return NextResponse.redirect(`${redirectOrigin}${next}`)
		}
	}

	// return the user to an error page with instructions
	const redirectOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://spoonie.kr'
	return NextResponse.redirect(`${redirectOrigin}/auth/auth-code-error`)
}
