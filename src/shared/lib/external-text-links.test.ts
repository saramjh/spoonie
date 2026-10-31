import { describe, it, expect } from 'vitest'
import { tokenizeTextLinks, externalLinkDestination } from './external-text-links'

describe('published text URL links', () => {
  it('finds raw https and www links while preserving other words and final punctuation', () => {
    expect(tokenizeTextLinks('출처: https://example.org/food?x=1, 다음 www.recipe.kr/한식.')).toEqual([
      { text: '출처: ' }, { text: 'https://example.org/food?x=1', href: 'https://example.org/food?x=1' },
      { text: ', 다음 ' }, { text: 'www.recipe.kr/한식', href: 'https://www.recipe.kr/한식' }, { text: '.' },
    ])
  })
  it('preserves URL parentheses and rejects deceptive credentials', () => {
    expect(tokenizeTextLinks('참고 (https://example.org/potato_(red)) 끝').filter(x => x.href).map(x => x.text)).toEqual(['https://example.org/potato_(red)'])
    expect(tokenizeTextLinks('https://spoonie.kr@evil.example/path')[0]).toEqual({ text: 'https://spoonie.kr@evil.example/path' })
  })
  it('warns only for HTTP(S) cross-site destinations', () => {
    expect(externalLinkDestination('https://spoonie.kr/recipes/1', 'https://www.spoonie.kr/recipes/2')).toBeNull()
    expect(externalLinkDestination('https://www.spoonie.kr/posts/2', 'https://spoonie.kr/recipes/1')).toBeNull()
    expect(externalLinkDestination('https://bad.example/redirect', 'https://spoonie.kr/recipes/1')?.hostname).toBe('bad.example')
    expect(externalLinkDestination('javascript:alert(1)', 'https://spoonie.kr/')).toBeNull()
    expect(externalLinkDestination('https://real.example@bad.example/', 'https://spoonie.kr/')).toBeNull()
    expect(externalLinkDestination('https://spoonie.kr.evil.example/', 'https://spoonie.kr/')?.hostname).toBe('spoonie.kr.evil.example')
    expect(externalLinkDestination('/recipes/1', 'https://spoonie.kr/')).toBeNull()
  })
})
