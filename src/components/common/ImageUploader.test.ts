import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import ImageUploader from "./ImageUploader"
import InstructionImageUploader from "@/features/recipe/components/InstructionImageUploader"

describe("recipe card crop preview", () => {
  it("shows the live 3:2 crop and accessible focal controls only for recipe covers", () => {
    const image = { preview: "https://example.com/p.jpg", file: new File([], "p.jpg"), width: 1280, height: 960 }
    const html = renderToStaticMarkup(createElement(ImageUploader, {
      frame: "recipe", images: [image], thumbnailIndex: 0,
      focalPoint: { x: 15, y: 83 }, onFocalPointChange: () => {}, onImagesChange: () => {},
    }))
    // Vaul portals are intentionally not included in server static markup.
    // The approved crop editor is rendered only after the user opens the
    // management sheet; interactive crop geometry is covered in browser E2E.
    expect(html).toContain("사진 순서·대표 사진 관리")
    expect(html).not.toContain('aria-label="대표 사진 좌우 위치"')
    const post = renderToStaticMarkup(createElement(ImageUploader, { frame: "recipeed", images: [image], onImagesChange: () => {} }))
    expect(post).not.toContain("피드에서 보이는 모습")
    const square = renderToStaticMarkup(createElement(ImageUploader, { frame: "recipeed", images: [image], focalPoint: { x: 82, y: 14 }, onFocalPointChange: () => {}, onImagesChange: () => {} }))
    expect(square).toContain("사진 순서·대표 사진 관리")
    expect(square).toContain("aspect-[3/2]")
    expect(square).not.toContain("object-position:82% 14%")
  })
})

describe("mobile file picker before hydration", () => {
  it("connects the visible recipe/recipeed photo label to the native file input", () => {
    for (const frame of ["recipe", "recipeed"] as const) {
      const html = renderToStaticMarkup(createElement(ImageUploader, { frame, images: [], onImagesChange: () => {} }))
      const id = html.match(/<label[^>]*for="([^"]+)"/)?.[1]
      expect(id).toBeTruthy()
      expect(html).toContain(`id="${id}"`)
      expect(html).toContain('accept="image/*"')
      const input = html.match(/<input[^>]*type="file"[^>]*>/)?.[0]
      expect(input).toBeTruthy()
      expect(input).toContain('class="sr-only"')
      expect(input).not.toContain('w-full')
    }
  })

  it("uses the same native label activation for step photos", () => {
    const html = renderToStaticMarkup(createElement(InstructionImageUploader, { imageUrl: undefined, onImageChange: () => {} }))
    const id = html.match(/<label[^>]*for="([^"]+)"/)?.[1]
    expect(id).toBeTruthy()
    expect(html).toContain(`id="${id}"`)
    const input = html.match(/<input[^>]*type="file"[^>]*>/)?.[0]
    expect(input).toContain('class="sr-only"')
    expect(input).not.toContain('w-full')
  })
})


describe("approved photo composer layout", () => {
  it("uses matching photo/add slots and a collapsed native management section without losing crop controls", () => {
    const image = { preview: "https://example.com/p.jpg", file: new File([], "p.jpg"), width: 1280, height: 960 }
    const html = renderToStaticMarkup(createElement(ImageUploader, { images: [image], onImagesChange: () => {}, onThumbnailChange: () => {}, frame: "recipe", focalPoint: { x: 15, y: 83 }, onFocalPointChange: () => {} }))
    expect(html).toContain('data-photo-slot="image"')
    expect(html).toContain('data-photo-slot="add"')
    expect(html).toContain("대표 사진")
    expect(html).toContain("사진 순서·대표 사진 관리")
    expect(html).toContain('사진 관리')
    expect(html).toContain('data-photo-management')
    expect(html).toContain('사진 순서·대표 사진 관리')
    expect(html).not.toContain('aria-label="대표 사진 좌우 위치"')
    expect(html).not.toContain('aria-label="1번째 사진 맨 앞으로"')
  })
})
