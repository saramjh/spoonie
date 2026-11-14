import { beforeEach, describe, expect, it, vi } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

const { link, navigationSignal } = vi.hoisted(() => {
  const link: { onNavigate?: (event: { preventDefault(): void }) => void } = {}
  return { link, navigationSignal: vi.fn() }
})

vi.mock("next/link", () => ({
  default: ({ onNavigate, children }: { onNavigate?: typeof link.onNavigate; children: string }) => {
    link.onNavigate = onNavigate
    return createElement("a", { href: "/search" }, children)
  },
}))
vi.mock("@/shared/lib/navigation", () => ({ signalNavigationStart: navigationSignal }))

import NavigationLink from "./NavigationLink"

beforeEach(() => {
  link.onNavigate = undefined
  navigationSignal.mockReset()
})

describe("Next Link navigation intent", () => {
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
