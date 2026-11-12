"use client"

import { useEffect, useState, ReactNode } from "react"
import { revalidateStartingWith } from "@/shared/infra/swr-cache"
import { usePathname } from "next/navigation"
import { rememberPath } from "@/shared/lib/surface"
import AppWrapper from "./AppWrapper"
import SplashScreen from "./SplashScreen"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { useSessionStore } from "@/store/sessionStore"
import { useFollowStore } from "@/features/social/store/followStore"
import { startAuthorCacheCleanup } from "@/shared/infra/author-cache"
import { captureInstallPrompt } from "@/shared/lib/install"
import { fetchProfileSummary } from "@/features/profile/data/profile-repository"

// 크롬의 "설치할 수 있음" 신호는 화면이 그려지기 전에 올 수 있어 모듈을 읽을 때 바로 듣는다
captureInstallPrompt()

const AUTH_FALLBACK_MS = 3000
// 한 번의 첫 홈 진입에서만 브랜드 인트로를 보여준다. 인증/데이터 로딩과 무관하다.
const FIRST_VISIT_SPLASH_MS = 1600

interface ClientLayoutWrapperProps {
  children: ReactNode
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const { isInitialLoad, setSession, setProfile, setInitialLoad: setStoreInitialLoad } = useSessionStore()
  const { initializeFollowState } = useFollowStore()

  const pathname = usePathname()
  // 루트 레이아웃은 클라이언트 탐색마다 재마운트되지 않는다.
  // 직접 연 상세 링크에는 스플래시를 씌우지 않고, 최초 홈 진입에만 표시한다.
  const [showFirstVisitSplash, setShowFirstVisitSplash] = useState(() => pathname === "/")

  useEffect(() => {
    if (!showFirstVisitSplash) return
    const timer = window.setTimeout(() => setShowFirstVisitSplash(false), FIRST_VISIT_SPLASH_MS)
    return () => window.clearTimeout(timer)
  }, [showFirstVisitSplash])

  // 행동 기록이 "어디서 왔는지"를 알 수 있게 화면 이동을 기억한다
  useEffect(() => {
    rememberPath(pathname)
  }, [pathname])



  // 메모리 안전: 전역 서비스 관리
  useEffect(() => {
    const cleanupAuthorCache = startAuthorCacheCleanup()
    
    return () => {
      cleanupAuthorCache()
    }
  }, [])

  // 세션과 프로필 초기 로드
  useEffect(() => {
    const initializeAuth = async () => {
      if (isInitialLoad) {
        // 서버가 이미 페이지 본문을 보내므로 인증 중에도 콘텐츠를 가리지 않는다.
        // 네트워크가 응답하지 않을 때만 초기 상태를 풀어 주는 안전 상한이다.
        const completeInitialization = () => setStoreInitialLoad(false)
        const fallbackTimer = setTimeout(completeInitialization, AUTH_FALLBACK_MS)

        
        try {
          const supabase = createSupabaseBrowserClient()
          
          // 1. 세션 확인
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          clearTimeout(fallbackTimer)
          completeInitialization()
          
          if (userError) {
            // 세션이 없는 것은 비로그인 방문의 정상 상태라 오류로 남기지 않는다
            if (userError.name !== "AuthSessionMissingError") console.error("❌ ClientLayoutWrapper: Auth error:", userError)
            // 토큰 관련 에러인 경우 조용히 로그아웃 처리
            if (userError.message?.includes('Invalid Refresh Token') || 
                userError.message?.includes('refresh_token_not_found')) {
              if (process.env.NODE_ENV === 'development') {
                console.log('🔄 Invalid token detected, signing out silently')
              }
              await supabase.auth.signOut()
            }
            setSession(null)
            setProfile(null)
          } else if (user) {

            setSession(user)
            
            // 프로필 로드는 팔로우 목록 요청에 종속되지 않는다.
            void initializeFollowState(user.id).catch((error) => {
              console.error("❌ ClientLayoutWrapper: Follow state initialization failed:", error)
            })

            // 2. 프로필 로드 (OAuth callback에서 생성되었어야 함)
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url, public_id')
              .eq('id', user.id)
              .single()
            
            if (profileError) {
              console.error("❌ ClientLayoutWrapper: Profile loading failed:", profileError)
              
              // 프로필이 없는 경우 - OAuth callback 실패 가능성
              if (profileError.code === 'PGRST116') {
                console.error("🚨 Profile not found! OAuth callback may have failed.")
                console.error("🔍 User should try logging out and logging in again.")
              }
              
              setProfile(null)
            } else {
              if (process.env.NODE_ENV === 'development') {
          console.log("✅ Profile loaded successfully:", profile.username)
        }
              setProfile(profile)
            }
          } else {
            setSession(null)
            setProfile(null)
          }
          
        } catch (error) {
          console.error("❌ ClientLayoutWrapper: Auth initialization error:", error)
          setSession(null)
          setProfile(null)
        }
        
        clearTimeout(fallbackTimer)
        completeInitialization()
      }
    }

    initializeAuth()
  }, [isInitialLoad, setSession, setProfile, setStoreInitialLoad, initializeFollowState])

  // 로그인·로그아웃이 화면 이동(새로고침 없이)으로 일어나도 세션·프로필·팔로우 상태를 맞춘다.
  // (처음 한 번만 채우면, 로그인 화면에서 로그인한 뒤 홈으로 넘어왔을 때 하단이 "로그인"으로 남고 팔로우가 로그인을 다시 요구했다)
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const { data } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (event === "SIGNED_OUT") {
        setSession(null)
        setProfile(null)
        useFollowStore.setState({
          followingUsers: new Set(), isLoading: false,
          initializedUserId: null, initializingUserId: null,
        })
        return
      }
      if (event !== "SIGNED_IN" || !authSession?.user) return
      const user = authSession.user
      if (useSessionStore.getState().session?.id === user.id) return
      setSession(user)
      // 이벤트 처리기 안에서 Supabase를 다시 부르면 막힐 수 있어 다음 차례로 미룬다
      setTimeout(async () => {
        void initializeFollowState(user.id).catch((error) => console.error("❌ Follow state initialization failed:", error))
        const profile = await fetchProfileSummary(supabase, user.id)
        setProfile(profile ?? null)
      }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [setSession, setProfile, initializeFollowState])

  // 뒤로 가기로 홈에 돌아오면 피드를 다시 받는다 (이 앱의 유일한 뒤로 가기 처리기).
  // 도착한 주소는 window.location으로 읽는다 (pathname은 떠나는 화면의 값이다)
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname !== "/") return
      void revalidateStartingWith(["items|"])
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  return (
    <>
      <AppWrapper>{children}</AppWrapper>
      {showFirstVisitSplash && <SplashScreen />}
    </>
  )
}
