import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  viewerId: "u" as string | null,
  writeLike: vi.fn(async () => ({ error: null as Error | null })),
  fetchLike: vi.fn(async () => null as { is_liked: boolean; likes_count: number } | null),
}))
vi.mock("swr", () => ({
  mutate: vi.fn(async (key: string, update: unknown) => {
    const previous = mock.rows.get(key)
    const next = typeof update === "function" ? update(previous) : update
    mock.rows.set(key, next as Record<string, unknown>)
    return next
  }),
}))
vi.mock("@/store/sessionStore", () => ({
  useSessionStore: { getState: () => ({ session: mock.viewerId ? { id: mock.viewerId } : null }) },
}))
vi.mock("@/shared/infra/swr-cache", () => ({
  revalidateStartingWith: vi.fn(async () => []),
  updateStartingWith: vi.fn(async () => []),
}))
vi.mock("@/features/social/data/social-repository", () => ({
  writeLike: mock.writeLike,
  fetchLikeServerState: mock.fetchLike,
  writeBookmark: vi.fn(async () => ({ error: null })),
  writeFollow: vi.fn(async () => ({ error: null })),
}))
import { cacheManager } from "./unified-cache-manager"
import { itemOverlayKey } from "./viewer-cache-key"
import { updateStartingWith } from "./swr-cache"

const seed = (id: string) => ({ id, likes_count: 0, is_liked: false })
const cached = (id: string, userId = "u") => mock.rows.get(itemOverlayKey(id, userId))
const flush = () => new Promise<void>(resolve => setImmediate(resolve))

beforeEach(() => {
  vi.useFakeTimers()
  mock.rows.clear()
  mock.viewerId = "u"
  vi.mocked(updateStartingWith).mockClear()
  mock.writeLike.mockReset()
  mock.writeLike.mockResolvedValue({ error: null })
  mock.fetchLike.mockReset()
  mock.fetchLike.mockResolvedValue(null)
})
afterEach(() => vi.useRealTimers())

describe("cacheManager.like", () => {
  it("coalesces rapid likes into one delayed read for the last state", async () => {
    const id = "like-coalesce"
    await cacheManager.like(id, "u", true, seed(id) as never)
    await cacheManager.like(id, "u", false)
    expect(cached(id)?.is_liked).toBe(false)
    await vi.advanceTimersByTimeAsync(3000)
    expect(mock.fetchLike).toHaveBeenCalledTimes(1)
    expect(mock.writeLike).toHaveBeenCalledTimes(2)
  })

  it("ignores an older in-flight server result after the user reverses a like", async () => {
    const id = "like-response-inversion"
    let finishOld: (state: { is_liked: boolean; likes_count: number }) => void = () => {}
    let finishNew: (state: { is_liked: boolean; likes_count: number }) => void = () => {}
    const older = new Promise<{ is_liked: boolean; likes_count: number }>(resolve => { finishOld = resolve })
    const newer = new Promise<{ is_liked: boolean; likes_count: number }>(resolve => { finishNew = resolve })
    mock.fetchLike.mockImplementationOnce(() => older).mockImplementationOnce(() => newer)

    await cacheManager.like(id, "u", true, seed(id) as never)
    await vi.advanceTimersByTimeAsync(3000)
    await cacheManager.like(id, "u", false)
    await vi.advanceTimersByTimeAsync(3000)
    expect(mock.fetchLike).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
    finishNew({ is_liked: false, likes_count: 0 })
    await flush()
    finishOld({ is_liked: true, likes_count: 1 })
    await flush()
    expect(cached(id)?.is_liked).toBe(false)
    expect(cached(id)?.likes_count).toBe(0)
  })

  it("rolls back a failed request and does not leak a second rejected promise", async () => {
    const id = "like-error"
    mock.writeLike.mockResolvedValueOnce({ error: new Error("intentional failure") })
    await expect(cacheManager.like(id, "u", true, seed(id) as never)).rejects.toThrow("intentional failure")
    expect(cached(id)?.is_liked).toBe(false)
    await vi.advanceTimersByTimeAsync(3000)
    expect(mock.fetchLike).not.toHaveBeenCalled()
    await cacheManager.like(id, "u", true)
    expect(cached(id)?.is_liked).toBe(true)
  })
})

describe("viewer-specific optimistic cache isolation", () => {
  it("does not let another account reuse liked/bookmarked UI state", async () => {
    const id = "viewer-separation"
    mock.viewerId = "alice"
    await cacheManager.like(id, "alice", true, seed(id) as never)
    const [, , allowKey] = vi.mocked(updateStartingWith).mock.calls.at(-1)!
    expect(allowKey?.("items|0|alice")).toBe(true)
    expect(allowKey?.("items|0|bob")).toBe(false)
    expect(allowKey?.("explore|v2")).toBe(false)
    expect(cached(id, "alice")?.is_liked).toBe(true)
    mock.viewerId = "bob"
    await cacheManager.like(id, "bob", false, seed(id) as never)
    expect(cached(id, "bob")?.is_liked).toBe(false)
    expect(cached(id, "alice")?.is_liked).toBe(true)
  })

  it("does not patch the next viewer's lists when the previous viewer's response arrives late", async () => {
    const id = "late-viewer-reconcile"
    let finishOld: (value: { is_liked: boolean; likes_count: number }) => void = () => {}
    mock.fetchLike.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
    mock.viewerId = "alice"
    await cacheManager.like(id, "alice", true, seed(id) as never)
    await vi.advanceTimersByTimeAsync(3000)
    mock.viewerId = "bob"
    await cacheManager.like(id, "bob", true, seed(id) as never)
    const beforeLate = vi.mocked(updateStartingWith).mock.calls.length
    vi.useRealTimers()
    finishOld({ is_liked: false, likes_count: 0 })
    await flush()
    expect(cached(id, "bob")?.is_liked).toBe(true)
    expect(cached(id, "alice")?.is_liked).toBe(false)
    expect(vi.mocked(updateStartingWith)).toHaveBeenCalledTimes(beforeLate)
  })
})
