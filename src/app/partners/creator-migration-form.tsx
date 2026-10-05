"use client"

import { useState, type FormEvent } from "react"
import { Check, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type GtagWindow = Window & {
  gtag?: (
    command: "event",
    eventName: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) => void
}

export default function CreatorMigrationForm() {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [error, setError] = useState("")
  const [rightsConfirmed, setRightsConfirmed] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === "sending") return

    const form = event.currentTarget
    const data = new FormData(form)
    const instagramUrls = String(data.get("instagramUrls") || "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)

    if (instagramUrls.length < 1 || instagramUrls.length > 5) {
      setError("Instagram 게시물·릴스 주소를 한 줄에 하나씩 1~5개 입력해 주세요.")
      setState("error")
      return
    }

    if (!rightsConfirmed) {
      setError("선택한 콘텐츠를 이전용 초안으로 정리할 권한과 동의를 확인해 주세요.")
      setState("error")
      return
    }

    setState("sending")
    setError("")

    try {
      const response = await fetch("/api/creator-migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          instagramUrls,
          note: data.get("note"),
          rightsConfirmed,
          website: data.get("website"),
          sourcePath: window.location.pathname,
        }),
      })

      const result = (await response.json().catch(() => null)) as
        | { error?: string; requestId?: string }
        | null

      if (!response.ok) {
        throw new Error(result?.error || "이전 요청을 접수하지 못했습니다.")
      }

      ;(window as GtagWindow).gtag?.("event", "partner_action", {
        partner_segment: "creator",
        partner_action: "migration_request_submit",
        migration_post_count: instagramUrls.length,
      })

      form.reset()
      setRightsConfirmed(false)
      setState("success")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "이전 요청을 접수하지 못했습니다.")
      setState("error")
    }
  }

  if (state === "success") {
    return (
      <div className="border-y border-border py-5" role="status">
        <div className="flex items-center gap-2 text-label text-ink">
          <Check className="h-5 w-5 text-orange-ink" aria-hidden />
          이전 요청이 접수됐습니다.
        </div>
        <p className="mt-2 text-meta text-ink-soft">
          제출한 게시물에서 확인되는 정보만 Recipe 초안으로 정리합니다. 공개하기 전에 입력한 이메일로 확인 방법을 안내드립니다.
        </p>
        <p className="mt-2 text-meta text-ink-soft">
          요청만으로 계정이나 Recipe가 자동 공개되지는 않습니다.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <div>
        <label htmlFor="migration-name" className="text-label text-ink">
          이름 또는 활동명
        </label>
        <Input
          id="migration-name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="migration-email" className="text-label text-ink">
          확인 받을 이메일
        </label>
        <Input
          id="migration-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor="migration-urls" className="text-label text-ink">
          옮길 Instagram 게시물 · 릴스 주소
        </label>
        <p className="mt-1 text-meta text-ink-soft">한 줄에 하나씩, 먼저 1~5개만 보내주세요.</p>
        <Textarea
          id="migration-urls"
          name="instagramUrls"
          required
          rows={5}
          className="mt-1.5 min-h-32 font-mono text-meta"
          placeholder={"https://www.instagram.com/p/.../\nhttps://www.instagram.com/reel/.../"}
        />
      </div>

      <div>
        <label htmlFor="migration-note" className="text-label text-ink">
          옮길 때 참고할 내용 <span className="font-normal text-ink-soft">(선택)</span>
        </label>
        <Textarea
          id="migration-note"
          name="note"
          maxLength={1000}
          className="mt-1.5 min-h-20"
          placeholder="예: 이 세 게시물을 대표 레시피로 먼저 정리하고 싶습니다."
        />
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 border-y border-border py-3">
        <input
          type="checkbox"
          checked={rightsConfirmed}
          onChange={(event) => setRightsConfirmed(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-paper text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-checked:border-ink peer-checked:bg-ink"
        >
          {rightsConfirmed && <Check className="h-3.5 w-3.5" />}
        </span>
        <span className="text-meta text-ink-soft">
          선택한 게시물의 사진·텍스트를 Spoonie에 게시할 권한이 있으며, 공개 전 검수용 Recipe 초안을 만드는 데 동의합니다.
        </span>
      </label>

      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="migration-website">Website</label>
        <input id="migration-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {state === "error" && (
        <p className="text-meta text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? "접수 중..." : "게시물 주소 보내기"}
        {state !== "sending" && <Send className="h-4 w-4" aria-hidden />}
      </Button>

      <p className="text-center text-meta text-ink-soft">
        이전 요청 처리와 확인 연락에만 사용합니다.{" "}
        <a href="/legal/privacy" className="underline underline-offset-2">
          개인정보처리방침
        </a>
      </p>
    </form>
  )
}
