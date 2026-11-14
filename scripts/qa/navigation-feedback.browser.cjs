const assert = require('node:assert/strict')
const { chromium } = require('playwright-core')

const base = process.env.SPOONIE_QA_URL
if (!base) throw new Error('SPOONIE_QA_URL is required (e.g. http://127.0.0.1:3000)')
const executablePath = process.env.CHROME_EXECUTABLE || undefined

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath })
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname === '/recipes' && url.searchParams.has('_rsc')) {
        await new Promise((resolve) => setTimeout(resolve, 1800))
      }
      await route.continue().catch(() => {})
    })
    await page.goto(`${base}/search`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1600)
    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '레시피북' }).click()
    await page.waitForTimeout(90)
    const route = new URL(page.url()).pathname
    const pending = await page.locator('[data-route-feedback]').count()
    assert.ok(route === '/recipes' || pending === 1, 'A real Next Link must navigate or show its destination immediately')
    if (route !== '/recipes') {
      assert.equal(await page.locator('[data-route-feedback] [role="status"]').first().getAttribute('aria-label'), '레시피북을 불러오는 중')
    }
    await page.waitForURL('**/recipes', { timeout: 15000 })
    await page.locator('[data-route-feedback]').waitFor({ state: 'detached', timeout: 7000 })
    console.log('PASS real Link: immediate destination or skeleton, then clean commit')
    await page.goBack({ timeout: 15000 })
    await page.waitForURL('**/search', { timeout: 15000 })
    await page.goForward({ timeout: 15000 })
    await page.waitForURL('**/recipes', { timeout: 15000 })
    console.log('PASS history: back/forward retain the correct routes')

    await page.goto(`${base}/search`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1600)
    // A canceled plain anchor is not a navigation; global click guessing must not fire.
    const accepted = await page.evaluate(() => {
      const anchor = document.createElement('a')
      anchor.href = '/bookmarks'
      anchor.addEventListener('click', (event) => event.preventDefault())
      document.body.append(anchor)
      const allowed = anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
      anchor.remove()
      return allowed
    })
    await page.waitForTimeout(180)
    assert.equal(accepted, false)
    assert.equal(new URL(page.url()).pathname, '/search')
    assert.equal(await page.locator('[data-route-feedback], [data-nav-progress]').count(), 0)
    console.log('PASS canceled anchor: no false navigation feedback')

    await page.clock.install()
    const search = page.getByRole('searchbox', { name: '검색' }).first()
    await search.focus()
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('spoonie:navigation-start', { detail: { href: '/bookmarks' } })))
    await page.locator('[data-route-feedback]').waitFor({ state: 'visible', timeout: 2000 })
    await page.keyboard.type('ABC')
    assert.equal(await search.inputValue(), '')
    assert.equal(await page.locator('main').first().evaluate((main) => main.inert), true)
    await page.clock.fastForward(10050)
    await page.getByRole('alert').getByText('화면 이동이 지연되고 있습니다.').waitFor({ timeout: 2500 })
    await page.getByRole('button', { name: '이전 화면 유지' }).click()
    await page.locator('[data-route-feedback]').waitFor({ state: 'detached', timeout: 3000 })
    assert.equal(await page.locator('main').first().evaluate((main) => main.inert), false)
    assert.equal(new URL(page.url()).pathname, '/search')
    console.log('PASS timeout: visible recovery options, canceled overlay, input restored')
    await context.close()

    const retryContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
    const retryPage = await retryContext.newPage()
    retryPage.on('pageerror', (error) => errors.push(error.message))
    await retryPage.goto(`${base}/search`, { waitUntil: 'domcontentloaded' })
    await retryPage.waitForTimeout(1600)
    await retryPage.clock.install()
    await retryPage.evaluate(() => window.dispatchEvent(new CustomEvent('spoonie:navigation-start', { detail: { href: '/bookmarks' } })))
    await retryPage.locator('[data-route-feedback]').waitFor({ state: 'visible', timeout: 3000 })
    await retryPage.clock.fastForward(10050)
    await retryPage.getByRole('button', { name: '다시 시도' }).click({ timeout: 3000 })
    await retryPage.waitForURL('**/bookmarks', { timeout: 15000 })
    await retryPage.locator('[data-route-feedback]').waitFor({ state: 'detached', timeout: 6000 })
    console.log('PASS timeout retry: real destination navigation completes')
    await retryContext.close()

    const photos = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
    const feed = await photos.newPage()
    feed.on('pageerror', (error) => errors.push(error.message))
    await feed.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await feed.waitForTimeout(3600)
    const image = feed.locator('article [class*="absolute"][class*="inset-0"][class*="cursor-pointer"]').first()
    await image.waitFor({ state: 'visible', timeout: 12000 })
    await image.click()
    await feed.waitForTimeout(65)
    assert.equal(await feed.locator('article [class~="bg-ink/10"]').count(), 1)
    await feed.mouse.move(2, 2)
    await feed.waitForTimeout(70)
    assert.equal(await feed.locator('article [class~="bg-ink/10"]').count(), 1)
    await feed.waitForURL((url) => /^\/(recipes|posts)\//.test(url.pathname), { timeout: 20000 })
    console.log('PASS photo single tap: pressed feedback persists, then navigates')
    await photos.close()
    assert.deepEqual(errors, [])
    console.log('PASS navigation browser suite: no uncaught page exceptions')
  } finally {
    await browser.close()
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
