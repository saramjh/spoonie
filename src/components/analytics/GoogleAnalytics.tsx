/**
 * 🎨 토스 스타일 Google Analytics
 * 
 * Next.js 업계 표준 구현:
 * 1. Script 컴포넌트 사용
 * 2. 환경변수로 ID 관리
 * 3. 개발환경 제외
 * 4. 성능 최적화 (afterInteractive)
 */

"use client"

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-16DKDXVQ9T'

// 🎯 GTM 타입 정의
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

// 🎯 페이지뷰 추적
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    })
  }
}

// 🎯 이벤트 추적
export const event = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// 🎨 토스 스타일 커스텀 이벤트들
export const TossAnalyticsEvents = {
  // 레시피 관련
  viewRecipe: (recipeId: string, recipeTitle: string) => 
    event('view_recipe', 'Recipe', `${recipeTitle} (${recipeId})`),
  
  likeRecipe: (recipeId: string) => 
    event('like_recipe', 'Engagement', recipeId),
    
  shareRecipe: (recipeId: string, method: string) => 
    event('share_recipe', 'Social', `${method}-${recipeId}`),
  
  // 사용자 행동
  searchQuery: (query: string) => 
    event('search', 'User Behavior', query),
    
  followUser: (userId: string) => 
    event('follow_user', 'Social', userId),
  
  // 광고 관련 (중요!)
  adClick: (adUnit: string, position: string) => 
    event('ad_click', 'Monetization', `${adUnit}-${position}`),
    
  adView: (adUnit: string, position: string) => 
    event('ad_impression', 'Monetization', `${adUnit}-${position}`)
}

// 🎯 페이지뷰 자동 추적 훅
export function useGoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
      pageview(url)
    }
  }, [pathname, searchParams])
}

// 🎯 메인 GoogleAnalytics 컴포넌트
export default function GoogleAnalytics() {
  // GA ID 확인 및 로그
  console.log('🎯 Google Analytics ID:', GA_MEASUREMENT_ID)
  
  // 🧪 GA 테스트 함수 (글로벌로 노출)
  if (typeof window !== 'undefined') {
    (window as any).testGA = () => {
      if (window.gtag) {
        window.gtag('event', 'test_event', {
          event_category: 'Testing',
          event_label: 'Manual GA Test',
          value: 1
        })
        console.log('✅ GA Test Event Sent!')
      } else {
        console.log('❌ GA not loaded')
      }
    }
  }
  
  // 임시로 모든 환경에서 로드 (테스트용)
  // if (process.env.NODE_ENV !== 'production') {
  //   console.log('🧪 GA disabled in development mode')
  //   return null
  // }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              debug_mode: true,
              send_page_view: true
            });
          `,
        }}
      />
    </>
  )
}