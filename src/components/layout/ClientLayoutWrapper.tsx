"use client"

import { useEffect, useRef } from "react"
import { useSessionStore } from "@/store/sessionStore"
import SplashScreen from "@/components/layout/SplashScreen"
import { RefreshProvider } from "@/contexts/RefreshContext"
import AppWrapper from "@/components/layout/AppWrapper"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
	const { isInitialLoad, setInitialLoad, setSession, setProfile } = useSessionStore()
	const supabase = createSupabaseBrowserClient()
	const initialized = useRef(false)

	console.log("🔧 ClientLayoutWrapper: Current state:", {
		isInitialLoad,
		initialized: initialized.current,
	})

	useEffect(() => {
		if (initialized.current) {
			console.log("🔄 ClientLayoutWrapper already initialized, skipping...")
			return
		}

		console.log("🚀 ClientLayoutWrapper initializing...")
		initialized.current = true

		const timer = setTimeout(() => {
			console.log("⏰ Timer: Setting isInitialLoad to false after 3 seconds")
			setInitialLoad(false)
		}, 3000)

		// 초기 세션 체크 함수
		const checkInitialSession = async () => {
			console.log("🔍 Checking initial session...")
			try {
				const {
					data: { session },
					error,
				} = await supabase.auth.getSession()
				console.log("📱 Initial session check:", {
					hasSession: !!session,
					sessionData: session
						? {
								userId: session.user?.id,
								email: session.user?.email,
								aud: session.user?.aud,
						  }
						: null,
					error,
				})

				if (error) {
					console.error("❌ Session check error:", error)
					setSession(null)
					setProfile(null)
					// 세션 체크 완료 후 스플래시 종료
					console.log("🎯 Session check completed (error), ending splash screen")
					setInitialLoad(false)
					return
				}

				setSession(session?.user || null)

				if (session?.user) {
					console.log("👤 Fetching profile for user:", session.user.id)

					try {
						// Fetch profile when session is available
						console.log("🔄 Starting profile query...")
						const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

						console.log("🗄️ DB Profile Query Result:", {
							hasProfile: !!profile,
							profileData: profile,
							profileError: profileError,
							rawResponse: { data: profile, error: profileError },
						})

						if (profileError) {
							console.error("❌ Error fetching profile:", {
								code: profileError.code,
								message: profileError.message,
								details: profileError.details,
								hint: profileError.hint,
								fullError: profileError,
							})
							setProfile(null)
						} else if (profile) {
							console.log("✅ Profile loaded successfully:", {
								id: profile.id,
								public_id: profile.public_id,
								display_name: profile.display_name,
								avatar_url: profile.avatar_url,
								username: profile.username,
								email: profile.email,
								fullProfile: profile,
							})
							setProfile(profile)
						} else {
							console.warn("⚠️ Profile query succeeded but returned null/undefined")
							setProfile(null)
						}

						// 프로필 로딩 완료 후 스플래시 종료 (성공/실패 무관)
						console.log("🎯 Profile loading completed, ending splash screen")
						setInitialLoad(false)
					} catch (profileQueryError) {
						console.error("💥 Profile query threw exception:", {
							error: profileQueryError,
							errorMessage: profileQueryError instanceof Error ? profileQueryError.message : String(profileQueryError),
							errorStack: profileQueryError instanceof Error ? profileQueryError.stack : undefined,
						})
						setProfile(null)
						// 프로필 쿼리 예외 발생 시에도 스플래시 종료
						console.log("🎯 Profile query failed, ending splash screen")
						setInitialLoad(false)
					}
				} else {
					console.log("🚫 No session found")
					setProfile(null)
					// 비회원 상태에서도 세션 체크 완료 후 스플래시 종료
					console.log("🎯 No session (guest), ending splash screen")
					setInitialLoad(false)
				}
			} catch (error) {
				console.error("💥 Unexpected error in session check:", {
					error,
					errorMessage: error instanceof Error ? error.message : String(error),
					errorStack: error instanceof Error ? error.stack : undefined,
				})
				setSession(null)
				setProfile(null)
				// 예외 발생 시에도 스플래시 종료
				console.log("🎯 Session check exception, ending splash screen")
				setInitialLoad(false)
			}
		}

		// 초기 세션 체크 실행
		checkInitialSession()

		// Auth state change 리스너
		const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log("🔄 Auth state changed:", {
				event,
				hasSession: !!session,
				sessionData: session
					? {
							userId: session.user?.id,
							email: session.user?.email,
							aud: session.user?.aud,
					  }
					: null,
			})
			setSession(session?.user || null)

			if (session?.user) {
				console.log("👤 Auth changed - Fetching profile for user:", session.user.id)

				try {
					// Fetch profile when session is available
					console.log("🔄 Auth change - Starting profile query...")
					const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

					console.log("🗄️ Auth change - DB Profile Query Result:", {
						hasProfile: !!profile,
						profileData: profile,
						profileError: error,
						rawResponse: { data: profile, error },
					})

					if (error) {
						console.error("❌ Auth change - Error fetching profile:", {
							code: error.code,
							message: error.message,
							details: error.details,
							hint: error.hint,
							fullError: error,
						})
						setProfile(null)
					} else if (profile) {
						console.log("✅ Auth change - Profile loaded:", {
							id: profile.id,
							public_id: profile.public_id,
							display_name: profile.display_name,
							username: profile.username,
							fullProfile: profile,
						})
						setProfile(profile)
					} else {
						console.warn("⚠️ Auth change - Profile query succeeded but returned null/undefined")
						setProfile(null)
					}
				} catch (profileQueryError) {
					console.error("💥 Auth change - Profile query threw exception:", {
						error: profileQueryError,
						errorMessage: profileQueryError instanceof Error ? profileQueryError.message : String(profileQueryError),
						errorStack: profileQueryError instanceof Error ? profileQueryError.stack : undefined,
					})
					setProfile(null)
				}
			} else {
				console.log("🚫 Auth change - No session, clearing profile")
				setProfile(null)
			}
		})

		return () => {
			clearTimeout(timer)
			authListener.subscription.unsubscribe()
		}
	}, [setInitialLoad, setSession, setProfile, supabase])

	if (isInitialLoad) {
		console.log("⏳ ClientLayoutWrapper: Showing splash screen")
		return <SplashScreen />
	}

	console.log("🎉 ClientLayoutWrapper: Splash screen ended, rendering main app")
	return (
		<RefreshProvider>
			<AppWrapper>{children}</AppWrapper>
		</RefreshProvider>
	)
}
