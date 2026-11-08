"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { X } from "lucide-react"

// Only show a real update when an existing installation receives a newer
// service worker. Never interrupt an editing screen or drop a local draft.
function isComposing(pathname: string) {
  return /^\/(?:recipes|posts)\/new\/?$/.test(pathname)
    || /^\/(?:recipes|posts)\/[^/]+\/edit\/?$/.test(pathname)
}

export default function ServiceWorkerUpdater() {
  const [available, setAvailable] = useState(false)
  const [message, setMessage] = useState("")
  const registration = useRef<ServiceWorkerRegistration | null>(null)
  const refreshRequested = useRef(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    let active = true
    const hadController = Boolean(navigator.serviceWorker.controller)
    let newWorker: ServiceWorker | null = null
    let removeListeners = () => {}

    const prompt = () => {
      if (active && hadController) setAvailable(true)
    }
    const stateChanged = () => {
      if (newWorker?.state === "installed") prompt()
    }
    const updateFound = () => {
      if (newWorker) newWorker.removeEventListener("statechange", stateChanged)
      newWorker = registration.current?.installing ?? null
      newWorker?.addEventListener("statechange", stateChanged)
      stateChanged()
    }
    const controllerChanged = () => {
      if (!hadController) return
      if (refreshRequested.current && !isComposing(window.location.pathname)) {
        window.location.reload()
      } else if (active) {
        setAvailable(true)
      }
    }
    const visibilityChanged = () => {
      // Background refresh is allowed only outside a composer; never refresh
      // as a side effect of opening an OS photo/camera chooser.
      if (document.visibilityState === "hidden" && refreshRequested.current && !isComposing(window.location.pathname)) {
        window.location.reload()
      }
    }
    navigator.serviceWorker.addEventListener("controllerchange", controllerChanged)
    document.addEventListener("visibilitychange", visibilityChanged)
    void navigator.serviceWorker.ready.then((reg) => {
      if (!active) return
      registration.current = reg
      if (reg.waiting && hadController) prompt()
      reg.addEventListener("updatefound", updateFound)
      updateFound()
      removeListeners = () => {
        reg.removeEventListener("updatefound", updateFound)
        newWorker?.removeEventListener("statechange", stateChanged)
      }
    }).catch(() => {})
    return () => {
      active = false
      removeListeners()
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChanged)
      document.removeEventListener("visibilitychange", visibilityChanged)
    }
  }, [])

  const refresh = () => {
    if (isComposing(window.location.pathname)) {
      setMessage("작성 중인 내용을 먼저 저장하고 이 화면을 나간 뒤 새로고침해 주세요.")
      return
    }
    refreshRequested.current = true
    const waiting = registration.current?.waiting
    if (waiting) waiting.postMessage({ type: "SKIP_WAITING" })
    else window.location.reload()
  }

  const changeOpen = (open: boolean) => {
    setAvailable(open)
    if (!open) setMessage("")
  }

  return (
    <Drawer open={available} onOpenChange={changeOpen} shouldScaleBackground={false}>
      <DrawerContent placement="floating" className="px-[18px] pb-5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <DrawerTitle className="text-title text-ink">새로운 버전이 있어요</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" type="button" aria-label="닫기">
              <X className="h-5 w-5" aria-hidden />
            </Button>
          </DrawerClose>
        </div>
        <DrawerDescription className="mt-5 text-label leading-relaxed text-ink-soft">
          새로고침하면 바뀐 내용을 볼 수 있어요. 작성 중인 내용이 있다면 먼저 저장해 주세요.
        </DrawerDescription>
        {message && <p role="alert" className="mt-3 text-meta text-destructive">{message}</p>}
        <div className="mt-8 flex gap-2">
          <DrawerClose asChild>
            <Button type="button" variant="outline" size="lg" className="flex-1 border-primary/60">나중에</Button>
          </DrawerClose>
          <Button type="button" size="lg" className="flex-1" onClick={refresh}>새로고침</Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
