"use client"
import { useState } from "react"

const url = "https://spoonie.kr/early-cooks?utm_source=member_share&utm_medium=referral&utm_campaign=sco_early_member_v2&utm_content=invite_homecook"
type W = Window & { gtag?: (command: "event", name: string, params: Record<string, string>) => void }

export default function InviteAnotherCook() {
  const [message, setMessage] = useState("")
  const [manual, setManual] = useState(false)
  function track(outcome: string) {
    ;(window as W).gtag?.("event", "early_cook_share", { outcome, campaign: "sco_early_member_v2" })
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      track("copied")
      setMessage("초대 링크를 복사했습니다.")
    } catch {
      track("manual_copy")
      setManual(true)
      setMessage("아래 주소를 선택해 복사하세요.")
    }
  }
  async function share() {
    track("attempt")
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Spoonie에서 첫 요리 기록을 남겨볼래?",
          text: "따라 만든 요리도 원본 레시피와 연결해 기록하는 새로운 요리 SNS야.",
          url,
        })
        track("share_dialog_closed")
        setMessage("공유 창을 닫았습니다. 실제 전달 여부는 확인되지 않습니다.")
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          track("cancelled")
          return
        }
      }
    }
    await copy()
  }
  return (
    <section className="border-t border-border py-7" aria-labelledby="invite-title">
      <h2 id="invite-title" className="text-heading">요리하는 친구도 함께 기록한다면</h2>
      <p className="mt-3 text-read leading-relaxed">
        따라 만든 요리를 기록하고 싶은 친구에게 이 페이지를 직접 보내보세요.
        자동 메시지나 보상을 약속하는 초대는 아닙니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => { void share() }}
          className="min-h-12 rounded-md bg-ink px-5 py-3 text-label font-semibold text-paper">친구에게 공유하기</button>
        <button type="button" onClick={() => { track("attempt"); void copy() }}
          className="min-h-12 rounded-md border border-border px-5 py-3 text-label font-semibold text-ink">초대 링크 복사</button>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-meta text-ink-soft">{message}</p>
      {manual && (
        <label className="mt-3 block text-meta text-ink-soft">
          초대 링크
          <input readOnly value={url} onFocus={e => e.currentTarget.select()}
            className="mt-1 w-full rounded border border-border bg-paper px-3 py-2 text-label text-ink" />
        </label>
      )}
    </section>
  )
}
