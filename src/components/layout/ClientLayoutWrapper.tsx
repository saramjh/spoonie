"use client"

import { useEffect, useState, ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useSWRConfig } from "swr"
import SplashScreen from "./SplashScreen"
import AppWrapper from "./AppWrapper"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useSessionStore } from "@/store/sessionStore"
import { useFollowStore } from "@/store/followStore" // 업계 표준: 팔로우 상태 관리
import { RefreshProvider } from "@/contexts/RefreshContext"
import { startAuthorCacheCleanup } from "@/utils/author-cache"
import { startMonitoring } from "@/lib/monitoring"

const SPLASH_MIN_MS = 700
const SPLASH_MAX_MS = 3000

interface ClientLayoutWrapperProps {
  children: ReactNode
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const { isInitialLoad, setSession, setProfile, setInitialLoad: setStoreInitialLoad } = useSessionStore()
  const { initializeFollowState } = useFollowStore() // 업계 표준: 팔로우 상태 초기화

  const { mutate } = useSWRConfig()
  const pathname = usePathname()
  // 스플래시는 홈으로 들어올 때만 보여 준다. 공유 링크로 상세에 들어오면 이미 그려진 본문을 가리지 않는다.
  const [splashRoute] = useState(() => pathname === "/")



  // 메모리 안전: 전역 서비스 관리
  useEffect(() => {
    const cleanupAuthorCache = startAuthorCacheCleanup()
    const cleanupMonitoring = startMonitoring()
    
    return () => {
      cleanupAuthorCache()
      cleanupMonitoring()
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
            console.error("❌ ClientLayoutWrapper: Auth error:", userError)
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

  // 뒤로가기 감지 시 홈화면 피드 새로고침
  useEffect(() => {
    const handlePopState = () => {

      
      // 홈화면으로 돌아갔을 때만 피드 새로고침
      if (pathname === "/" || pathname === "") {

        
        // 현재 사용자 정보 가져오기
        const getCurrentUserAndRefresh = async () => {
          try {
            const { createSupabaseBrowserClient } = await import("@/lib/supabase-client")
            const supabase = createSupabaseBrowserClient()
            const { data: { user } } = await supabase.auth.getUser()
            
            const userId = user?.id || "guest"

            
            // 모든 홈 피드 캐시 무효화
            mutate(
              (key) => typeof key === "string" && 
                       key.startsWith(`items|`) && 
                       key.endsWith(`|${userId}`),
              undefined,
              { revalidate: true }
            )
          } catch (error) {
            console.error("Error refreshing feed:", error)
          }
        }
        
        getCurrentUserAndRefresh()
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [pathname, mutate])

  // 스플래시는 페이지 위에 겹치는 오버레이로만 그린다.
  // 페이지를 스플래시로 대체하면 서버 HTML에 본문이 빠져 검색엔진이 빈 페이지를 보게 된다.
  return (
    <RefreshProvider>
      <AppWrapper>{children}</AppWrapper>
      {isInitialLoad && splashRoute && <SplashScreen />}
    </RefreshProvider>
  )
}