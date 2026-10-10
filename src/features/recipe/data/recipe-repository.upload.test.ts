import { describe, expect, it, vi } from "vitest"

const fixture = vi.hoisted(() => ({
  originals: [] as string[],
  removed: [] as string[],
}))

vi.mock("@/shared/infra/image-optimization", () => ({
  uploadVariants: async () => {},
}))

import { uploadInstructionImages } from "./recipe-repository"

describe("recipe step photo upload failure safety", () => {
  it("waits for other steps and removes all new sources + variants after one fails", async () => {
    fixture.originals.length = 0
    fixture.removed.length = 0
    const bucket = "item-images"
    const supabase = {
      storage: {
        from() {
          return {
            async upload(filePath: string) {
              if (filePath.includes("-instruction-1-")) return { error: new Error("second step upload blocked") }
              if (filePath.includes("-instruction-2-")) await new Promise((resolve) => setTimeout(resolve, 20))
              fixture.originals.push(filePath)
              return { error: null }
            },
            getPublicUrl(filePath: string) {
              return { data: { publicUrl: "https://image.example/storage/v1/object/public/" + bucket + "/" + filePath } }
            },
            async remove(filePaths: string[]) {
              fixture.removed.push(...filePaths)
              return { error: null }
            },
          }
        },
      },
    } as unknown as Parameters<typeof uploadInstructionImages>[0]
    const makeImage = (id: string) => ({ file: new File([id], id + ".jpg", { type: "image/jpeg" }), preview: "blob:" + id, width: 40, height: 40 })
    const alreadyPublished = "https://image.example/storage/v1/object/public/item-images/creator/already-published.jpg"
    const existing = { file: new File([], "old.jpg"), preview: alreadyPublished, width: 40, height: 40 }
    await expect(uploadInstructionImages(supabase, bucket, "creator", [makeImage("first"), makeImage("second"), makeImage("third"), existing]))
      .rejects.toThrow("second step upload blocked")
    expect(fixture.originals).toHaveLength(2)
    expect(fixture.removed).not.toContain("creator/already-published.jpg")
    for (const path of fixture.originals) {
      expect(fixture.removed).toContain(path)
      expect(fixture.removed).toContain(path + ".w400.jpg")
      expect(fixture.removed).toContain(path + ".w800.jpg")
    }
  })
})
