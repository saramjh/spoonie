import { beforeEach, afterEach, expect, it, vi } from "vitest"
import { isValidElement } from "react"
import type { ChangeEvent, ReactElement, ReactNode } from "react"

const mocks = vi.hoisted(() => ({
  messages: [] as Array<{ title: string; description?: string }>,
  error: "이미지를 열 수 없습니다. 다른 사진 또는 JPG 파일을 선택해 주세요.",
}))

vi.mock("react", async (load) => {
  const actual = await load<typeof import("react")>()
  return {
    ...actual,
    useState: (initial: unknown) => [initial, () => {}],
    useRef: (current: unknown) => ({ current }),
    useCallback: <T,>(callback: T) => callback,
    useId: () => "photo-input",
    useEffect: (setup: () => void | (() => void)) => { setup() },
  }
})
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: (message: { title: string; description?: string }) => mocks.messages.push(message),
  }),
}))
vi.mock("@/shared/infra/image-utils", async (load) => ({
  ...await load<typeof import("@/shared/infra/image-utils")>(),
  optimizeImages: async () => { throw new Error(mocks.error) },
  isValidImageType: () => true,
  isValidFileSize: () => true,
}))

import ImageUploader from "./ImageUploader"
import InstructionImageUploader from "@/features/recipe/components/InstructionImageUploader"

type FileInput = ReactElement<{ type: string; onChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void> }>

function findFileInput(node: ReactNode): FileInput {
  if (Array.isArray(node)) {
    for (const part of node) {
      try { return findFileInput(part) } catch { /* not an input */ }
    }
  }
  if (isValidElement(node)) {
    const element = node as ReactElement<{ type?: string; children?: ReactNode }>
    if (element.type === "input" && element.props.type === "file") return element as FileInput
    if (element.props.children) return findFileInput(element.props.children)
  }
  throw new Error("native file input missing")
}

async function chooseHEIC(element: ReactNode) {
  const input = findFileInput(element)
  const target = {
    files: [new File(["HEIC"], "camera.heic", { type: "image/heic" })],
    value: "/photos/camera.heic",
  }
  await input.props.onChange({ target } as unknown as ChangeEvent<HTMLInputElement>)
  return mocks.messages.at(-1)?.description
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {})
  mocks.messages.length = 0
  mocks.error = "이미지를 열 수 없습니다. 다른 사진 또는 JPG 파일을 선택해 주세요."
})

afterEach(() => { vi.restoreAllMocks() })

it("shows actionable JPG guidance for an unsupported HEIC in Recipe/Recipeed picker", async () => {
  const description = await chooseHEIC(ImageUploader({ images: [], onImagesChange: () => {} }))
  expect(description).toContain("JPG")
  expect(description).toContain("HEIC")
})

it("shows actionable JPG guidance for an unsupported HEIC in step photo picker", async () => {
  const description = await chooseHEIC(InstructionImageUploader({ imageUrl: undefined, onImageChange: () => {} }))
  expect(description).toContain("JPG")
  expect(description).toContain("HEIC")
})

it("does not reveal arbitrary internal errors in user-facing photo messages", async () => {
  mocks.error = "secret internal error"
  const description = await chooseHEIC(ImageUploader({ images: [], onImagesChange: () => {} }))
  expect(description).toBe("이미지 처리 중 오류가 발생했습니다.")
})
