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
  // 개발환경에서는 로드하지 않음
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
      onError={(e) => {
        console.error('AdSense 로드 실패:', e)
      }}
    />
  )
}