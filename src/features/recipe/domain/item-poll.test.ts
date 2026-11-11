import { describe, expect, it, vi } from "vitest"
import { castItemPollVote, fetchItemPoll, readItemPollSnapshot, splitEditorialPollPrompt } from "./item-poll"
import type { SupabaseClient } from "@supabase/supabase-js"

const record = {
  item_id: "6eaa37a1-6c0f-4841-aadd-7a2d980fbdbf",
  question: "당고는 어떤 식감이 더 좋으세요?",
  options: ["살짝 구운 고소한 당고", "말랑한 그대로의 당고"],
  counts: [3, 2],
  total: 5,
  selected_index: null,
  active: true,
}

describe("structured item polls", () => {
  it("accepts true counts and validates selection/result consistency", () => {
    expect(readItemPollSnapshot(record)?.total).toBe(5)
    expect(readItemPollSnapshot({ ...record, selected_index: 1 })?.selectedIndex).toBe(1)
    expect(readItemPollSnapshot({ ...record, counts: [2, 2] })).toBeNull()
    expect(readItemPollSnapshot({ ...record, counts: [0, -1], total: -1 })).toBeNull()
    expect(readItemPollSnapshot({ ...record, options: ["A", "A"] })).toBeNull()
    expect(readItemPollSnapshot({ ...record, selected_index: 7 })).toBeNull()
    expect(readItemPollSnapshot({ ...record, options: ["only one"], counts: [1] })).toBeNull()
    expect(readItemPollSnapshot({ ...record, active: "yes" })).toBeNull()
    expect(readItemPollSnapshot({ ...record, options: ["같은 문장", "같은 문장"] })).toBeNull()
  })
  it("keeps historical prose unless a standalone poll marker exists", () => {
    const before = "원재료의 질감과 향.\n\nThe Secret Touch | 살짝 굽습니다."
    const after = "사진 출처 · https://example.com"
    const full = before + "\n\n함께 나눠요 | 당고는 구운 표면이 좋나요, 말랑한 그대로가 좋나요?\n\n" + after
    expect(splitEditorialPollPrompt(full)).toEqual({ body: before + "\n\n" + after, prompt: "당고는 구운 표면이 좋나요, 말랑한 그대로가 좋나요?" })
    expect(splitEditorialPollPrompt("본문에서 함께 나눠요 라고 썼습니다.")).toEqual({ body: "본문에서 함께 나눠요 라고 썼습니다.", prompt: null })
    expect(splitEditorialPollPrompt("함께 나눠요 | 당고는 구운 표면이 좋나요?")).toEqual({body:"",prompt:"당고는 구운 표면이 좋나요?"})
  })
  it("reads only the matching recipe poll and rejects invalid RPC data", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: record, error: null })
    const client = { rpc } as unknown as SupabaseClient
    const result = await fetchItemPoll(client, record.item_id)
    expect(result?.question).toBe(record.question)
    expect(rpc).toHaveBeenCalledWith("get_item_poll", { p_item_id: record.item_id })
    rpc.mockResolvedValueOnce({data:{...record,item_id:"another-recipe"},error:null})
    await expect(fetchItemPoll(client,record.item_id)).rejects.toThrow("POLL_RESPONSE_INVALID")
    rpc.mockResolvedValueOnce({data:null,error:null})
    expect(await fetchItemPoll(client,record.item_id)).toBeNull()
  })
  it("allows changing the stored choice using the authenticated RPC, without synthetic counts", async () => {
    const rpc=vi.fn().mockResolvedValue({data:{...record,counts:[3,3],total:6,selected_index:1},error:null})
    const client={rpc} as unknown as SupabaseClient
    const selected=await castItemPollVote(client,record.item_id,1)
    expect(selected.selectedIndex).toBe(1)
    expect(selected.total).toBe(6)
    expect(rpc).toHaveBeenCalledWith("cast_item_poll_vote",{p_item_id:record.item_id,p_option_index:1})
    await expect(castItemPollVote(client,record.item_id,4)).rejects.toThrow("POLL_INVALID_CHOICE")
    rpc.mockResolvedValueOnce({data:{...record,selected_index:0},error:null})
    await expect(castItemPollVote(client,record.item_id,1)).rejects.toThrow("POLL_SAVE_UNVERIFIED")
  })
})
