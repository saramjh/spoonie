import { beforeEach, describe, expect, it, vi } from "vitest"

const store = vi.hoisted(() => ({
  uploads: [] as string[],
  removed: [] as string[],
  failedOriginal: 0,
  originalCount: 0,
}))

vi.mock("@/shared/infra/supabase-client", () => ({
  createSupabaseBrowserClient: () => ({
    storage: {
      from(bucket: string) {
        return {
          async upload(filePath: string) {
            if (!filePath.includes(".w400.jpg") && !filePath.includes(".w800.jpg")) {
              store.originalCount++
              if (store.originalCount === store.failedOriginal) return { error: new Error("simulated source failure") }
            }
            store.uploads.push(filePath)
            return { error: null }
          },
          getPublicUrl(filePath: string) {
            return { data: { publicUrl: "https://images.example.test/storage/v1/object/public/" + bucket + "/" + filePath } }
          },
          async remove(filePaths: string[]) {
            store.removed.push(...filePaths)
            return { error: null }
          },
        }
      },
    },
  }),
}))

vi.mock("@/shared/infra/image-utils", () => ({
  optimizeImages: async (files: File[]) => files.map((file) => ({
    file, preview: "blob:local-preview", width: 8, height: 8,
  })),
}))

import { uploadImagesOptimized } from "./image-optimization"

const photo = (contents: string) => ({
  file: new File([contents], "meal.jpg", { type: "image/jpeg" }),
  preview: "blob:local-preview",
  width: 8,
  height: 8,
})

beforeEach(() => {
  store.uploads.length = 0
  store.removed.length = 0
  store.originalCount = 0
  store.failedOriginal = 0
})

describe("image upload ownership and lifecycle", () => {
  it("never substitutes another account's URL for identical file bytes", async () => {
    const bytes = crypto.randomUUID()
    const [first] = await uploadImagesOptimized([photo(bytes)], "owner-first", "item-images")
    const [second] = await uploadImagesOptimized([photo(bytes)], "owner-second", "item-images")
    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    expect(first.url).toContain("/owner-first/")
    expect(second.url).toContain("/owner-second/")
    expect(second.url).not.toBe(first.url)
  })

  it("reuploads an image after its earlier URL has been removed by an edit or cleanup", async () => {
    const image = photo(crypto.randomUUID())
    const [first] = await uploadImagesOptimized([image], "same-author", "item-images")
    const firstCount = store.uploads.length
    // Mock an edit removing the old object; real UI uses removeDroppedImages.
    const removedPath = first.url.split("/item-images/")[1]
    store.removed.push(removedPath)
    const [second] = await uploadImagesOptimized([image], "same-author", "item-images")
    expect(store.uploads.length).toBeGreaterThan(firstCount)
    expect(second.url).not.toBe(first.url)
  })

  it("uses a distinct storage path for identical photos within separate posts", async () => {
    const image = photo(crypto.randomUUID())
    const [[first], [second]] = await Promise.all([
      uploadImagesOptimized([image], "author", "item-images"),
      uploadImagesOptimized([image], "author", "item-images"),
    ])
    expect(first.success).toBe(true)
    expect(second.success).toBe(true)
    expect(first.url).not.toBe(second.url)
  })

  it("still creates the responsive image variants alongside each upload", async () => {
    const [result] = await uploadImagesOptimized([photo(crypto.randomUUID())], "author", "item-images")
    expect(result.success).toBe(true)
    const original = result.url.split("/item-images/")[1]
    expect(store.uploads).toContain(original)
    expect(store.uploads).toContain(original + ".w400.jpg")
    expect(store.uploads).toContain(original + ".w800.jpg")
  })

  it("removes already uploaded sources and variants when one photo in a batch fails", async () => {
    store.failedOriginal = 2
    const result = await uploadImagesOptimized(
      [photo(crypto.randomUUID()), photo(crypto.randomUUID()), photo(crypto.randomUUID())],
      "owner", "item-images",
    )
    expect(result.some((item) => !item.success)).toBe(true)
    const successful = result.filter((item) => item.success)
    expect(successful).toHaveLength(2)
    for (const item of successful) {
      const path = item.url.split("/item-images/")[1]
      expect(store.removed).toContain(path)
      expect(store.removed).toContain(path + ".w400.jpg")
      expect(store.removed).toContain(path + ".w800.jpg")
    }
  })

})
