"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { OptimizedImage } from "@/shared/infra/image-utils"
import {
  deleteComposerDraft, packImage, readComposerDraft, unpackImage, writeComposerDraft,
  type ComposerDraft,
} from "@/shared/infra/composer-draft"

interface Snapshot<T> {
  values: T
  mainImages: OptimizedImage[]
  instructionImages?: (OptimizedImage | null)[]
  thumbnailIndex: number
}

type Status = "idle" | "pending" | "saved" | "error"

export function useComposerDraft<T>({
  key, subscribe, snapshot, restore,
}: {
  key: string
  subscribe: (onChange: () => void) => () => void
  snapshot: () => Snapshot<T>
  restore: (draft: Snapshot<T>) => void
}) {
  const latest = useRef(snapshot)
  const currentKey = useRef(key)
  const restorer = useRef(restore)
  const subscriber = useRef(subscribe)
  useEffect(() => {
    latest.current = snapshot
    currentKey.current = key
    restorer.current = restore
    subscriber.current = subscribe
  })
  const [recovery, setRecovery] = useState<ComposerDraft<T> | null>(null)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const baseline = useRef("")
  const lastSaved = useRef("")
  const canSave = useRef(false)
  const disposed = useRef(false)
  const pending = useRef<Promise<void>>(Promise.resolve())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const signature = useCallback((state: Snapshot<T>) => JSON.stringify(state, (_k, value) => {
    if (typeof File !== "undefined" && value instanceof File) {
      return { name: value.name, size: value.size, modified: value.lastModified }
    }
    return value
  }), [])

  const saveNow = useCallback((): Promise<void> => {
    if (!canSave.current || disposed.current) return Promise.resolve()
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const state = latest.current()
    const current = signature(state)
    if (current === lastSaved.current) return pending.current
    if (current === baseline.current && !lastSaved.current) return pending.current
    const draft: ComposerDraft<T> = {
      values: state.values,
      mainImages: state.mainImages.map(packImage),
      instructionImages: (state.instructionImages ?? []).map((image) => image ? packImage(image) : null),
      thumbnailIndex: state.thumbnailIndex,
      savedAt: Date.now(),
    }
    setStatus("pending")
    const write = pending.current.catch(() => {}).then(() => writeComposerDraft(key, draft))
    pending.current = write
    void write.then(() => {
      lastSaved.current = current
      if (!disposed.current && signature(latest.current()) === current) setStatus("saved")
    }).catch(() => {
      if (!disposed.current) setStatus("error")
    })
    return write
  }, [key, signature])

  const scheduleSave = useCallback(() => {
    if (!canSave.current || disposed.current) return
    const current = signature(latest.current())
    if (current === lastSaved.current || (current === baseline.current && !lastSaved.current)) return
    setStatus("pending")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void saveNow().catch(() => {}) }, 650)
  }, [saveNow, signature])

  useEffect(() => {
    let active = true
    disposed.current = false
    canSave.current = false
    lastSaved.current = ""
    // 키가 바뀔 때 초기화는 microtask로 실행해 렌더 중첩을 피한다.
    void Promise.resolve().then(() => {
      if (!active) return
      setReady(false)
      setRecovery(null)
      setStatus("idle")
    })
    void readComposerDraft<T>(key).then((existing) => {
      if (!active) return
      baseline.current = signature(latest.current())
      if (existing) setRecovery(existing)
      else { canSave.current = true; setReady(true) }
    }).catch(() => {
      if (!active) return
      baseline.current = signature(latest.current())
      canSave.current = true
      setReady(true)
      setStatus("error")
    })
    return () => {
      active = false
      // 페이지가 이동될 때도 보류 중인 저장을 최대한 실행한다.
      if (canSave.current && currentKey.current === key) void saveNow().catch(() => {})
      disposed.current = true
      canSave.current = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [key, signature, saveNow])

  useEffect(() => {
    return subscriber.current(scheduleSave)
  }, [scheduleSave])

  // 사진은 RHF 밖의 state이므로 호출자가 배열 변경 시 이 함수를 호출한다.
  const restorePrevious = useCallback(() => {
    if (!recovery) return
    canSave.current = false
    const state: Snapshot<T> = {
      values: recovery.values,
      mainImages: recovery.mainImages.map(unpackImage),
      instructionImages: recovery.instructionImages.map((image) => image ? unpackImage(image) : null),
      thumbnailIndex: recovery.thumbnailIndex,
    }
    restorer.current(state)
    baseline.current = signature(latest.current())
    lastSaved.current = ""
    setRecovery(null)
    canSave.current = true
    setReady(true)
  }, [recovery, signature])

  const startFresh = useCallback(async () => {
    if (!recovery) return
    try {
      await deleteComposerDraft(key)
    } catch {
      setStatus("error")
      return
    }
    baseline.current = signature(latest.current())
    lastSaved.current = ""
    setRecovery(null)
    canSave.current = true
    setReady(true)
  }, [key, recovery, signature])

  const finishPublish = useCallback(async () => {
    canSave.current = false
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    await pending.current.catch(() => {})
    try {
      await deleteComposerDraft(key)
    } catch {
      // 발행은 이미 성공했다. 불필요한 복원 안내만 남길 수 있으므로 보고한다.
      setStatus("error")
    }
  }, [key])

  const leave = useCallback(async (navigate: () => void) => {
    if (!ready) return
    const hasChanges = signature(latest.current()) !== baseline.current
    if (hasChanges && !window.confirm("작성 중인 내용을 이 기기에 보관하고 나갈까요?")) return
    if (hasChanges) {
      try { await saveNow() } catch { setStatus("error"); return }
    }
    navigate()
  }, [ready, saveNow, signature])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void saveNow().catch(() => {})
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const current = signature(latest.current())
      if (canSave.current && current !== baseline.current && current !== lastSaved.current) {
        void saveNow().catch(() => {})
        event.preventDefault()
        event.returnValue = ""
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("beforeunload", onBeforeUnload)
    }
  }, [saveNow, signature])

  return { ready, recovery, status, scheduleSave, restorePrevious, startFresh, finishPublish, leave }
}
