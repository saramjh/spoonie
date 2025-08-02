/**
 * 🎨 토스 스타일 Google AdSense
 * 
 * Next.js 업계 표준 구현:
 * 1. Script 지연 로딩
 * 2. 환경변수로 퍼블리셔 ID 관리  
 * 3. 에러 핸들링
 * 4. 성능 최적화
 */

"use client"

import Script from 'next/script'

const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-4410729598083068'

export default function GoogleAdSense() {
  // AdSense Publisher ID 확인 및 로그 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development') {
    console.log('💰 Google AdSense Publisher ID:', ADSENSE_PUBLISHER_ID)
  }
  
  // 임시로 모든 환경에서 로드 (테스트용)
  // if (process.env.NODE_ENV !== 'production') {
  //   console.log('🧪 AdSense disabled in development mode')
  //   return null
  // }

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onLoad={() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ AdSense 스크립트 로드 성공!')
        }
      }}
      onError={(e) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ AdSense 로드 실패:', e)
          console.log('🔍 Publisher ID:', ADSENSE_PUBLISHER_ID)
          console.log('🔍 Script URL:', `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`)
        }
      }}
    />
  )
}