"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import LoginPromptSheet from "@/components/auth/LoginPromptSheet"
import { useToast } from "@/hooks/use-toast"
import { createSupabaseBrowserClient } from "@/shared/infra/supabase-client"
import { castItemPollVote, fetchItemPoll, type ItemPollSnapshot } from "@/features/recipe/domain/item-poll"

interface ItemPollProps {
  itemId: string
  currentUserId: string | null
  initialPoll?: ItemPollSnapshot | null
  isPublic: boolean
  onAvailabilityChange?: (available: boolean) => void
}

/** Same poll presentation for recipes and recipeeds. Counts come only from the server. */
export default function ItemPoll({ itemId, currentUserId, initialPoll, isPublic, onAvailabilityChange }: ItemPollProps) {
  const [choice, setChoice] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [loginPrompt, setLoginPrompt] = useState(false)
  const lock = useRef(false)
  const { toast } = useToast()

  const { data, error, isLoading, mutate } = useSWR<ItemPollSnapshot | null>(
    itemId ? `itemPoll|${itemId}|${currentUserId ?? "guest"}` : null,
    () => fetchItemPoll(createSupabaseBrowserClient(), itemId),
    { fallbackData: initialPoll, revalidateOnFocus: false, dedupingInterval: 10000 }
  )

  useEffect(() => {
    if (!isLoading || initialPoll) onAvailabilityChange?.(!error && Boolean(data?.active))
  }, [data, error, initialPoll, isLoading, onAvailabilityChange])

  if (error || !data?.active) return null
  const hasVoted = data.selectedIndex !== null
  const showResults = hasVoted && !editing
  const selected = choice ?? data.selectedIndex

  const submit = async () => {
    if (selected === null || pending || lock.current || !isPublic) return
    if (!currentUserId) {
      setLoginPrompt(true)
      return
    }
    if (data.selectedIndex === selected) {
      setEditing(false)
      return
    }

    lock.current = true
    setPending(true)
    try {
      const updated = await castItemPollVote(createSupabaseBrowserClient(), itemId, selected)
      await mutate(updated, false)
      setEditing(false)
      setChoice(null)
    } catch (cause) {
      console.error("Item poll vote failed", cause)
      toast({ title: "투표를 저장하지 못했어요.", description: "연결 상태를 확인한 뒤 다시 시도해 주세요.", variant: "destructive" })
    } finally {
      lock.current = false
      setPending(false)
    }
  }

  return (
    <section aria-label="투표" className="mt-5 border-y border-border py-5">
      <p className="text-meta font-semibold text-ink-soft">투표</p>
      <h2 className="mt-1 text-heading font-semibold leading-7 text-ink">{data.question}</h2>
      {showResults ? (
        <div className="mt-4 space-y-3" aria-live="polite">
          {data.options.map((label, index) => {
            const percent = data.total === 0 ? 0 : Math.round((data.counts[index] / data.total) * 100)
            return (
              <div key={index}>
                <div className="flex justify-between gap-3 text-label">
                  <span className={data.selectedIndex === index ? "font-semibold text-ink" : "text-ink-soft"}>
                    {data.selectedIndex === index ? "✓ " : ""}{label}
                  </span>
                  <span className="shrink-0 tabular-nums text-ink">{percent}%</span>
                </div>
                <div aria-hidden className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-orange-ink transition-[width] duration-200" style={{ width: `${percent}%` }} />
                </div>
              </div>
            )
          })}
          <p className="text-meta tabular-nums text-ink-soft">실제 참여 {data.total.toLocaleString("ko-KR")}명</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="min-h-11 text-label font-medium text-ink underline underline-offset-4" onClick={() => { setChoice(data.selectedIndex); setEditing(true) }}>
              선택 바꾸기
            </button>
            <a className="inline-flex min-h-11 items-center text-label text-ink-soft underline underline-offset-4" href="#comments">
              선택한 이유를 댓글로 남기기
            </a>
          </div>
        </div>
      ) : (
        <>
          <fieldset className="mt-4 space-y-2" disabled={pending || !isPublic}>
            <legend className="sr-only">{data.question}</legend>
            {data.options.map((label, index) => (
              <label key={index} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 has-[:checked]:border-ink">
                <input
                  type="radio"
                  name={`item-poll-${itemId}`}
                  value={index}
                  checked={selected === index}
                  onChange={() => setChoice(index)}
                  className="h-4 w-4 accent-orange-ink"
                />
                <span className="text-label text-ink">{label}</span>
              </label>
            ))}
          </fieldset>
          {isPublic ? (
            <>
              <Button className="mt-3 min-h-11 w-full" disabled={selected === null || pending} onClick={submit}>
                {pending ? "투표를 저장하고 있어요" : hasVoted ? "선택 변경하기" : "투표하기"}
              </Button>
              {!currentUserId && <p className="mt-2 text-meta text-ink-soft">투표하려면 로그인이 필요해요.</p>}
            </>
          ) : <p className="mt-3 text-meta text-ink-soft">비공개 글에서는 투표할 수 없어요.</p>}
        </>
      )}
      <LoginPromptSheet isOpen={loginPrompt} onClose={() => setLoginPrompt(false)} action="poll" />
    </section>
  )
}
