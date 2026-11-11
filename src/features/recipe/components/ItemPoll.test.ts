import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import useSWR from "swr"
import ItemPoll from "./ItemPoll"

vi.mock("swr", () => ({ default: vi.fn() }))
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock("@/components/auth/LoginPromptSheet", () => ({ default: () => null }))
vi.mock("@/shared/infra/supabase-client", () => ({ createSupabaseBrowserClient: () => ({}) }))

const itemId = "6eaa37a1-6c0f-4841-aadd-7a2d980fbdbf"
const snapshot = {
  itemId,
  question: "당고는 어떤 식감이 더 좋으세요?",
  options: ["살짝 구운 고소한 당고", "말랑한 그대로의 당고"],
  counts: [3, 2],
  total: 5,
  selectedIndex: null as number | null,
  active: true,
}
beforeEach(() => vi.clearAllMocks())

describe("reusable item vote presentation", () => {
  it("renders nothing for recipes with no configured poll", () => {
    vi.mocked(useSWR).mockReturnValue({ data: null, error: null, isLoading: false } as never)
    expect(renderToStaticMarkup(createElement(ItemPoll, { itemId, currentUserId: null, isPublic:true }))).toBe("")
  })
  it("shows exact options and login requirement but hides results until a user votes", () => {
    vi.mocked(useSWR).mockReturnValue({ data: snapshot, error: null, isLoading: false } as never)
    const html = renderToStaticMarkup(createElement(ItemPoll, { itemId, currentUserId: null, isPublic:true, initialPoll: snapshot }))
    expect(html).toContain("투표")
    expect(html).toContain("살짝 구운 고소한 당고")
    expect(html).toContain("말랑한 그대로의 당고")
    expect(html).toContain("투표하려면 로그인이 필요해요")
    expect(html).not.toContain("실제 참여 5명")
    expect(html).not.toContain("선택 바꾸기")
  })
  it("shows true result counts and a comments shortcut only after user has voted", () => {
    vi.mocked(useSWR).mockReturnValue({ data: { ...snapshot, selectedIndex: 1 }, error: null, isLoading: false } as never)
    const html = renderToStaticMarkup(createElement(ItemPoll, { itemId, currentUserId: "real-voter", isPublic:true }))
    expect(html).toContain("실제 참여 5명")
    expect(html).toContain("60%")
    expect(html).toContain("40%")
    expect(html).toContain("선택 바꾸기")
    expect(html).toContain('href="#comments"')
  })
})
