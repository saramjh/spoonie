"use client"

import { useEffect, useRef } from "react"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"

/**
 * 필터를 건 Supabase Realtime 구독. 조건에 맞는 행이 바뀔 때만 onChange를 호출한다.
 *
 * 서버 부담을 낮추는 원칙
 * - 반드시 filter로 범위를 좁힌다 (예: 내 알림, 지금 보고 있는 게시물의 댓글).
 * - 필요한 화면이 열려 있는 동안만 구독하고, 화면을 떠나면 채널을 닫는다.
 * - 이벤트 내용은 쓰지 않고 "다시 불러오라"는 신호로만 쓴다. 짧은 시간에 여러 번 와도 한 번만 갱신한다.
 */
export function useRealtimeRefresh(options: {
  channel: string
  table: "notifications" | "comments"
  filter: string | null
  events?: Array<"INSERT" | "UPDATE" | "DELETE">
  onChange: () => void
}) {
  const { channel, table, filter, events = ["INSERT"], onChange } = options
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const eventsKey = events.join(",")

  useEffect(() => {
    if (!filter) return
    const supabase = createSupabaseBrowserClient()
    let timer: ReturnType<typeof setTimeout> | undefined
    const scheduleRefresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => onChangeRef.current(), 300)
    }

    let subscription = supabase.channel(channel)
    for (const event of eventsKey.split(",")) {
      subscription = subscription.on(
        // @ts-expect-error - supabase-js의 postgres_changes 오버로드가 이벤트 문자열 변수를 좁히지 못한다
        "postgres_changes",
        { event, schema: "public", table, filter },
        scheduleRefresh
      )
    }
    subscription.subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(subscription)
    }
  }, [channel, table, filter, eventsKey])
}
