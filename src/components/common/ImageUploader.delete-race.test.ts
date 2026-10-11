import { expect, it, vi } from "vitest"
import { isValidElement } from "react"
import type { ChangeEvent, ReactElement, ReactNode } from "react"
import type { OptimizedImage } from "@/shared/infra/image-utils"

const gate = vi.hoisted(() => ({ resolve: null as null | ((value: unknown) => void) }))

vi.mock("react", async (load) => {
  const actual = await load<typeof import("react")>()
  return {
    ...actual,
    useState: (initial: unknown) => [initial, () => {}],
    useRef: (current: unknown) => ({ current }),
    useCallback: <T,>(callback: T) => callback,
    useId: () => "file-picker",
    useEffect: (setup: () => void | (() => void)) => { setup() },
  }
})
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: () => {} }) }))
vi.mock("@/shared/infra/image-utils", async (load) => ({
  ...await load<typeof import("@/shared/infra/image-utils")>(),
  optimizeImages: () => new Promise((resolve) => { gate.resolve = resolve }),
  isValidImageType: () => true,
  isValidFileSize: () => true,
}))

import ImageUploader from "./ImageUploader"

type ElementWithProps = ReactElement<{
  type?: string
  children?: ReactNode
  "aria-label"?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => Promise<void>
  onClick?: () => void
}>

function find(node: ReactNode, predicate: (element: ElementWithProps) => boolean): ElementWithProps {
  if (Array.isArray(node)) {
    for (const entry of node) {
      try { return find(entry, predicate) } catch { /* continue */ }
    }
  }
  if (isValidElement(node)) {
    const element = node as ElementWithProps
    if (predicate(element)) return element
    if (element.props.children) return find(element.props.children, predicate)
  }
  throw new Error("element missing")
}

it("does not resurrect a removed photo when a later photo finishes optimizing", async () => {
  gate.resolve = null
  const old: OptimizedImage = { file: new File(["a"], "old.jpg", { type: "image/jpeg" }), preview: "https://example.test/old.jpg", width: 10, height: 10 }
  const next: OptimizedImage = { file: new File(["b"], "new.jpg", { type: "image/jpeg" }), preview: "blob:new", width: 10, height: 10 }
  let shown = [old]
  const tree = ImageUploader({ images: shown, onImagesChange: (list) => { shown = list } })
  const input = find(tree, (element) => element.type === "input" && element.props.type === "file")
  const remove = find(tree, (element) => element.type === "button" && element.props["aria-label"] === "1번째 사진 지우기")
  const pending = input.props.onChange!({ target: { files: [next.file], value: "new.jpg" } } as unknown as ChangeEvent<HTMLInputElement>)
  expect(gate.resolve).not.toBeNull()
  remove.props.onClick!()
  expect(shown).toEqual([])
  gate.resolve!([next])
  await pending
  expect(shown.map((image) => image.file.name)).toEqual(["new.jpg"])
})
