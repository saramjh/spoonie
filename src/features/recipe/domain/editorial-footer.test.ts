import { expect, it } from 'vitest'
import { splitKitchenEditorialFooter } from './editorial-footer'

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
