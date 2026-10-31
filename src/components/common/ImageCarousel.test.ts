import { expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ImageCarousel from "./ImageCarousel"

it("uses saved focal coordinates for feed crop without altering recipe detail contain", () => {
  const src = "https://example.com/cover.jpg"
  const feed = renderToStaticMarkup(createElement(ImageCarousel, { images: [src], alt: "recipe", frame: "recipe", focalPoint: { x: 24, y: 71 } }))
  expect(feed).toContain("object-cover")
  expect(feed).toContain("object-position:24% 71%")
  const post = renderToStaticMarkup(createElement(ImageCarousel, { images: [src], alt: "post", frame: "recipeed", focalPoint: { x: 24, y: 71 } }))
  expect(post).toContain("object-position:24% 71%")
  const detail = renderToStaticMarkup(createElement(ImageCarousel, { images: [src], alt: "recipe", frame: "recipe", fit: "contain", focalPoint: { x: 24, y: 71 } }))
  expect(detail).toContain("object-contain")
  expect(detail).not.toContain("object-position:24% 71%")
})

it("keeps a recipe detail image intact when explicitly requesting contain, without changing the default feed crop", () => {
  const src = "https://example.com/food.jpg"
  const detail = renderToStaticMarkup(createElement(ImageCarousel, { images: [src], alt: "recipe", frame: "recipe", fit: "contain" }))
  expect(detail).toContain("object-contain")
  expect(detail).toContain("aspect-[4/3]")
  const feed = renderToStaticMarkup(createElement(ImageCarousel, { images: [src], alt: "recipe", frame: "recipe" }))
  expect(feed).toContain("object-cover")
  expect(feed).not.toContain("object-contain")
})
