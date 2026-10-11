import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { isValidElement, type ReactElement, type ReactNode } from "react"

const state = vi.hoisted(() => ({
  pending: [] as Array<{ resolve: (images: unknown[]) => void; reject: (error: Error) => void }>,
  messages: [] as string[],
  cleanup: [] as Array<() => void>,
}))

vi.mock("react", async (load) => {
  const real = await load<typeof import("react")>()
  return {
    ...real,
    useRef: <T,>(current: T) => ({ current }),
    useId: () => "test-step-picker",
    useCallback: <T,>(callback: T) => callback,
    useEffect: (callback: () => void | (() => void)) => {
      const cleanup = callback()
      if (cleanup) state.cleanup.push(cleanup)
    },
  }
})
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: ({ title }: { title: string }) => state.messages.push(title) }),
}))
vi.mock("@/shared/infra/image-utils", () => ({
  isValidImageType: () => true,
  isValidFileSize: () => true,
  getImageProcessingMessage: () => "이미지 처리 실패",
  optimizeImages: () => new Promise((resolve, reject) => { state.pending.push({ resolve, reject }) }),
}))

import InstructionImageUploader from "./InstructionImageUploader"

type Input = ReactElement<{ type?: string; onChange: (e: unknown) => Promise<void> }>
type Button = ReactElement<{ type?: string; onClick: () => void; "aria-label"?: string }>

function children(node: ReactNode): ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(children)
  if (!isValidElement(node)) return []
  const el = node as ReactElement<{ children?: ReactNode }>
  return [el, ...children(el.props.children)]
}

function mountedPicker(props: Parameters<typeof InstructionImageUploader>[0]) {
  const tree = InstructionImageUploader(props)
  const elements = children(tree)
  const input = elements.find((el) => el.type === "input" && (el.props as Input["props"]).type === "file") as Input | undefined
  if (!input) throw new Error("native file input missing")
  const remove = elements.find((el) => el.type === "button" && (el.props as Button["props"])["aria-label"] === "단계 사진 지우기") as Button | undefined
  function choose(label: string) {
    const file = new File([label], label + ".jpg", { type: "image/jpeg" })
    return input!.props.onChange({ target: { files: [file], value: label } })
  }
  return { choose, remove }
}

const image = (name: string) => ({
  file: new File([name], name + ".jpg", { type: "image/jpeg" }),
  preview: "blob:step-" + name,
  width: 64,
  height: 64,
})

beforeEach(() => {
  state.pending.length = 0
  state.messages.length = 0
  state.cleanup.length = 0
})

afterEach(() => {
  vi.restoreAllMocks()
})

it("keeps only the most recently chosen step photo when an older conversion finishes later", async () => {
  const change = vi.fn()
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  const { choose } = mountedPicker({ imageUrl: undefined, onImageChange: change })
  const slow = choose("slow")
  const fast = choose("fast")
  expect(state.pending).toHaveLength(2)
  state.pending[1].resolve([image("fast")])
  await fast
  state.pending[0].resolve([image("slow")])
  await slow
  expect(change).toHaveBeenCalledTimes(1)
  expect(change).toHaveBeenCalledWith(expect.objectContaining({
    preview: "blob:step-fast", width: 64, height: 64,
    file: expect.objectContaining({ name: "fast.jpg" }),
  }))
  expect(revoke).toHaveBeenCalledWith("blob:step-slow")
  expect(revoke).not.toHaveBeenCalledWith("blob:step-fast")
})

it("does not restore a pending photo after explicitly removing the previous step photo", async () => {
  const change = vi.fn()
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  const { choose, remove } = mountedPicker({ imageUrl: "https://cdn.invalid/existing.jpg", onImageChange: change })
  const pending = choose("late")
  expect(remove).toBeTruthy()
  remove!.props.onClick()
  state.pending[0].resolve([image("late")])
  await pending
  expect(change).toHaveBeenCalledTimes(1)
  expect(change).toHaveBeenCalledWith(null)
  expect(revoke).toHaveBeenCalledWith("blob:step-late")
})

it("suppresses stale conversion errors after another photo has been selected", async () => {
  const change = vi.fn()
  const { choose } = mountedPicker({ imageUrl: undefined, onImageChange: change })
  const old = choose("broken")
  const newer = choose("valid")
  state.pending[1].resolve([image("valid")])
  await newer
  state.pending[0].reject(new Error("old photo decode failed"))
  await old
  expect(change).toHaveBeenCalledTimes(1)
  expect(state.messages).not.toContain("이미지 처리 실패")
})
