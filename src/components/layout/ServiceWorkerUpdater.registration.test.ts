import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const config = readFileSync(resolve(process.cwd(), 'next.config.mjs'), 'utf8')
const updater = readFileSync(resolve(__dirname, 'ServiceWorkerUpdater.tsx'), 'utf8')

describe('Service Worker registration race safety', () => {
  it('disables unguarded Workbox-window auto register while retaining PWA caching', () => {
    expect(config).toMatch(/register:\s*false/)
    expect(config).toMatch(/cacheOnFrontEndNav:\s*true/)
    expect(config).toMatch(/runtimeCaching:\s*\[/)
  })
  it('registers the generated PWA worker with a native browser API and guards blocked results', () => {
    expect(updater).toMatch(/navigator\.serviceWorker\.register\(["']\/sw\.js["']/)
    expect(updater).toMatch(/if\s*\(!active\s*\|\|\s*!reg\)\s*return/)
    expect(updater).toMatch(/addEventListener\(["']controllerchange["']/)
  })
})
