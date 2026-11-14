import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { RouteTransitionLoading } from "./RouteLoading"
import { hasAppHeader } from "@/shared/lib/app-chrome-route"
import SearchRouteLoading from "@/app/search/loading"
import BookmarksRouteLoading from "@/app/bookmarks/loading"
import NotificationsRouteLoading from "@/app/notifications/loading"
import TopicRouteLoading from "@/app/topics/[tag]/loading"

const render = (pathname: string) => renderToStaticMarkup(createElement(RouteTransitionLoading, { pathname }))

describe("Spoonie immediate navigation feedback", () => {
  it("renders destination-shaped skeletons rather than a thin bar alone", () => {
    expect(render("/search")).toContain('aria-label="검색 화면을 불러오는 중"')
    expect(render("/search")).toContain('h-12')
    expect(render("/recipes")).toContain('aria-label="레시피북을 불러오는 중"')
    expect(render("/posts/577808ef-555f-40cb-a71c-dcad1a1b6058")).toContain('aria-label="글을 불러오는 중"')
    expect(render("/profile/person")).toContain('h-[72px]')
    expect(render("/")).toContain('aria-label="피드를 불러오는 중"')
    expect(render("/bookmarks")).toContain('aria-label="저장한 글을 불러오는 중"')
    expect(render("/notifications")).toContain('aria-label="알림을 불러오는 중"')
  })

  it("keeps shell header decisions consistent across top routes and focused routes", () => {
    for (const path of ["/", "/search", "/recipes", "/bookmarks", "/notifications", "/profile/user", "/topics/kimchi"]) {
      expect(hasAppHeader(path)).toBe(true)
    }
    for (const path of ["/posts/123", "/recipes/new", "/recipes/123", "/profile/user/edit", "/login", "/signup", "/partners", "/legal/privacy"]) {
      expect(hasAppHeader(path)).toBe(false)
    }
  })

  it("renders the actual Next route loading surfaces rather than inspecting file names", () => {
    for (const [Component, label] of [
      [SearchRouteLoading, "검색 화면을 불러오는 중"],
      [BookmarksRouteLoading, "저장한 글을 불러오는 중"],
      [NotificationsRouteLoading, "알림을 불러오는 중"],
      [TopicRouteLoading, "피드를 불러오는 중"],
    ] as const) {
      const html = renderToStaticMarkup(createElement(Component))
      expect(html).toContain('role="status"')
      expect(html).toContain(`aria-label="${label}"`)
      expect(html).toContain('aria-busy="true"')
    }
  })
})
