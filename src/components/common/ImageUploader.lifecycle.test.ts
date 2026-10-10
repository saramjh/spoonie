import { afterEach, beforeEach, expect, it, vi } from "vitest"

const effects = vi.hoisted(() => ({ cleanup: [] as Array<() => void>, setup: [] as Array<() => void | (() => void)> }))

vi.mock("react", async (original) => {
  const actual = await original<typeof import("react")>()
  return {
    ...actual,
    useState: (initial: unknown) => [initial, () => {}],
    useRef: (initial: unknown) => ({ current: initial }),
    useCallback: <T,>(fn: T) => fn,
    useId: () => "audit-file-input",
    useEffect: (run: () => void | (() => void)) => {
      effects.setup.push(run)
      const cleanup = run()
      if (cleanup) effects.cleanup.push(cleanup)
    },
  }
})
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: () => {} }) }))

import ImageUploader from "./ImageUploader"
import InstructionImageUploader from "@/features/recipe/components/InstructionImageUploader"

beforeEach(() => { effects.cleanup.length = 0; effects.setup.length = 0 })
afterEach(() => { vi.restoreAllMocks() })

it("frees retained main-photo blob previews when their uploader unmounts", async () => {
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  const preview = "blob:http://localhost/main-photo"
  ImageUploader({
    images: [{ preview, file: new File(["test"], "photo.jpg", { type: "image/jpeg" }), width: 2, height: 2 }],
    onImagesChange: () => {},
  })
  effects.cleanup.forEach((dispose) => dispose())
  await Promise.resolve()
  expect(revoke).toHaveBeenCalledWith(preview)
})

it("frees local step-photo blob previews when their uploader unmounts", async () => {
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  const preview = "blob:http://localhost/step-photo"
  InstructionImageUploader({ imageUrl: preview, onImageChange: () => {} })
  effects.cleanup.forEach((dispose) => dispose())
  await Promise.resolve()
  expect(revoke).toHaveBeenCalledWith(preview)
})

it("does not revoke server-hosted step photo URLs", async () => {
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  InstructionImageUploader({ imageUrl: "https://cdn.example.com/photo.jpg", onImageChange: () => {} })
  effects.cleanup.forEach((dispose) => dispose())
  await Promise.resolve()
  expect(revoke).not.toHaveBeenCalled()
})

it("does not release the live main photo during React Strict Mode effect replay", async () => {
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  ImageUploader({
    images: [{ preview: "blob:http://localhost/live", file: new File(["x"], "x.jpg"), width: 2, height: 2 }],
    onImagesChange: () => {},
  })
  effects.cleanup.forEach((dispose) => dispose())
  effects.setup.forEach((setup) => setup())
  await Promise.resolve()
  expect(revoke).not.toHaveBeenCalled()
})

it("does not release the live step photo during React Strict Mode effect replay", async () => {
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  InstructionImageUploader({ imageUrl: "blob:http://localhost/current-step", onImageChange: () => {} })
  effects.cleanup.forEach((dispose) => dispose())
  effects.setup.forEach((setup) => setup())
  await Promise.resolve()
  expect(revoke).not.toHaveBeenCalled()
})
