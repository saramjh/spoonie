import { beforeEach, afterEach, expect, it, vi } from "vitest"

const storage = vi.hoisted(() => ({
  read: vi.fn(async () => undefined),
  write: vi.fn(async () => 1),
}))

vi.mock("@/shared/infra/composer-draft", () => ({
  readComposerDraft: storage.read,
  writeComposerDraft: storage.write,
  deleteComposerDraft: vi.fn(async () => {}),
  packImage: (x: unknown) => x,
  unpackImage: (x: unknown) => x,
}))

vi.mock("react", async (load) => {
  const actual = await load<typeof import("react")>()
  return {
    ...actual,
    useCallback: <T,>(callback: T) => callback,
    useRef: (value: unknown) => ({ current: value }),
    useState: (initial: unknown) => [initial, () => {}],
    useEffect: (setup: () => void | (() => void)) => { setup() },
  }
})

import { useComposerDraft } from "./useComposerDraft"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-11T03:30:00+09:00"))
  storage.read.mockClear()
  storage.write.mockClear()
  let revision = 0
  storage.write.mockImplementation(async () => ++revision)
  vi.stubGlobal("document", { addEventListener: () => {}, removeEventListener: () => {} })
  vi.stubGlobal("window", { addEventListener: () => {}, removeEventListener: () => {} })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it("starts the first durable draft checkpoint before a 160ms renderer crash window", async () => {
  let value = "unchanged"
  const hook = useComposerDraft({
    key: "crash-recovery-test",
    subscribe: () => () => {},
    snapshot: () => ({ values: { title: value }, mainImages: [], instructionImages: [], thumbnailIndex: 0 }),
    restore: () => {},
  })
  await Promise.resolve()
  await Promise.resolve()
  value = "first important edit"
  hook.scheduleSave()
  await vi.advanceTimersByTimeAsync(160)
  expect(storage.write).toHaveBeenCalledWith("crash-recovery-test", expect.objectContaining({
    values: { title: "first important edit" },
  }), 0)
})

it("coalesces rapid continuing edits rather than cloning photo drafts per keystroke", async () => {
  let value = "unchanged"
  const hook = useComposerDraft({
    key: "frequent-changes",
    subscribe: () => () => {},
    snapshot: () => ({ values: { title: value }, mainImages: [], instructionImages: [], thumbnailIndex: 0 }),
    restore: () => {},
  })
  await Promise.resolve()
  await Promise.resolve()
  for (let i = 0; i < 12; i++) {
    value = "text " + i
    hook.scheduleSave()
    await vi.advanceTimersByTimeAsync(80)
  }
  await vi.advanceTimersByTimeAsync(900)
  expect(storage.write.mock.calls.length).toBeGreaterThanOrEqual(2)
  expect(storage.write.mock.calls.length).toBeLessThanOrEqual(4)
  expect(storage.write).toHaveBeenLastCalledWith("frequent-changes", expect.objectContaining({ values: { title: "text 11" } }), expect.any(Number))
})
