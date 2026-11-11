"use client"

import { useEffect, useRef, type RefObject } from "react"
import useSWR from "swr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchItemPoll, type PollDraft } from "@/features/recipe/domain/item-poll"

/** One server-poll hydration path shared by Recipe and Recipeed editors. */
export function useItemPollEditor({
  itemId, supabase, draftReady, draftHasRecovery, pollRecovered, setPoll,
}: {
  itemId: string | null
  supabase: SupabaseClient
  draftReady: boolean
  draftHasRecovery: boolean
  pollRecovered: RefObject<boolean>
  setPoll: (value: PollDraft | null) => void
}) {
  const pollHydrated = useRef(false)
  const { data: savedPoll, error: pollLoadError, isLoading: pollLoading, mutate: reloadPoll } = useSWR(
    itemId ? "item-poll-edit:" + itemId : null,
    () => fetchItemPoll(supabase, itemId!),
    { revalidateOnFocus: false },
  )
  useEffect(() => {
    if (!itemId || !draftReady || draftHasRecovery || pollRecovered.current || pollHydrated.current ||
        savedPoll === undefined || pollLoadError) return
    pollHydrated.current = true
    setPoll(savedPoll?.active ? { question: savedPoll.question, options: [...savedPoll.options] } : null)
  }, [itemId, draftReady, draftHasRecovery, pollRecovered, savedPoll, pollLoadError, setPoll])

  return { savedPoll, pollLoadError, pollLoading, reloadPoll, pollHydrated }
}
