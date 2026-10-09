import { describe, expect, it } from "vitest"
import { packImage, unpackImage } from "./composer-draft"

describe("composer photo draft round-trip", () => {
  it("keeps a real image File instead of an expired blob: preview URL", async () => {
    const file = new File(["camera-photo"], "food.jpg", { type: "image/jpeg" })
    const source = URL.createObjectURL(file)
    const stored = packImage({ file, preview: source, width: 320, height: 240 })
    expect(stored.existingUrl).toBeUndefined()
    expect(stored.file).toBe(file)
    const recovered = unpackImage(stored)
    expect(recovered.preview).not.toBe(source)
    expect(await recovered.file.text()).toBe("camera-photo")
    expect([recovered.width, recovered.height]).toEqual([320, 240])
    URL.revokeObjectURL(source)
    URL.revokeObjectURL(recovered.preview)
  })

  it("retains an existing server photo URL when editing", () => {
    const file = new File([], "existing.jpg")
    const image = packImage({ file, preview: "https://example.com/existing.jpg", width: 800, height: 600 })
    expect(unpackImage(image).preview).toBe("https://example.com/existing.jpg")
  })
})
