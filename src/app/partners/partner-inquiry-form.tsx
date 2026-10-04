"use client"

import { useState, type FormEvent } from "react"
import { Check, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Segment = "creator" | "brand"

type GtagWindow = Window & {
  gtag?: (
    command: "event",
    eventName: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) => void
}

type PartnerInquiryFormProps = {
  segment: Segment
}

export default function PartnerInquiryForm({ segment }: PartnerInquiryFormProps) {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [error, setError] = useState("")

  const creator = segment === "creator"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === "sending") return

    const form = event.currentTarget
    const data = new FormData(form)

    setState("sending")
    setError("")

    try {
      const response = await fetch("/api/partner-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment,
          name: data.get("name"),
          email: data.get("email"),
          organization: data.get("organization"),
          profileUrl: data.get("profileUrl"),
          message: data.get("message"),
          website: data.get("website"),
          sourcePath: window.location.pathname,
        }),
      })

      const result = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(result?.error || "문의를 접수하지 못했습니다.")
      }

      ;(window as GtagWindow).gtag?.("event", "partner_action", {
        partner_segment: segment,
        partner_action: "inquiry_submit",
      })

      form.reset()
      setState("success")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "문의를 접수하지 못했습니다.")
      setState("error")
    }
  }

  if (state === "success") {
    return (
      <div className="border-y border-border py-5" role="status">
        <div className="flex items-center gap-2 text-label text-ink">
          <Check className="h-5 w-5 text-orange-ink" aria-hidden />
          문의가 접수됐습니다.
        </div>
        <p className="mt-2 text-meta text-ink-soft">
          내용을 확인한 뒤 답변이 필요한 경우 입력한 이메일로 연락드리겠습니다.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <div>
        <label htmlFor={segment + "-name"} className="text-label text-ink">
          {creator ? "이름 또는 활동명" : "담당자 이름"}
        </label>
        <Input
          id={segment + "-name"}
          name="name"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor={segment + "-email"} className="text-label text-ink">
          답변 받을 이메일
        </label>
        <Input
          id={segment + "-email"}
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor={segment + "-organization"} className="text-label text-ink">
          {creator ? "채널명 · 활동 플랫폼" : "브랜드 · 회사명"}
        </label>
        <Input
          id={segment + "-organization"}
          name="organization"
          maxLength={120}
          placeholder={creator ? "예: 유튜브 / 인스타그램" : "예: 브랜드 또는 제품군"}
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor={segment + "-profile-url"} className="text-label text-ink">
          {creator ? "채널 · 프로필 URL" : "브랜드 · 제품 URL"} <span className="font-normal text-ink-soft">(선택)</span>
        </label>
        <Input
          id={segment + "-profile-url"}
          name="profileUrl"
          type="url"
          maxLength={500}
          inputMode="url"
          placeholder="https://"
          className="mt-1.5"
        />
      </div>

      <div>
        <label htmlFor={segment + "-message"} className="text-label text-ink">
          {creator ? "같이 확인해보고 싶은 것" : "검증해보고 싶은 제품 · Recipe 맥락"}
        </label>
        <Textarea
          id={segment + "-message"}
          name="message"
          required
          minLength={10}
          maxLength={1500}
          className="mt-1.5 min-h-28"
          placeholder={
            creator
              ? "예: 기존 Recipe 2~3개로 실제 조리 기록과 파생 관계가 어떻게 연결되는지 보고 싶습니다."
              : "예: 특정 팬 제품이 실제 Recipe와 사용자 조리 경험으로 이어지는 파일럿을 검토하고 싶습니다."
          }
        />
      </div>

      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor={segment + "-website"}>Website</label>
        <input id={segment + "-website"} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {state === "error" && (
        <p className="text-meta text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? "접수 중..." : creator ? "크리에이터 파일럿 문의 보내기" : "브랜드 파일럿 문의 보내기"}
        {state !== "sending" && <Send className="h-4 w-4" aria-hidden />}
      </Button>
      <p className="text-center text-meta text-ink-soft">
        입력한 정보는 파트너 문의 답변과 후속 협의에만 사용합니다.{" "}
        <a href="/legal/privacy" className="underline underline-offset-2">
          개인정보처리방침
        </a>
      </p>
    </form>
  )
}
