import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { optimizeImages } from "./image-utils"

const created = new Map<string, Blob>()
const revoked: string[] = []
let sequence = 0

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  width = 8
  height = 8

  set src(url: string) {
    const input = created.get(url)
    const broken = input instanceof File && input.name.includes("broken")
    setTimeout(() => broken ? this.onerror?.() : this.onload?.(), broken ? 5 : 25)
  }
}

beforeEach(() => {
  created.clear()
  revoked.length = 0
  sequence = 0
  vi.stubGlobal("Image", FakeImage)
  vi.stubGlobal("document", {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage() {}, imageSmoothingEnabled: false, imageSmoothingQuality: "high" }),
      toBlob: (callback: (value: Blob) => void) => callback(new Blob(["jpeg pixels"], { type: "image/jpeg" })),
    }),
  })
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
    const url = "blob:spoonie-test-" + ++sequence
    if (!(blob instanceof Blob)) throw new Error("test fixture expected Blob")
    created.set(url, blob)
    return url
  })
  vi.spyOn(URL, "revokeObjectURL").mockImplementation((url: string) => {
    revoked.push(url)
    created.delete(url)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("parallel image conversion ownership", () => {
  it("releases all created preview blobs when one image fails before another finishes", async () => {
    const images = [
      new File(["good"], "valid.png", { type: "image/png" }),
      new File(["broken"], "broken.png", { type: "image/png" }),
    ]
    await expect(optimizeImages(images)).rejects.toThrow("이미지를 열 수 없습니다")
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect([...created.values()]).toHaveLength(0)
    expect(revoked).toHaveLength(3)
  })

  it("returns previews in original order without releasing them on success", async () => {
    const images = [
      new File(["good1"], "one.png", { type: "image/png" }),
      new File(["good2"], "two.png", { type: "image/png" }),
    ]
    const optimized = await optimizeImages(images)
    expect(optimized.map((image) => image.file.name)).toEqual(["one.jpg", "two.jpg"])
    expect(optimized.every((image) => created.has(image.preview))).toBe(true)
    expect(revoked).toHaveLength(2)
  })
})
