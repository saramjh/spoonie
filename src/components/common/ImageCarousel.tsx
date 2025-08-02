'use client'

import * as React from "react"
import useEmblaCarousel from "embla-carousel-react"
import Image from "next/image"

import { cn } from "@/lib/utils"

interface ImageCarouselProps {
  images: string[]
  alt: string
  priority?: boolean
  // 🎯 더블탭 좋아요 지원
  onDoubleClick?: () => void
  onSingleClick?: () => void
}

export default function ImageCarousel({ 
  images, 
  alt, 
  priority = false, 
  onDoubleClick, 
  onSingleClick
}: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel()
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  
  // 🎯 토스식 더블탭 좋아요 상태 관리
  const [clickTimer, setClickTimer] = React.useState<NodeJS.Timeout | null>(null)
  const [isTouching, setIsTouching] = React.useState(false)

  React.useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap())
    }

    emblaApi.on("select", onSelect)
    onSelect() // Set initial state

    return () => {
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi])
  
  // 🧹 컴포넌트 언마운트 시 타이머 정리
  React.useEffect(() => {
    return () => {
      if (clickTimer) {
        clearTimeout(clickTimer)
      }
    }
  }, [clickTimer])

  // 🎯 토스식 더블탭 핸들러 (프로필 그리드와 동일한 로직)
  const handleImageClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 기존 타이머가 있으면 더블클릭으로 처리
    if (clickTimer) {
      clearTimeout(clickTimer)
      setClickTimer(null)
      
      // 🎯 더블클릭 - 좋아요 처리
      if (onDoubleClick) {
        onDoubleClick()
        
        // 🎯 햅틱 피드백 (모바일에서)
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      }
    } else {
      // 🎯 단일클릭 - 300ms 후 처리
      const timer = setTimeout(() => {
        if (onSingleClick) {
          onSingleClick()
        }
        setClickTimer(null)
      }, 300)
      
      setClickTimer(timer)
    }
  }, [clickTimer, onDoubleClick, onSingleClick])

  if (!images || images.length === 0) {
    return null
  }

  return (
    <div className="relative w-full overflow-hidden" ref={emblaRef}>
      <div className="flex">
        {images.map((src, index) => (
          <div className="relative flex-none w-full aspect-square" key={index}>
            <Image
              src={src}
              alt={`${alt} ${index + 1}`}
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              className="object-cover"
              priority={priority && index === 0}
            />
            
            {/* 🎯 더블탭 좋아요 오버레이 (선택적) */}
            {(onDoubleClick || onSingleClick) && (
              <>
                {/* 🎨 터치 시 어두운 오버레이 */}
                {isTouching && (
                  <div className="absolute inset-0 bg-black/10 z-10" />
                )}
                
                {/* 🚀 토스 철학: 스마트 클릭 처리 */}
                <div 
                  className="absolute inset-0 z-20 cursor-pointer select-none"
                  onTouchStart={() => setIsTouching(true)}
                  onTouchEnd={() => setIsTouching(false)}
                  onTouchCancel={() => setIsTouching(false)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setIsTouching(true)
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault()
                    setIsTouching(false)
                  }}
                  onMouseLeave={(e) => {
                    e.preventDefault()
                    setIsTouching(false)
                  }}
                  onClick={handleImageClick}
                />
              </>
            )}
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              selectedIndex === index ? 'bg-white scale-125' : 'bg-white/50'
            )}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}