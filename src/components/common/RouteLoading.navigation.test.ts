import { describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { RouteTransitionLoading } from "./RouteLoading"
import { hasAppHeader } from "@/shared/lib/app-chrome-route"

const render = (pathname: string) => renderToStaticMarkup(createElement(RouteTransitionLoading, { pathname }))
const routeSource = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8")

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

  it("has native loading boundaries on the main routes without breaking detail loading", () => {
    expect(routeSource("src/app/search/loading.tsx")).toContain("SearchLoading")
    expect(routeSource("src/app/bookmarks/loading.tsx")).toContain("BookmarksLoading")
    expect(routeSource("src/app/notifications/loading.tsx")).toContain("NotificationsLoading")
    expect(routeSource("src/app/topics/[tag]/loading.tsx")).toContain("FeedLoading")
    expect(existsSync(resolve(process.cwd(), "src/app/loading.tsx"))).toBe(false)
    // Do not put a recipe-list Suspense boundary above the existing recipe detail loading.
    expect(existsSync(resolve(process.cwd(), "src/app/recipes/loading.tsx"))).toBe(false)
  })
})
