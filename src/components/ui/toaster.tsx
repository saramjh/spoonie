"use client"

import {
  Toast, 
  ToastClose, 
  ToastDescription, 
  ToastProvider, 
  ToastTitle, 
  ToastViewport
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="flex-1 grid gap-1 pr-8">
              {title && (
                <ToastTitle>
                  {/* 아이콘만으로 의미를 전달하지 않도록 스크린리더 설명을 제공한다. */}
                  <span className="sr-only">알림: </span>
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose aria-label="알림 닫기" />
          </Toast>
        )
      })}
      <ToastViewport 
        aria-label="알림 영역" 
        aria-live="polite" 
        aria-atomic="false"
      />
    </ToastProvider>
  )
}
