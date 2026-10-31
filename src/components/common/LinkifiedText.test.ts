import { expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import LinkifiedText from './LinkifiedText'

it('renders member text escaped and source URLs as accessible safe anchors', () => {
  const html = renderToStaticMarkup(createElement('p', null, createElement(LinkifiedText, {
    text: '원문: https://creator.example/food. <script>alert(1)</script>',
  })))
  expect(html).toContain('href="https://creator.example/food"')
  expect(html).toContain('rel="noopener noreferrer nofollow ugc"')
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  expect(html).not.toContain('<script>')
})
