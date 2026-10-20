import { describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"

type CachedEntry = { url: string; text: string }

function activationHarness(initial: Record<string, CachedEntry[]>) {
  const cachesByName = new Map<string, Map<string, string>>(Object.entries(initial).map(([name, entries]) => [name, new Map(entries.map((entry) => [entry.url, entry.text]))]))
  const removals: Array<[string, string]> = []
  let onActivate: ((event: { waitUntil(promise: Promise<void>): void }) => void) | undefined
  const caches = {
    keys: async () => [...cachesByName.keys()],
    open: async (name: string) => ({
      keys: async () => [...(cachesByName.get(name)?.keys() ?? [])].map((url) => ({ url })),
      match: async (request: { url: string }) => {
        const text = cachesByName.get(name)?.get(request.url)
        return text === undefined ? undefined : { clone: () => ({ text: async () => text }) }
      },
      delete: async (request: { url: string }) => {
        removals.push([name, request.url])
        return cachesByName.get(name)?.delete(request.url) ?? false
      },
    }),
  }
  const self = {
    location: { origin: "https://spoonie.kr" },
    addEventListener(type: string, handler: (...args: never[]) => void) {
      if (type === "activate") onActivate = handler as typeof onActivate
    },
  }
  const script = readFileSync(new URL("../../../public/custom-sw.js", import.meta.url), "utf8")
  runInNewContext(script, { self, caches, URL, console: { warn: vi.fn() } })
  async function activate() {
    expect(onActivate).toBeTypeOf("function")
    let completion: Promise<void> = Promise.resolve()
    onActivate?.({ waitUntil: (promise) => { completion = promise } })
    await completion
  }
  return { cachesByName, removals, activate }
}

describe("service worker revoked homepage HTML cleanup", () => {
  it("deletes only old homepage cache entries from Workbox document and RSC caches", async () => {
    const old = '<section id="recent-recipeed-heading">최근 요리 기록</section>'
    const fresh = '<main><h1>Spoonie</h1></main>'
    const h = activationHarness({
      "start-url": [{ url: "https://spoonie.kr/", text: old }],
      "pages": [
        { url: "https://spoonie.kr/?utm_source=test", text: old },
        { url: "https://spoonie.kr/recipes/recipe123", text: old },
        { url: "https://spoonie.kr/?fresh=1", text: fresh },
      ],
      "pages-rsc": [{ url: "https://spoonie.kr/?_rsc=abc", text: old }],
      "pages-rsc-prefetch": [{ url: "https://spoonie.kr/?_rsc=prefetch", text: fresh }],
      "spoonie-photos": [{ url: "https://spoonie.kr/", text: old }],
    })
    await h.activate()
    expect(h.removals).toEqual([
      ["start-url", "https://spoonie.kr/"],
      ["pages", "https://spoonie.kr/?utm_source=test"],
      ["pages-rsc", "https://spoonie.kr/?_rsc=abc"],
    ])
    expect(h.cachesByName.get("pages")?.has("https://spoonie.kr/recipes/recipe123")).toBe(true)
    expect(h.cachesByName.get("pages")?.has("https://spoonie.kr/?fresh=1")).toBe(true)
    expect(h.cachesByName.get("spoonie-photos")?.size).toBe(1)
  })

  it("purges the rejected first-cook promotion from root document and RSC caches only", async () => {
    const old = '<section aria-labelledby="first-cook-home-entry">첫 요리기록 시작하기</section>'
    const h = activationHarness({
      "pages": [
        { url: "https://spoonie.kr/", text: old },
        { url: "https://spoonie.kr/recipes/abc", text: old },
      ],
      "pages-rsc-prefetch": [{ url: "https://spoonie.kr/?_rsc=abc", text: old }],
      "spoonie-photos": [{ url: "https://spoonie.kr/", text: old }],
    })
    await h.activate()
    expect(h.removals).toEqual([
      ["pages", "https://spoonie.kr/"],
      ["pages-rsc-prefetch", "https://spoonie.kr/?_rsc=abc"],
    ])
    expect(h.cachesByName.get("pages")?.has("https://spoonie.kr/recipes/abc")).toBe(true)
    expect(h.cachesByName.get("spoonie-photos")?.size).toBe(1)
  })

  it("leaves current homepage and unrelated caches alone", async () => {
    const h = activationHarness({
      "start-url": [{ url: "https://spoonie.kr/", text: '<main id="feed">Recipes</main>' }],
      "pages": [{ url: "https://spoonie.kr/posts/abc", text: '<main>Post</main>' }],
      "some-other-cache": [{ url: "https://spoonie.kr/", text: 'recent-recipeed-heading' }],
    })
    await h.activate()
    expect(h.removals).toEqual([])
  })
})
