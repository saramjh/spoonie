/**
 * 토스 스타일 Google Analytics
 * 
 * Next.js 업계 표준 구현:
 * 1. Script 컴포넌트 사용
 * 2. 환경변수로 ID 관리
 * 3. 개발환경 제외
 * 4. 성능 최적화 (afterInteractive)
 */

"use client"

import { useEffect } from 'react'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-16DKDXVQ9T'

// GTM 타입 정의
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

// window 객체에 플래그 저장으로 완전 중복 방지
declare global {
  interface Window {
    __SPOONIE_GA_INITIALIZED__: boolean
    __SPOONIE_GA_BLOCKED__: boolean
  }
}

// 메인 GoogleAnalytics 컴포넌트 (Service Worker 호환)
export default function GoogleAnalytics() {
  useEffect(() => {
    // 개발 환경에서는 애드블로커 충돌 방지를 위해 완전 비활성화
    if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGS === 'true') {
      if (!window.__SPOONIE_GA_BLOCKED__) {
        console.log('🛡️ [개발환경] GA 비활성화 - 애드블로커 충돌 방지')
        window.__SPOONIE_GA_BLOCKED__ = true
      }
      return
    }

    // Window 객체 기반 중복 방지 (더 강력함)
    if (window.__SPOONIE_GA_INITIALIZED__) {
      return
    }

    // GA ID 확인 및 로그 (환경변수로 제어)
    if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGS === 'true') {
      console.log('🎯 Google Analytics ID:', GA_MEASUREMENT_ID)
    }

    // 이미 로드되어 있는지 확인
    const existingScript = document.querySelector(`script[src*="gtag/js?id=${GA_MEASUREMENT_ID}"]`)
    if (existingScript) {
      if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGS === 'true') {
        console.log('🔄 GA script already loaded')
      }
      window.__SPOONIE_GA_INITIALIZED__ = true // 플래그 설정
      return
    }

    // 플래그 설정 (로드 시작 시점에 바로 설정)
    window.__SPOONIE_GA_INITIALIZED__ = true

    // 네이티브 script 태그 생성 (Service Worker 호환)
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    
    script.onload = () => {
      // dataLayer 및 gtag 함수 초기화
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) { 
        window.dataLayer.push(args); 
      }
      window.gtag = gtag;

      gtag('js', new Date());
      gtag('config', GA_MEASUREMENT_ID, {
        page_path: window.location.pathname,
        debug_mode: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGS === 'true',
        send_page_view: true
      });

      if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGS === 'true') {
        console.log('✅ GA 스크립트 로드 성공!')
      }

      // GA 테스트 함수 (글로벌로 노출)
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
    
    script.onerror = (e) => {
      if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_LOGS === 'true') {
        console.warn('⚠️ GA 로드 실패 (네트워크 또는 Ad Blocker):', e)
      }
    }

    // DOM에 추가
    document.head.appendChild(script)

    // 클린업 함수
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  return null // 컴포넌트 자체는 렌더링하지 않음
}