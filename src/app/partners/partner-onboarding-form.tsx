"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { OnboardingStatusRequest } from "@/features/onboarding/contracts"
import type { PartnerEntrySource } from "@/shared/lib/partner-entry"

type ActorType = "creator" | "brand"

type Props = {
  actorType: ActorType
  initialRequests: OnboardingStatusRequest[]
}

type SubmitState = "idle" | "sending" | "success" | "error"

const copy = {
  creator: {
    sourceLabel: "옮길 Instagram 게시물 · 릴스 주소",
    sourceHelp: "한 줄에 하나씩 1~5개. 지금은 Instagram 게시물과 릴스부터 받습니다.",
    sourcePlaceholder: "https://www.instagram.com/p/.../\nhttps://www.instagram.com/reel/.../",
    notePlaceholder: "예: 이 세 게시물을 대표 Recipe로 먼저 정리하고 싶습니다.",
    sourcePath: "/partners/creators" as const,
    entry: "partner_creator" as PartnerEntrySource,
  },
  brand: {
    sourceLabel: "초기 셋업에 쓸 제품 활용 자료 주소",
    sourceHelp:
      "자사몰 레시피·제품 활용 페이지·Instagram 게시물/릴스 등 1~5개를 한 줄에 하나씩 입력해 주세요.",
    sourcePlaceholder: "https://brand.example/recipes/...\nhttps://www.instagram.com/p/.../",
    notePlaceholder: "예: 이 소스를 먼저 대표 제품 활용 Recipe로 정리하고 싶습니다.",
    sourcePath: "/partners/brands" as const,
    entry: "partner_brand" as PartnerEntrySource,
  },
} as const

const processingLabels: Record<string, string> = {
  queued: "접수됨",
  fetching: "자료 확인 중",
  extracting: "내용 정리 중",
  validating: "검증 중",
  ready: "검수 가능",
  needs_creator_input: "확인 필요",
  failed: "재시도 대기",
  unsupported: "직접 확인 필요",
}

type GtagWindow = Window & {
  gtag?: (
    command: "event",
    eventName: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) => void
}

export default function PartnerOnboardingForm({ actorType, initialRequests }: Props) {
  const text = copy[actorType]
  const [state, setState] = useState<SubmitState>("idle")
  const [error, setError] = useState("")
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [requests, setRequests] = useState<OnboardingStatusRequest[]>(initialRequests)

  async function loadStatus() {
    const response = await fetch("/api/partner-onboarding", {
      credentials: "same-origin",
      cache: "no-store",
    })
    if (!response.ok) return
    const result = (await response.json().catch(() => null)) as
      | { requests?: OnboardingStatusRequest[] }
      | null
    setRequests(
      (result?.requests || []).filter((request) => request.actorType === actorType),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === "sending") return

    const form = event.currentTarget
    const data = new FormData(form)
    const sourceUrls = String(data.get("sourceUrls") || "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)

    if (sourceUrls.length < 1 || sourceUrls.length > 5) {
      setError("자료 주소를 한 줄에 하나씩 1~5개 입력해 주세요.")
      setState("error")
      return
    }

    if (!rightsConfirmed) {
      setError("제출한 자료를 Spoonie 초기 셋업에 사용할 권한을 확인해 주세요.")
      setState("error")
      return
    }

    setState("sending")
    setError("")

    try {
      const response = await fetch("/api/partner-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorType,
          sourceUrls,
          note: data.get("note"),
          rightsConfirmed,
          sourcePath: text.sourcePath,
        }),
      })

      const result = (await response.json().catch(() => null)) as
        | { error?: string; requestId?: string }
        | null

      if (!response.ok) {
        throw new Error(result?.error || "초기 셋업 요청을 접수하지 못했습니다.")
      }

      ;(window as GtagWindow).gtag?.("event", "partner_action", {
        partner_segment: actorType,
        partner_action: "account_owned_onboarding_submit",
        source_count: sourceUrls.length,
      })

      form.reset()
      setRightsConfirmed(false)
      setState("success")
      await loadStatus()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "초기 셋업 요청을 접수하지 못했습니다.",
      )
      setState("error")
    }
  }

  return (
    <div className="mt-5">
      {state === "success" ? (
        <div className="border-y border-border py-5" role="status">
          <div className="flex items-center gap-2 text-label text-ink">
            <Check className="h-5 w-5 text-orange-ink" aria-hidden />
            자료를 받았습니다.
          </div>
          <p className="mt-2 text-meta text-ink-soft">
            확인되는 정보만 Recipe 초안에 채웁니다. 빠진 내용은 직접 확인한 뒤 공개할 수 있습니다.
          </p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => setState("idle")}>
            자료 더 보내기
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={actorType + "-onboarding-sources"} className="text-label text-ink">
              {text.sourceLabel}
            </label>
            <p className="mt-1 text-meta text-ink-soft">{text.sourceHelp}</p>
            <Textarea
              id={actorType + "-onboarding-sources"}
              name="sourceUrls"
              required
              rows={5}
              className="mt-1.5 min-h-32 font-mono text-meta"
              placeholder={text.sourcePlaceholder}
            />
          </div>

          <div>
            <label htmlFor={actorType + "-onboarding-note"} className="text-label text-ink">
              정리할 때 참고할 내용 <span className="font-normal text-ink-soft">(선택)</span>
            </label>
            <Textarea
              id={actorType + "-onboarding-note"}
              name="note"
              maxLength={1000}
              className="mt-1.5 min-h-20"
              placeholder={text.notePlaceholder}
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
              제출한 사진·텍스트·페이지를 Spoonie의 본인 계정용 비공개 Recipe 초안으로 정리할
              권한이 있음을 확인합니다.
            </span>
          </label>

          {state === "error" && (
            <p className="text-meta text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={state === "sending"}>
            {state === "sending" ? "보내는 중..." : "Recipe 초안 만들기"}
          </Button>

          <p className="text-center text-meta text-ink-soft">
            초안은 현재 로그인한 계정에만 연결됩니다.{" "}
            <a href="/legal/privacy" className="underline underline-offset-2">
              개인정보처리방침
            </a>
          </p>
        </form>
      )}

      {requests.length > 0 && (
        <section className="mt-6 border-t border-border pt-4" aria-labelledby={actorType + "-setup-status"}>
          <h3 id={actorType + "-setup-status"} className="text-label font-medium text-ink">
            내 초기 셋업
          </h3>
          <div className="mt-2">
            {requests.flatMap((request) =>
              request.sources.map((source) => {
                const draft = source.draft
                const label = processingLabels[source.processingStatus] || "확인 중"
                const target = draft?.itemId
                  ? "/recipes/" + draft.itemId
                  : draft
                    ? "/recipes/new?onboarding=" +
                      encodeURIComponent(draft.id) +
                      "&entry=" +
                      encodeURIComponent(text.entry)
                    : null

                return (
                  <div
                    key={source.id}
                    className="flex min-h-14 items-center justify-between gap-3 border-b border-border py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-meta text-ink">{source.sourceUrl}</p>
                      <p className="mt-0.5 text-meta text-ink-soft">{label}</p>
                    </div>
                    {target && (
                      <Link
                        href={target}
                        className="shrink-0 text-label font-medium text-ink underline underline-offset-4"
                      >
                        {draft?.itemId ? "Recipe 보기" : "검수하기"}
                      </Link>
                    )}
                  </div>
                )
              }),
            )}
          </div>
        </section>
      )}
    </div>
  )
}
