import { describe, expect, it } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import SplashScreen from "./SplashScreen"

describe("Spoonie first-entry brand splash", () => {
  it("renders real SSR branding without loading the profile or client scripts", () => {
    const html = renderToStaticMarkup(createElement(SplashScreen))
    expect(html).toContain('data-splash="true"')
    expect(html).toContain('aria-label="Spoonie를 여는 중"')
    expect(html).toContain("요리의 즐거움, 한 스푼")
    expect(html).toContain('data-motion="intro"')
  })
})
