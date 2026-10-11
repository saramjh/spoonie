import { describe, expect, it, vi } from "vitest"

const fixture = vi.hoisted(() => ({
  originals: [] as string[],
  removed: [] as string[],
}))

vi.mock("@/shared/infra/image-optimization", () => ({
  uploadVariants: async () => {},
}))

import { saveRecipeRows, uploadInstructionImages } from "./recipe-repository"

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

describe("recipe database rejection provenance", () => {
  it("preserves the SQLSTATE for safe cleanup decisions", async () => {
    const error = { code: "23505", message: "unique constraint rejected" }
    const supabase = {
      async rpc() { return { data: null, error } },
    } as unknown as Parameters<typeof saveRecipeRows>[0]
    await expect(saveRecipeRows(supabase, { existingId: null, itemPayload: {}, ingredients: [], instructions: [] }))
      .rejects.toMatchObject({ cause: error })
  })
})

describe("recipe cover index is committed with ordered photos and recipe rows", () => {
  it("passes edit cover and image order in the same save_recipe_atomic RPC", async () => {
    const saved = { image_urls: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"], thumbnail_index: 1 }
    const params: unknown[] = []
    const supabase = {
      async rpc(name: string, args: object) {
        expect(name).toBe("save_recipe_atomic")
        params.push(args)
        return { data: "existing-recipe", error: null }
      },
    } as unknown as Parameters<typeof saveRecipeRows>[0]
    const result = await saveRecipeRows(supabase, {
      existingId: "existing-recipe",
      itemPayload: saved,
      ingredients: [{ name: "salt", amount: 1, unit: "g" }],
      instructions: [{ description: "add salt", image_url: undefined }],
    })
    expect(result.itemId).toBe("existing-recipe")
    expect(result.ingredientsToInsert[0]).toMatchObject({ item_id: "existing-recipe", order_index: 1 })
    expect(params).toEqual([expect.objectContaining({
      p_existing_id: "existing-recipe",
      p_item: saved,
      p_ingredients: [expect.objectContaining({ name: "salt", order_index: 1 })],
      p_instructions: [expect.objectContaining({ description: "add salt", step_number: 1 })],
    })])
  })
})
