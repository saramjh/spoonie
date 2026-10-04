'use client'

import * as React from "react"
import useEmblaCarousel from "embla-carousel-react"
import { Photo } from "@/components/kit"

import { cn } from "@/lib/utils"

interface ImageCarouselProps {
  images: string[]
  alt: string
  priority?: boolean
  // 상세 페이지에서는 모든 사진을 초기 HTML에 남겨 검색엔진이 발견할 수 있게 한다.
  discoverAll?: boolean
  // 더블탭 좋아요 지원
  onDoubleClick?: () => void
  onSingleClick?: () => void
  // 프레임 비율: 레시피 4:3, 레시피드 1:1 (DESIGN.md Interface Grammar)
  frame?: "recipe" | "recipeed"
}

export default function ImageCarousel({ 
  images, 
  alt, 
  priority = false, 
  discoverAll = false,
  onDoubleClick, 
  onSingleClick,
  frame = "recipeed",
}: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel()
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  // 수평 캐러셀의 숨은 사진까지 브라우저가 초기 lazy-load 임계 안에서 받는 일을 막는다.
  // 프레임은 전부 유지하고, 첫 사진 외에는 실제로 보려는 순간에만 DOM에 넣는다.
  const [loadedIndexes, setLoadedIndexes] = React.useState<Set<number>>(() => new Set([0]))

  const ensureLoaded = React.useCallback((index: number) => {
    setLoadedIndexes((current) => {
      if (current.has(index)) return current
      const next = new Set(current)
      next.add(index)
      return next
    })
  }, [])

  const preloadAdjacent = React.useCallback(() => {
    if (selectedIndex > 0) ensureLoaded(selectedIndex - 1)
    if (selectedIndex + 1 < images.length) ensureLoaded(selectedIndex + 1)
  }, [ensureLoaded, images.length, selectedIndex])
  
  // 토스식 더블탭 좋아요 상태 관리
  const [clickTimer, setClickTimer] = React.useState<NodeJS.Timeout | null>(null)
  const [isTouching, setIsTouching] = React.useState(false)

  React.useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap()
      setSelectedIndex(index)
      ensureLoaded(index)
    }

    emblaApi.on("select", onSelect)
    onSelect() // Set initial state

    return () => {
      emblaApi.off("select", onSelect)
    }
  }, [emblaApi, ensureLoaded])
  
  // 컴포넌트 언마운트 시 타이머 정리
  React.useEffect(() => {
    return () => {
      if (clickTimer) {
        clearTimeout(clickTimer)
      }
    }
  }, [clickTimer])

  // 토스식 더블탭 핸들러 (프로필 그리드와 동일한 로직)
  const handleImageClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // 기존 타이머가 있으면 더블클릭으로 처리
    if (clickTimer) {
      clearTimeout(clickTimer)
      setClickTimer(null)
      
      // 더블클릭 - 좋아요 처리
      if (onDoubleClick) {
        onDoubleClick()
        
        // 햅틱 피드백 (모바일에서)
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      }
    } else {
      // 단일클릭 - 300ms 후 처리
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
    <div className="relative w-full overflow-hidden" ref={emblaRef} onPointerDown={preloadAdjacent}>
      <div className="flex">
        {images.map((src, index) => (
          <div className={cn("relative w-full flex-none bg-muted", frame === "recipe" ? "aspect-[4/3]" : "aspect-square")} key={index}>
            {(discoverAll || loadedIndexes.has(index)) && (
              <Photo
                src={src}
                alt={`${alt} ${index + 1}`}
                sizes="(max-width: 448px) 100vw, 448px"
                priority={priority && index === 0}
                fetchPriority={index === 0 ? (priority ? "high" : "auto") : "low"}
              />
            )}
            
            {/* 더블탭 좋아요 오버레이 (선택적) */}
            {(onDoubleClick || onSingleClick) && (
              <>
                {/* 터치 시 어두운 오버레이 */}
                {isTouching && (
                  <div className="absolute inset-0 bg-ink/10 z-10" />
                )}
                
                {/* 토스 철학: 스마트 클릭 처리 */}
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
      {/* 여러 장이면 몇 번째 사진인지와 전체 장수를 오른쪽 위에 둔다 */}
      {images.length > 1 && (
        <span aria-live="polite" className="absolute right-2.5 top-2.5 z-30 rounded-full bg-ink/70 px-2 py-0.5 text-meta font-semibold tabular-nums text-paper">
          {selectedIndex + 1}/{images.length}
          <span className="sr-only">번째 사진</span>
        </span>
      )}
      {images.length > 1 && <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              ensureLoaded(index)
              emblaApi?.scrollTo(index)
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full"
            aria-label={`${index + 1}번째 사진 보기`}
          >
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-300",
                selectedIndex === index ? "bg-paper scale-125 shadow-[0_0_0_1px_rgb(var(--ink)/0.25)]" : "bg-paper/60 shadow-[0_0_0_1px_rgb(var(--ink)/0.2)]"
              )}
            />
          </button>
        ))}
      </div>}
    </div>
  )
}