import { expect, it, vi } from "vitest"

vi.mock("@/components/kit", async () => {
  const { createElement } = await import("react")
  return {
    IntentLink: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
    Photo: ({src}: {src: string}) => createElement("img", {src}),
    PhotoCount: () => null,
  }
})
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { Item } from "@/types/item"
import MadeRecordTile from "./MadeRecordTile"

const item = {
  id: "rec-1",
  item_id: "rec-1",
  item_type: "post",
  title: "할머니의 감자전",
  content: "물을 짜지 않고 부쳤더니 조금 부드러웠어요. 다음에는 바삭하게 시도해볼 생각입니다.",
  username: "tester",
  image_urls: null,
  thumbnail_index: null,
} as Item

it("presents real title and excerpt, not an empty camera icon, for photo-free Recipeed", () => {
  const html = renderToStaticMarkup(createElement(MadeRecordTile, {item}))
  expect(html).toContain("할머니의 감자전")
  expect(html).toContain("물을 짜지 않고")
  expect(html).toContain('href="/posts/rec-1"')
  expect(html).not.toContain("lucide-camera")
})

it("keeps the existing image tile behavior for records that have photos", () => {
  const html = renderToStaticMarkup(createElement(MadeRecordTile, {item: {...item, image_urls: ["https://example.com/photo.jpg"]}}))
  expect(html).toContain("photo.jpg")
  expect(html).not.toContain("물을 짜지 않고")
})
