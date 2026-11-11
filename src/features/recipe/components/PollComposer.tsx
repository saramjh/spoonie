"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { pollDraftSchema, type PollDraft } from "@/features/recipe/domain/item-poll"

const EMPTY: PollDraft = { question: "", options: ["", ""] }

interface PollComposerProps {
  value: PollDraft | null
  onChange: (value: PollDraft | null) => void
  saved: PollDraft | null
  voteCount: number
  disabled?: boolean
  error?: string
  showErrors?: boolean
  onRetry?: () => void
}

/** Optional, shared by the Recipe and Recipeed forms. Never edits an option that already has votes. */
export default function PollComposer({ value, onChange, saved, voteCount, disabled = false, error, showErrors = false, onRetry }: PollComposerProps) {
  const lastInput = useRef<PollDraft | null>(null)
  const active = value !== null
  const locked = voteCount > 0 && saved !== null
  const validation = active && showErrors ? pollDraftSchema.safeParse(value) : null
  const validationMessage = validation && !validation.success ? validation.error.issues[0]?.message : undefined
  const set = (next: PollDraft) => {
    lastInput.current = next
    onChange(next)
  }
  const toggle = () => {
    if (disabled) return
    if (active) {
      lastInput.current = value
      onChange(null)
    } else {
      onChange(saved && locked ? saved : lastInput.current ?? saved ?? { ...EMPTY, options: [...EMPTY.options] })
    }
  }

  return (
    <section aria-label="투표 추가" className="border-t border-border px-4 pb-5 pt-5">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div>
          <h2 className="text-label font-semibold text-ink">투표 <span className="font-normal text-ink-soft">(선택)</span></h2>
          <p className="mt-1 text-meta text-ink-soft">다른 사람들의 생각을 물어보세요.</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={toggle} disabled={disabled} aria-expanded={active}>
          {active ? "투표 빼기" : "투표 추가"}
        </Button>
      </div>
      {disabled && <p className="mt-2 text-meta text-ink-soft">기존 투표를 확인하고 있어요.</p>}
      {active && (
        <fieldset className="mt-4 space-y-3" disabled={disabled || locked}>
          <legend className="sr-only">투표 질문과 선택지</legend>
          <div>
            <Label htmlFor="poll-question">질문</Label>
            <Input id="poll-question" value={value.question} maxLength={160}
              placeholder="어떤 선택이 더 마음에 드시나요?"
              onChange={e => set({ ...value, question: e.target.value })} className="mt-1.5" />
          </div>
          {value.options.map((option,index) => (
            <div key={index}>
              <Label htmlFor={`poll-option-${index}`}>선택지 {index + 1}</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <Input id={`poll-option-${index}`} maxLength={80} value={option}
                  placeholder={`선택지 ${index + 1}`}
                  onChange={e => set({ ...value, options:value.options.map((text,i) => i === index ? e.target.value : text) })} />
                {value.options.length > 2 && (
                  <Button type="button" variant="ghost" size="sm" aria-label={`선택지 ${index+1} 삭제`}
                    onClick={() => set({ ...value, options:value.options.filter((_,i)=>i !== index) })}>
                    삭제
                  </Button>
                )}
              </div>
            </div>
          ))}
          {value.options.length < 4 && (
            <Button type="button" size="sm" variant="outline"
              onClick={() => set({ ...value, options:[...value.options, ""] })}>
              선택지 추가
            </Button>
          )}
          <p className="text-meta text-ink-soft">선택지는 2~4개, 한 사람당 한 표예요. 투표자는 나중에 선택을 바꿀 수 있어요.</p>
        </fieldset>
      )}
      {active && locked && <p className="mt-3 text-meta text-ink-soft">이미 {voteCount.toLocaleString("ko-KR")}명이 참여해 질문과 선택지는 수정할 수 없어요. 투표를 숨길 수는 있습니다.</p>}
      {(error || validationMessage) && (
        <p role="alert" className="mt-2 text-meta text-destructive">{error || validationMessage}</p>
      )}
      {disabled && error && onRetry && (
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          투표 정보 다시 불러오기
        </Button>
      )}
    </section>
  )
}
