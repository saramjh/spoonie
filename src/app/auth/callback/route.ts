import { createSupabaseRouteHandlerClient } from "@/shared/infra/supabase-server"
import { generateUniqueUsername } from "@/features/profile/data/username-generator"
import { generateUniquePublicId } from "@/features/profile/data/public-id-generator"
import { safeNextPath } from "@/shared/lib/safe-next-path"
import { parsePartnerEntrySource, withPartnerEntry } from "@/shared/lib/partner-entry"

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url)
	const code = searchParams.get("code")
	const next = safeNextPath(searchParams.get("next"))
	const partnerSource = parsePartnerEntrySource(searchParams.get("entry"))
	let destination = "/auth/auth-code-error"

	if (code) {
		const supabase = await createSupabaseRouteHandlerClient()
		const { error } = await supabase.auth.exchangeCodeForSession(code)

		if (!error) {
			// 인증 성공 후 사용자 정보 가져오기
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser()

			if (user && !userError) {
				if (process.env.NODE_ENV === 'development') {
					console.log("🔍 OAuth callback - User authenticated:", user.id)
				}
				
				// 프로필 존재 여부 확인
				const { data: existingProfile, error: profileError } = await supabase.from("profiles").select("id").eq("id", user.id).single()
				
				if (process.env.NODE_ENV === 'development') {
					console.log("🔍 Profile check result:", { existingProfile, profileError })
				}

				// 프로필이 없으면 생성
				if (!existingProfile && profileError?.code === "PGRST116") {
					if (process.env.NODE_ENV === 'development') {
						console.log("🆕 Creating new profile for user:", user.id)
					}

					try {
						// 유니크한 username과 public_id 생성
						const username = await generateUniqueUsername()
						const publicId = await generateUniquePublicId()
						
						if (process.env.NODE_ENV === 'development') {
						console.log("🔍 Generated credentials:", { username, publicId })
					}

						const profileData = {
							id: user.id,
							email: user.email, // 누락된 email 필드 추가
							username: username,
							public_id: publicId,
							display_name: user.user_metadata?.full_name || username,
							avatar_url: user.user_metadata?.avatar_url || null,
							bio: null,
							profile_message: null,
							username_changed_count: 0,
						}
						
						if (process.env.NODE_ENV === 'development') {
						console.log("🔍 Inserting profile data:", profileData)
					}

						const { data: insertedProfile, error: insertError } = await supabase
							.from("profiles")
							.insert(profileData)
							.select("id")
							.single()

						if (insertError) {
							console.error("❌ Profile creation failed:", insertError)
							console.error("❌ Error details:", {
								code: insertError.code,
								message: insertError.message,
								details: insertError.details,
								hint: insertError.hint
							})
											} else if (process.env.NODE_ENV === 'development') {
						console.log("✅ Profile created successfully:", insertedProfile)
					}
					} catch (error) {
						console.error("❌ Profile creation process failed:", error)
					}
				} else if (existingProfile && process.env.NODE_ENV === 'development') {
					console.log("✅ Profile already exists for user:", user.id)
				} else {
					console.error("❌ Unexpected profile error:", profileError)
				}
			} else {
				console.error("❌ OAuth callback - User authentication failed:", userError)
			}

			destination = withPartnerEntry(next, partnerSource)
		}
	}

	// 경로만 보내서 PKCE와 세션 쿠키를 설정한 도메인 안에서 복귀한다.
	return new Response(null, { status: 307, headers: { Location: destination } })
}
