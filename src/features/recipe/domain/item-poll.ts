import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"

/** One optional poll per Recipe or Recipeed. The same payload powers both editors. */
export const pollDraftSchema = z.object({
  question: z.string().trim().min(8, "질문을 8자 이상 적어주세요.").max(160, "질문은 160자 이하로 입력해 주세요."),
  options: z.array(z.string().trim().min(2, "선택지를 2자 이상 적어주세요.").max(80, "선택지는 80자 이하로 입력해 주세요."))
    .min(2, "선택지는 최소 2개 필요해요.")
    .max(4, "선택지는 최대 4개까지 가능해요."),
}).refine(v => new Set(v.options.map(x => x.toLocaleLowerCase("ko-KR"))).size === v.options.length, {
  message: "같은 선택지는 한 번만 입력해 주세요.",
  path: ["options"],
})

export type PollDraft = z.infer<typeof pollDraftSchema>
export type PollSaveAction = "keep" | "set" | "disable"

export interface ItemPollSnapshot extends PollDraft {
  itemId: string
  counts: number[]
  total: number
  selectedIndex: number | null
  active: boolean
}

export function readItemPollSnapshot(input: unknown): ItemPollSnapshot | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  const v = input as Record<string, unknown>
  const check = pollDraftSchema.safeParse({ question: v.question, options: v.options })
  if (typeof v.item_id !== "string" || !check.success ||
      !Array.isArray(v.counts) || v.counts.length !== check.data.options.length ||
      v.counts.some(n => !Number.isSafeInteger(n) || n < 0) ||
      !Number.isSafeInteger(v.total) || (v.total as number) < 0 ||
      (v.counts as number[]).reduce((a,b) => a+b,0) !== v.total ||
      typeof v.active !== "boolean" ||
      (v.selected_index !== null && (
        !Number.isInteger(v.selected_index) || (v.selected_index as number) < 0 ||
        (v.selected_index as number) >= check.data.options.length
      ))) return null
  return {
    ...check.data,
    itemId: v.item_id,
    counts: [...v.counts],
    total: v.total as number,
    selectedIndex: v.selected_index as number | null,
    active: v.active,
  }
}

export function splitEditorialPollPrompt(text: string): { body: string; prompt: string | null } {
  // Historical editorial invitation remains in stored description for provenance.
  // Only remove it from rendering when an actual structured poll exists.
  const expression = /(?:^|\n)함께 나눠요\s*\|\s*([^\n]{1,180})(?=\n|$)/u
  const match = expression.exec(text)
  if (!match) return { body: text, prompt: null }
  const before = text.slice(0,match.index).trimEnd()
  const after = text.slice(match.index + match[0].length).trimStart()
  return { body: [before,after].filter(Boolean).join("\n\n"), prompt: match[1].trim() }
}

export async function fetchItemPoll(db: SupabaseClient, itemId: string): Promise<ItemPollSnapshot | null> {
  const { data,error } = await db.rpc("get_item_poll", { p_item_id: itemId })
  if (error) throw error
  if (data === null) return null
  const value = readItemPollSnapshot(data)
  if (!value || value.itemId !== itemId) throw new Error("POLL_RESPONSE_INVALID")
  return value
}

export async function castItemPollVote(db: SupabaseClient, itemId: string, optionIndex: number): Promise<ItemPollSnapshot> {
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) throw new Error("POLL_INVALID_CHOICE")
  const { data,error } = await db.rpc("cast_item_poll_vote", { p_item_id:itemId, p_option_index:optionIndex })
  if (error) throw error
  const result = readItemPollSnapshot(data)
  if (!result || result.itemId !== itemId || result.selectedIndex !== optionIndex) throw new Error("POLL_SAVE_UNVERIFIED")
  return result
}
