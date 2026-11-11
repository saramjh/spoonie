import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import SiteFooter from './SiteFooter'

describe('secondary curator navigation only', () => {
  it('places curator introduction next to privacy, terms and policy in the footer', () => {
    const html = renderToStaticMarkup(SiteFooter({ hasBottomNav: true }))
    expect(html).toContain('href="/curators"')
    expect(html).toContain('큐레이터 소개')
    expect(html).toContain('href="/legal/privacy"')
    expect(html).toContain('href="/legal/terms"')
    expect(html).toContain('href="/legal/policy"')
  })
  it('never advertises curators in the home header', () => {
    const header = readFileSync(fileURLToPath(new URL('./Header.tsx', import.meta.url)), 'utf8')
    expect(header).not.toContain('href="/curators"')
  })
})
