import { beforeEach, describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

const { link, navigationSignal } = vi.hoisted(() => {
  const link: { onNavigate?: (event: { preventDefault(): void }) => void; prefetch?: boolean } = {}
  return { link, navigationSignal: vi.fn() }
})

vi.mock("next/link", () => ({
  default: ({ onNavigate, prefetch, children }: { onNavigate?: typeof link.onNavigate; prefetch?: boolean; children: string }) => {
    link.onNavigate = onNavigate
    link.prefetch = prefetch
    return createElement("a", { href: "/search" }, children)
  },
}))
vi.mock("@/shared/lib/navigation", () => ({ signalNavigationStart: navigationSignal }))

import NavigationLink from "./NavigationLink"

beforeEach(() => {
  link.onNavigate = undefined
  link.prefetch = undefined
  navigationSignal.mockReset()
})

describe("Next Link navigation intent", () => {
  it("does not spend server RSC requests on unopened destinations", () => {
    renderToStaticMarkup(createElement(NavigationLink, { href: "/search" }, "검색"))
    expect(link.prefetch).toBe(false)
  })

  it("retains explicit opt-in for a verified-critical navigation", () => {
    renderToStaticMarkup(createElement(NavigationLink, { href: "/search", prefetch: true }, "검색"))
    expect(link.prefetch).toBe(true)
  })

  it("signals only a navigation Next is about to perform", () => {
    renderToStaticMarkup(createElement(NavigationLink, { href: "/search" }, "검색"))
    expect(link.onNavigate).toBeTypeOf("function")
    link.onNavigate?.({ preventDefault: vi.fn() })
    expect(navigationSignal).toHaveBeenCalledOnce()
    expect(navigationSignal).toHaveBeenCalledWith("/search")
  })

  it("keeps a cancelled onNavigate callback from signaling a navigation", () => {
    const cancel = vi.fn()
    renderToStaticMarkup(createElement(NavigationLink, {
      href: "/",
      onNavigate: (event) => event.preventDefault(),
    }, "홈"))
    link.onNavigate?.({ preventDefault: cancel })
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(navigationSignal).not.toHaveBeenCalled()
  })
})
