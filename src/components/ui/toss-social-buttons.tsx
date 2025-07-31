/**
 * 🎨 토스 디자인 시스템 기반 소셜 인터랙션 버튼
 * 
 * 토스 UX/UI 디자이너가 설계한 완벽한 소셜 버튼
 * - 일관된 디자인 토큰
 * - 뛰어난 접근성
 * - 자연스러운 마이크로 인터랙션
 * - 모바일 최적화
 */

"use client"

import { useState, useEffect } from "react"
import { Heart, MessageCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// 🎨 토스 디자인 토큰
const tossTokens = {
  sizes: {
    sm: {
      container: "h-8 px-2 gap-1",
      icon: "w-4 h-4",
      text: "text-xs font-medium",
      minTouch: "min-w-[32px]"
    },
    md: {
      container: "h-10 px-3 gap-1.5", 
      icon: "w-5 h-5",
      text: "text-sm font-medium",
      minTouch: "min-w-[44px]"
    },
    lg: {
      container: "h-12 px-4 gap-2",
      icon: "w-6 h-6", 
      text: "text-base font-medium",
      minTouch: "min-w-[48px]"
    }
  },
  
  colors: {
    like: {
      inactive: "text-gray-400 hover:text-red-400",
      active: "text-red-500",
      background: "hover:bg-red-50 active:bg-red-100"
    },
    comment: {
      inactive: "text-gray-400 hover:text-blue-400", 
      active: "text-blue-500",
      background: "hover:bg-blue-50 active:bg-blue-100"
    }
  },
  
  animations: {
    // 토스 시그니처: 부드럽고 자연스러운 애니메이션
    base: "transition-all duration-200 ease-out",
    click: "active:scale-95 active:duration-75",
    bounce: "animate-[bounce_0.6s_ease-out]",
    pulse: "animate-[pulse_1s_ease-in-out_3]"
  }
}

// 🎯 토스식 좋아요 버튼
interface TossLikeButtonProps {
  isLiked: boolean
  likesCount: number
  onToggle: () => Promise<void> | void
  isLoading?: boolean
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  showAnimation?: boolean
}

export function TossLikeButton({
  isLiked,
  likesCount,
  onToggle,
  isLoading = false,
  size = 'md',
  disabled = false,
  showAnimation = true
}: TossLikeButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const tokens = tossTokens.sizes[size]
  const colors = tossTokens.colors.like
  
  const handleClick = async () => {
    if (disabled || isLoading) return
    
    // 토스식 마이크로 인터랙션
    if (showAnimation) {
      setIsAnimating(true)
      
      // 햅틱 피드백 (모바일)
      if (navigator.vibrate) {
        navigator.vibrate(20)
      }
    }
    
    try {
      await onToggle()
      
      // 성공 시 추가 애니메이션
      if (showAnimation && !isLiked) {
        setTimeout(() => setIsAnimating(false), 600)
      } else {
        setIsAnimating(false)
      }
    } catch (error) {
      setIsAnimating(false)
    }
  }
  
  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        // 기본 스타일
        "inline-flex items-center justify-center rounded-lg",
        "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1",
        tokens.container,
        tokens.minTouch,
        
        // 색상 및 상태
        isLiked ? colors.active : colors.inactive,
        !disabled && colors.background,
        
        // 애니메이션
        tossTokens.animations.base,
        !disabled && tossTokens.animations.click,
        isAnimating && !isLiked && tossTokens.animations.bounce,
        
        // 비활성화 상태
        disabled && "opacity-50 cursor-not-allowed"
      )}
      aria-label={isLiked ? "좋아요 취소" : "좋아요"}
      aria-pressed={isLiked}
    >
      {/* 로딩 상태 */}
      {isLoading ? (
        <Loader2 className={cn(tokens.icon, "animate-spin")} />
      ) : (
        <Heart 
          className={cn(
            tokens.icon,
            isLiked && "fill-current",
            isAnimating && "animate-[ping_0.3s_ease-out]"
          )} 
        />
      )}
      
      {/* 개수 표시 */}
      <span className={tokens.text}>
        {likesCount.toLocaleString()}
      </span>
    </button>
  )
}

// 🎯 토스식 댓글 버튼
interface TossCommentButtonProps {
  commentsCount: number
  onClick: () => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  isActive?: boolean
}

