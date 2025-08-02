/**
 * 🎨 토스 스타일 Google AdSense
 * 
 * AdSense 호환 구현:
 * 1. Native script 태그 사용 (data-nscript 속성 방지)
 * 2. 403 에러 핸들링 (승인 대기 중 graceful handling)
 * 3. 환경변수로 퍼블리셔 ID 관리  
 * 4. 에러 로깅 최적화
 */

"use client"

import { useEffect } from 'react'

const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-4410729598083068'

// 🚨 전역 플래그로 중복 로드 완전 방지 (React StrictMode 대응)
let isAdSenseInitialized = false

export default function GoogleAdSense() {
  useEffect(() => {
    // 🛡️ 전역 플래그로 1차 체크 (React StrictMode 완전 대응)
    if (isAdSenseInitialized) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 AdSense already initialized, skipping')
      }
      return
    }

    // AdSense Publisher ID 확인 및 로그 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.log('💰 Google AdSense Publisher ID:', ADSENSE_PUBLISHER_ID)
    }

    // 이미 스크립트가 로드되어 있는지 확인
    const existingScript = document.querySelector(`script[src*="adsbygoogle.js"]`)
    if (existingScript) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 AdSense script already loaded')
      }
      isAdSenseInitialized = true // 플래그 설정
      return
    }

    // 플래그 설정 (로드 시작 시점에 바로 설정)
    isAdSenseInitialized = true

    // 🚀 네이티브 script 태그 생성 (data-nscript 속성 방지)
    const script = document.createElement('script')
    script.async = true
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`
    script.crossOrigin = 'anonymous'
    
    // 로드 성공 처리
    script.onload = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ AdSense 스크립트 로드 성공!')
      }
    }
    
    // 에러 처리 (403 등 승인 대기 중 에러 포함)
    script.onerror = (e) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ AdSense 로드 실패 (승인 대기 중일 수 있음):', e)
        console.log('🔍 Publisher ID:', ADSENSE_PUBLISHER_ID)
        console.log('💡 사이트 승인이 완료되면 자동으로 해결됩니다.')
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