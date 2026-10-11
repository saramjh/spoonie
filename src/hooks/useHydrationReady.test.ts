import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useHydrationReady } from './useHydrationReady'

const authForms = [
  'src/app/(auth)/login/login-client.tsx',
  'src/app/(auth)/signup/signup-client.tsx',
  'src/app/(auth)/reset-password/reset-password-client.tsx',
  'src/app/(auth)/forgot-password/forgot-password-client.tsx',
]

describe('sensitive auth forms must not submit natively before hydration', () => {
  it('server-rendered submit stays disabled until React takes ownership', () => {
    function Submit() {
      const ready = useHydrationReady()
      return createElement('button', { type: 'submit', disabled: !ready }, 'Submit')
    }
    const html = renderToString(createElement(Submit))
    expect(html).toContain('disabled=""')
  })

  it.each(authForms)('%s must require hydration before enabling form submit', (path) => {
    const source = readFileSync(resolve(process.cwd(), path), 'utf8')
    expect(source).toContain('useHydrationReady()')
    expect(source).toMatch(/disabled=\{!isHydrated(?:\s*\|\||\})/)
  })
})
