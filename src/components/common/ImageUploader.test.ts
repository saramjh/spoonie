import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import ImageUploader from "./ImageUploader"
import InstructionImageUploader from "@/features/recipe/components/InstructionImageUploader"

describe("mobile file picker before hydration", () => {
  it("connects the visible recipe/recipeed photo label to the native file input", () => {
    for (const frame of ["recipe", "recipeed"] as const) {
      const html = renderToStaticMarkup(createElement(ImageUploader, { frame, images: [], onImagesChange: () => {} }))
      const id = html.match(/<label[^>]*for="([^"]+)"/)?.[1]
      expect(id).toBeTruthy()
      expect(html).toContain(`id="${id}"`)
      expect(html).toContain('accept="image/*"')
      expect(html).toMatch(/class="[^"]*\bsr-only\b[^"]*"/)
    }
  })

  it("uses the same native label activation for step photos", () => {
    const html = renderToStaticMarkup(createElement(InstructionImageUploader, { imageUrl: undefined, onImageChange: () => {} }))
    const id = html.match(/<label[^>]*for="([^"]+)"/)?.[1]
    expect(id).toBeTruthy()
    expect(html).toContain(`id="${id}"`)
  })
})