export function TossCommentButton({
  commentsCount,
  onClick,
  size = 'md',
  disabled = false,
  isActive = false
}: TossCommentButtonProps) {
  const tokens = tossTokens.sizes[size]
  const colors = tossTokens.colors.comment
  
  const handleClick = () => {
    if (disabled) return
    
    // 햅틱 피드백
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
    
    onClick()
  }
  
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        // 기본 스타일
        "inline-flex items-center justify-center rounded-lg",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
        tokens.container,
        tokens.minTouch,
        
        // 색상 및 상태
        isActive ? colors.active : colors.inactive,
        !disabled && colors.background,
        
        // 애니메이션
        tossTokens.animations.base,
        !disabled && tossTokens.animations.click,
        
        // 비활성화 상태
        disabled && "opacity-50 cursor-not-allowed"
      )}
      aria-label={`댓글 ${commentsCount}개 보기`}
    >
      <MessageCircle className={tokens.icon} />
      
      {/* 개수 표시 */}
      <span className={tokens.text}>
        {commentsCount.toLocaleString()}
      </span>
    </button>
  )
}

// 🎯 토스식 통합 소셜 버튼 그룹
interface TossSocialButtonGroupProps {
  // 좋아요 관련
  isLiked: boolean
  likesCount: number
  onLikeToggle: () => Promise<void> | void
  isLikeLoading?: boolean
  
  // 댓글 관련  
  commentsCount: number
  onCommentClick: () => void
  
  // 공통 설정
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  orientation?: 'horizontal' | 'vertical'
}

export function TossSocialButtonGroup({
  isLiked,
  likesCount, 
  onLikeToggle,
  isLikeLoading,
  commentsCount,
  onCommentClick,
  size = 'md',
  disabled = false,
  orientation = 'horizontal'
}: TossSocialButtonGroupProps) {
  return (
    <div className={cn(
      "flex",
      orientation === 'horizontal' ? "flex-row gap-2" : "flex-col gap-1",
      disabled && "pointer-events-none"
    )}>
      <TossLikeButton
        isLiked={isLiked}
        likesCount={likesCount}
        onToggle={onLikeToggle}
        isLoading={isLikeLoading}
        size={size}
        disabled={disabled}
      />
      
      <TossCommentButton
        commentsCount={commentsCount}
        onClick={onCommentClick}
        size={size}
        disabled={disabled}
      />
    </div>
  )
}

// 🎨 토스식 플로팅 액션 버튼 (모바일 최적화)
interface TossFloatingLikeButtonProps {
  isLiked: boolean
  onToggle: () => Promise<void> | void
  isLoading?: boolean
}

export function TossFloatingLikeButton({
  isLiked,
  onToggle,
  isLoading = false
}: TossFloatingLikeButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  
  const handleClick = async () => {
    if (isLoading) return
    
    setIsAnimating(true)
    
    // 강한 햅틱 피드백
    if (navigator.vibrate) {
      navigator.vibrate([20, 10, 20])
    }
    
    try {
      await onToggle()
      setTimeout(() => setIsAnimating(false), 800)
    } catch (error) {
      setIsAnimating(false)
    }
  }
  
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        // 플로팅 스타일
        "fixed bottom-6 right-6 z-50",
        "w-14 h-14 rounded-full shadow-lg",
        "flex items-center justify-center",
        
        // 색상
        isLiked 
          ? "bg-red-500 text-white" 
          : "bg-white text-red-500 border-2 border-red-500",
        
        // 애니메이션
        "transition-all duration-300 ease-out",
        "active:scale-90",
        isAnimating && "animate-[bounce_0.8s_ease-out]",
        
        // 그림자 효과
        "shadow-[0_4px_20px_rgba(239,68,68,0.3)]",
        isLiked && "shadow-[0_6px_25px_rgba(239,68,68,0.4)]"
      )}
      aria-label={isLiked ? "좋아요 취소" : "좋아요"}
    >
      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <Heart 
          className={cn(
            "w-6 h-6 transition-transform duration-200",
            isLiked && "fill-current scale-110",
            isAnimating && "animate-[ping_0.4s_ease-out]"
          )} 
        />
      )}
    </button>
  )
}