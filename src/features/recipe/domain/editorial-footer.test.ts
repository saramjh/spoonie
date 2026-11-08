import { describe, expect, it } from 'vitest'
import { splitKitchenEditorialFooter, parseRecipeDescription, serializeRecipeDescription } from './editorial-footer'

it('moves only a deliberately marked final attribution into a concise note', () => {
  expect(splitKitchenEditorialFooter('담백한 조림입니다.\n\n출처·안내: 홍길동 · https://example.com/recipe · 원문을 참고해 재구성했습니다.')).toEqual({
    body: '담백한 조림입니다.',
    note: '홍길동 · https://example.com/recipe · 원문을 참고해 재구성했습니다.',
  })
})
it('keeps historical user prose and incidental mentions of sources intact', () => {
  expect(splitKitchenEditorialFooter('중간에 출처: 라고 적힌 재료 목록')).toEqual({ body: '중간에 출처: 라고 적힌 재료 목록', note: null })
  expect(splitKitchenEditorialFooter('본문\n\n출처·안내: 안내라지만 여러 줄\n조리 설명')).toEqual({ body: '본문\n\n출처·안내: 안내라지만 여러 줄\n조리 설명', note: null })
})


const creator = "Sally McKenney / Sally's Baking"
const url = "https://sallysbakingaddiction.com/apple-crisp/"

describe("optional external recipe source: nonblocking compatibility", () => {
  it("does not alter internal recipes, unrecognized text or empty inputs", () => {
    expect(parseRecipeDescription("내 요리 이야기")).toEqual({ description: "내 요리 이야기", source: null })
    expect(serializeRecipeDescription("내 요리 이야기", "", "")).toBe("내 요리 이야기")
    expect(parseRecipeDescription("출처·안내: 허위 문구")).toEqual({ description: "출처·안내: 허위 문구", source: null })
  })
  it("keeps original source and independent photo licence notes from existing Soy format", () => {
    const body = `소개\n\n출처·안내: ${creator} · ${url} · 공개된 자료를 재구성했습니다. 사진: Commons CC BY 2.0 https://commons.wikimedia.org/`
    expect(parseRecipeDescription(body)).toEqual({
      description: "소개\n\n공개된 자료를 재구성했습니다. 사진: Commons CC BY 2.0 https://commons.wikimedia.org/",
      source: { creator, url },
    })
  })
  it("supports existing published Hyosun variant and preserves following paragraphs", () => {
    const body = "소개\n\n원작자: Hyosun / Korean Bapsang\n원문: https://www.koreanbapsang.com/hobak-jeon/\n\n사진: 별도 라이선스."
    expect(parseRecipeDescription(body)).toEqual({
      description: "소개\n\n사진: 별도 라이선스.",
      source: { creator: "Hyosun / Korean Bapsang", url: "https://www.koreanbapsang.com/hobak-jeon/" },
    })
  })
  it("preserves literal backslashes in current prose and still reads escaped publisher footers", () => {
    const prose = "사진 경로 C:\\new를 참고하세요."
    expect(parseRecipeDescription(serializeRecipeDescription(prose, creator, url))).toEqual({
      description: prose, source: { creator, url },
    })
    expect(parseRecipeDescription("소개\\n\\n출처·안내: " + creator + " · " + url)).toEqual({
      description: "소개", source: { creator, url },
    })
    expect(parseRecipeDescription("소개\\n\\n원작자: " + creator + "\\n원문: " + url)).toEqual({
      description: "소개", source: { creator, url },
    })
  })

  it("new form optional fields roundtrip without a DB migration or duplicate footers", () => {
    const once = serializeRecipeDescription("소개", creator, url)
    expect(serializeRecipeDescription(once, creator, url)).toBe(once)
    expect(parseRecipeDescription(once).source).toEqual({ creator, url })
    const withoutDescription = serializeRecipeDescription("", creator, url)
    expect(parseRecipeDescription(withoutDescription)).toEqual({ description: "", source: { creator, url } })
    expect(serializeRecipeDescription(withoutDescription, creator, url)).toBe(withoutDescription)
    expect(() => serializeRecipeDescription("소개", "이름 · https://example.com", url)).toThrow()
    expect(() => serializeRecipeDescription("소개", "이름", "javascript:alert(1)")).toThrow()
    expect(() => serializeRecipeDescription("소개", "이름", "")).toThrow()
  })
})
