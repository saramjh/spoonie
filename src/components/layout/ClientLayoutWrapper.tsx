"use client"

import { useEffect, useState, ReactNode } from "react"
import { revalidateStartingWith } from "@/lib/swr-cache"
import { usePathname } from "next/navigation"
import { rememberPath } from "@/lib/surface"
import SplashScreen from "./SplashScreen"
import AppWrapper from "./AppWrapper"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useSessionStore } from "@/store/sessionStore"
import { useFollowStore } from "@/store/followStore" // 업계 표준: 팔로우 상태 관리
import { startAuthorCacheCleanup } from "@/lib/author-cache"
import { captureInstallPrompt } from "@/lib/install"

// 크롬의 "설치할 수 있음" 신호는 화면이 그려지기 전에 올 수 있어 모듈을 읽을 때 바로 듣는다
captureInstallPrompt()

const SPLASH_MIN_MS = 1000
const SPLASH_MAX_MS = 3000

interface ClientLayoutWrapperProps {
  children: ReactNode
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const { isInitialLoad, setSession, setProfile, setInitialLoad: setStoreInitialLoad } = useSessionStore()
  const { initializeFollowState } = useFollowStore() // 업계 표준: 팔로우 상태 초기화

  const pathname = usePathname()
  // 스플래시는 홈으로 들어올 때만 보여 준다. 공유 링크로 상세에 들어오면 이미 그려진 본문을 가리지 않는다.
  const [splashRoute] = useState(() => pathname === "/")

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
        // 스플래시 최소 표시 시간. 로그인 확인이 끝나면 그 뒤의 팔로우·프로필 조회를 기다리지 않고 닫는다.
        const startedAt = performance.now()
        const closeSplash = () => {
          const wait = Math.max(0, SPLASH_MIN_MS - (performance.now() - startedAt))
          setTimeout(() => setStoreInitialLoad(false), wait)
        }
        const fallbackTimer = setTimeout(() => setStoreInitialLoad(false), SPLASH_MAX_MS)

        
        try {
          const supabase = createSupabaseBrowserClient()
          
          // 1. 세션 확인
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          clearTimeout(fallbackTimer)
          closeSplash()
          
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
            
            // 업계 표준: 팔로우 상태 초기화 (Instagram/Twitter 방식)
            try {
              await initializeFollowState(user.id)

            } catch (error) {
              console.error("❌ ClientLayoutWrapper: Follow state initialization failed:", error)
            }
            
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
        closeSplash()
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
        useFollowStore.setState({ followingUsers: new Set() })
        return
      }
      if (event !== "SIGNED_IN" || !authSession?.user) return
      const user = authSession.user
      if (useSessionStore.getState().session?.id === user.id) return
      setSession(user)
      // 이벤트 처리기 안에서 Supabase를 다시 부르면 막힐 수 있어 다음 차례로 미룬다
      setTimeout(async () => {
        void initializeFollowState(user.id).catch((error) => console.error("❌ Follow state initialization failed:", error))
        const { data: profile } = await supabase.from("profiles").select("id, username, display_name, avatar_url, public_id").eq("id", user.id).maybeSingle()
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

  // 스플래시는 페이지 위에 겹치는 오버레이로만 그린다.
  // 페이지를 스플래시로 대체하면 서버 HTML에 본문이 빠져 검색엔진이 빈 페이지를 보게 된다.
  return (
    <>
      <AppWrapper>{children}</AppWrapper>
      {isInitialLoad && splashRoute && <SplashScreen />}
    </>
  )
}