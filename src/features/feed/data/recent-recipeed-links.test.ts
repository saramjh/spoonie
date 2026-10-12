import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getRecentPublicRecipeedLinks } from "./server-data"

function mockPublicItems(rows: Array<{ id: string; title?: string | null; content?: string | null; tags?: string[]; image_urls?: string[] }>) {
  const calls: Array<[string, unknown]> = []
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((name: string, value: unknown) => { calls.push([name, value]); return query }),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
  }
  return { client: { from: vi.fn(() => query) } as unknown as SupabaseClient, query, calls }
}

describe("public Recipeed navigation from home", () => {
  it("fetches only public posts and excludes placeholder content while keeping valid posts clickable", async () => {
    const m = mockPublicItems([
      { id: "real-1", title: "국밥 먹은 날", content: "오늘 돼지국밥을 만들었어요." },
      { id: "placeholder", title: "테스트", content: "ㅋㅋ" },
      { id: "real-2", title: "", content: "브리타 필터를 교체하며 확인한 기록입니다." },
    ])
    expect(await getRecentPublicRecipeedLinks(m.client)).toEqual([
      { href: "/posts/real-1", title: "국밥 먹은 날" },
      { href: "/posts/real-2", title: "브리타 필터를 교체하며 확인한 기록입니다." },
    ])
    expect(m.client.from).toHaveBeenCalledWith("items")
    expect(m.calls).toContainEqual(["is_public", true])
    expect(m.calls).toContainEqual(["item_type", "post"])
    expect(m.query.limit).toHaveBeenCalledWith(30)
    expect(m.query.order).toHaveBeenCalledWith("created_at", { ascending: false })
  })

  it("bounds the homepage navigation to 6 links", async () => {
    const m = mockPublicItems(Array.from({length: 12}, (_, i) => ({id: `public-${i}`, title: `집밥 사진 ${i}`})))
    const links = await getRecentPublicRecipeedLinks(m.client)
    expect(links).toHaveLength(6)
    expect(links[0].href).toBe("/posts/public-0")
  })
})
