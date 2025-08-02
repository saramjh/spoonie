"use client"

import { useState, useEffect, ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useSWRConfig } from "swr"
import SplashScreen from "./SplashScreen"
import AppWrapper from "./AppWrapper"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useSessionStore } from "@/store/sessionStore"
import { useFollowStore } from "@/store/followStore" // �� 업계 표준: 팔로우 상태 관리

interface ClientLayoutWrapperProps {
  children: ReactNode
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  const { isInitialLoad, setSession, setProfile, setInitialLoad: setStoreInitialLoad } = useSessionStore()
  const { initializeFollowState } = useFollowStore() // 🚀 업계 표준: 팔로우 상태 초기화
  const [initialized, setInitialized] = useState(false)
  const { mutate } = useSWRConfig()
  const pathname = usePathname()



  // 🚀 세션과 프로필 초기 로드
  useEffect(() => {
    const initializeAuth = async () => {
      if (isInitialLoad) {

        
        try {
          const supabase = createSupabaseBrowserClient()
          
          // 1. 세션 확인
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          
          if (userError) {

            setSession(null)
            setProfile(null)
          } else if (user) {

            setSession(user)
            
            // 🚀 업계 표준: 팔로우 상태 초기화 (Instagram/Twitter 방식)
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
              console.log("✅ Profile loaded successfully:", profile.username)
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
        
        // 초기 로딩 완료
        setTimeout(() => {
          setStoreInitialLoad(false)
          setInitialized(true)

        }, 1500) // 1.5초 후 스플래시 화면 숨김
      }
    }

    initializeAuth()
  }, [isInitialLoad, setSession, setProfile, setStoreInitialLoad])

  // 🚀 뒤로가기 감지 시 홈화면 피드 새로고침
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

  if (isInitialLoad) {
    return <SplashScreen />
  }

  return <AppWrapper>{children}</AppWrapper>
}