"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      // 🎨 토스식 모바일 퍼스트 디자인: 일관된 상단 배치
      "fixed top-4 left-4 right-4 z-[100] flex max-h-screen flex-col gap-2 md:left-auto md:right-4 md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  // 🎨 토스식 디자인: 간결하고 모던한 스타일링
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-3 overflow-hidden rounded-xl border backdrop-blur-sm p-4 pr-6 shadow-2xl transition-all duration-300 data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full active:scale-[0.98] hover:shadow-3xl",
  {
    variants: {
    variant: {
      default: "border-border/50 bg-paper/90 text-ink shadow-gray-900/10",
      destructive: "border-red-200/50 bg-red-50/90 text-red-900 shadow-red-900/10",
      success: "border-green-200/50 bg-green-50/90 text-green-900 shadow-green-900/10",
      warning: "border-yellow-200/50 bg-yellow-50/90 text-yellow-900 shadow-yellow-900/10",
    }
  },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), "cursor-pointer", className)}
      onClick={(e) => {
        // 🎯 토스식 터치 상호작용: 토스트 영역 클릭으로 닫기
        const target = e.target as HTMLElement
        const isCloseButton = target.closest('[toast-close]')
        const isActionButton = target.closest('[data-radix-toast-action]')
        
        // X 버튼이나 액션 버튼이 아닌 경우에만 토스트 닫기
        if (!isCloseButton && !isActionButton) {
          props.onOpenChange?.(false)
        }
      }}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      // 🎨 토스식 닫기 버튼: 부드럽고 접근 가능한 디자인
      "absolute right-3 top-3 rounded-full p-1.5 text-ink-soft opacity-80 transition-all duration-200 hover:text-ink-soft hover:bg-muted/50 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 active:scale-95 group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn(
      // 🎨 토스식 타이틀: 명확하고 읽기 쉬운 폰트
      "text-sm font-semibold leading-5 tracking-tight",
      className
    )}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn(
      // 🎨 토스식 설명: 적절한 대비와 간격
      "text-sm leading-5 opacity-85 mt-1",
      className
    )}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
