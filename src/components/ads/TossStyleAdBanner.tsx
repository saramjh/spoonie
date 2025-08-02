/**
 * 🎨 토스 스타일 광고 배너
 * 
 * 토스 UX/UI 철학:
 * 1. 광고도 UI의 일부 - 자연스러운 통합
 * 2. 사용자를 속이지 않는 투명성
 * 3. 콘텐츠와의 조화로운 배치
 * 4. 모바일 최적화 우선
 */

"use client"

import { useEffect, useRef } from "react"

interface TossStyleAdBannerProps {
  slot: string
  format?: "auto" | "rectangle" | "horizontal" | "vertical"
  className?: string
  responsive?: boolean
  style?: React.CSSProperties
}

declare global {
  interface Window {
    adsbygoogle: Record<string, unknown>[]
  }
}

export default function TossStyleAdBanner({
  slot,
  format = "auto",
  className = "",
  responsive = true,
  style = {}
}: TossStyleAdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.adsbygoogle) {
        window.adsbygoogle.push({})
      }
    } catch (error) {
      console.error("AdSense 광고 로드 실패:", error)
    }
  }, [])

  return (
    <div className={`toss-ad-container ${className}`}>
      {/* 🎨 토스 스타일 광고 라벨 */}
      <div className="flex items-center justify-center mb-2">
        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
          광고
        </span>
      </div>
      
      {/* 🎨 토스 스타일 광고 영역 */}
      <div 
        ref={adRef}
        className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-sm"
        style={{
          minHeight: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
      >
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            ...style
          }}
          data-ad-client="ca-pub-4410729598083068"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive}
        />
      </div>
      
      {/* 🎨 토스 스타일 간격 조정 */}
      <div className="h-4" />
    </div>
  )
}

// 🎨 토스 스타일 반응형 광고 사이즈 헬퍼
export const TossAdSizes = {
  mobile: {
    width: '320px',
    height: '100px'
  },
  tablet: {
    width: '728px', 
    height: '90px'
  },
  desktop: {
    width: '728px',
    height: '90px'
  },
  square: {
    width: '300px',
    height: '250px'
  },
  rectangle: {
    width: '336px',
    height: '280px'
  }
} as const