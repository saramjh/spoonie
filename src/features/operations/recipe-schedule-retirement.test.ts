/* eslint-disable @typescript-eslint/no-require-imports */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const config = readFileSync(resolve(import.meta.dirname, '../../../netlify.toml'), 'utf8')
const oldRecipe = require('../../../netlify/functions/release-queued-recipes.js')
const oldInstagram = require('../../../netlify/functions/retry-instagram-posts.js')

describe('Spoonie legacy recipe cron retirement', () => {
  it('does not schedule release or legacy Instagram retries', () => {
    expect(config).not.toContain('[functions."release-queued-recipes"]')
    expect(config).not.toContain('[functions."retry-instagram-posts"]')
    expect(config).toContain('[functions."collect-instagram-insights"]')
  })

  it('fails closed if an old public function URL is called', async () => {
    expect((await oldRecipe.handler()).statusCode).toBe(410)
    expect((await oldInstagram.handler()).statusCode).toBe(410)
  })

  it('preserves source helpers consumed by the existing insights collector', () => {
    expect(typeof oldRecipe._ig).toBe('function')
    expect(typeof oldRecipe._call).toBe('function')
    expect(typeof oldRecipe._instagramToken).toBe('function')
  })
})
