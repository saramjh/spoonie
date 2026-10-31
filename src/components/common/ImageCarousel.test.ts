import { expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ImageCarousel from "./ImageCarousel"

it("keeps a recipe detail image intact when explicitly requesting contain, without changing the default feed crop", () => {
  const src = "https://example.com/food.jpg"
  const detail = renderToStaticMarkup(createElement(ImageCarousel, { images: [src], alt: "recipe", frame: "recipe", fit: "contain" }))
  expect(detail).toContain("object-contain")
  expect(detail).toContain("aspect-[4/3]")
  const feed = renderToStaticMarkup(createElement(ImageCarousel, { images: [src], alt: "recipe", frame: "recipe" }))
  expect(feed).toContain("object-cover")
  expect(feed).not.toContain("object-contain")
})
