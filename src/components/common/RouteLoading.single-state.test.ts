import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
import { DetailLoading, RecipeBookLoading } from "@/components/common/RouteLoading"

const source = (file: string) => readFileSync(resolve(process.cwd(),file),"utf8")

describe("single loading surface for Spoonie routes", () => {
  it("does not show the generic root page before a nested detail skeleton", () => {
    expect(existsSync(resolve(process.cwd(),"src/app/loading.tsx"))).toBe(false)
    for(const type of ["recipes","posts"]){
      expect(source("src/app/"+type+"/[id]/loading.tsx")).toContain("DetailLoading")
      const client = source("src/app/"+type+"/[id]/"+(type==="recipes"?"Recipe":"Post")+"DetailClient.tsx")
      expect(client).toContain('return <DetailLoading />')
      expect(client).not.toContain("PostCardSkeleton")
      expect(client).not.toContain("PageLoading")
    }
  })

  it("renders visible status and real skeleton in a single detail region", () => {
    const html=renderToStaticMarkup(createElement(DetailLoading))
    expect(html).toContain('role="status"')
    expect(html).toContain("불러오는 중…")
    expect(html).toContain("skeleton-shimmer")
    expect(html).toContain('aria-busy="true"')
    // 화면 전환 중 실제 상세 페이지의 헤더·3:2 이미지 공간이 유지돼야 한다.
    expect(html).toContain("h-14")
    expect(html).toContain("aspect-[3/2]")
    expect(html).not.toContain("px-4 py-3")
  })

  it("uses the same card skeleton in the recipe-book Suspense and loading state", () => {
    const html=renderToStaticMarkup(createElement(RecipeBookLoading))
    expect(html).toContain("불러오는 중…")
    expect((html.match(/aspect-square/g)??[]).length).toBe(6)
    expect(source("src/app/recipes/page.tsx")).toContain("<Suspense fallback={<RecipeBookLoading />}>")
    expect(source("src/app/recipes/page.tsx")).not.toContain("<Suspense fallback={<PageLoading />}>")
  })
})
