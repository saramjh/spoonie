const assert = require('node:assert/strict')
const { chromium } = require('playwright-core')

const base = process.env.SPOONIE_QA_URL
if (!base) throw new Error('SPOONIE_QA_URL is required')

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE || undefined })
  try {
    const qaContext = async (serviceWorkers = 'block') => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers })
      // Netlify deploy previews insert a drawer that otherwise intercepts app taps.
      await context.addInitScript(() => {
        const removeDrawer = () => document.querySelectorAll('[data-netlify-deploy-id]').forEach(node => node.remove())
        new MutationObserver(removeDrawer).observe(document, { childList: true, subtree: true })
        removeDrawer()
      })
      return context
    }
    const context = await qaContext()
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/search`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3500)
    const input = page.getByRole('searchbox', { name: '검색' })
    await input.fill('김치')
    await page.waitForURL(url => url.pathname === '/search' && url.searchParams.get('q') === '김치', { timeout: 15000 })
    await page.locator('a[href^="/recipes/"]').first().waitFor({ state: 'visible', timeout: 16000 })
    const initialCount = await page.locator('a[href^="/recipes/"]').count()
    assert.ok(initialCount > 0, 'A real public search must return recipe links')
    await page.evaluate(() => window.scrollTo(0, 450))
    const previousScroll = await page.evaluate(() => window.scrollY)
    await page.getByRole('tab', { name: /레시피\s+\d/ }).click()
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'recipe')
    await page.locator('a[href^="/recipes/"]').nth(Math.min(7, initialCount - 1)).click()
    await page.waitForURL(url => url.pathname.startsWith('/recipes/'), { timeout: 20000 })
    await page.goBack({ timeout: 15000 })
    await page.waitForURL(url => url.pathname === '/search' && url.searchParams.get('q') === '김치', { timeout: 16000 })
    await page.waitForFunction(() => document.querySelector('input[type="search"]')?.value === '김치', { timeout: 15000 })
    await page.locator('a[href^="/recipes/"]').first().waitFor({ state: 'visible', timeout: 15000 })
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'recipe')
    assert.equal(await page.locator('a[href^="/recipes/"]').count(), initialCount)
    await page.waitForTimeout(600)
    const restoredScroll = await page.evaluate(() => window.scrollY)
    assert.ok(Math.abs(restoredScroll - previousScroll) < 160, 'Search scroll position should survive detail/Back')
    console.log('PASS search detail/Back: query, result type, results and scroll position are retained')
    await context.close()

    const countContext = await qaContext()
    const counts = await countContext.newPage()
    counts.on('pageerror', error => errors.push(error.message))
    const makeRecipe = n => ({
      id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
      item_type: 'recipe', title: `QA 검색 레시피 ${n}`, user_id: '00000000-0000-4000-8000-000000008888',
      created_at: '2026-10-01T00:00:00.000Z', image_urls: [], likes_count: 0, comments_count: 0,
      is_public: true, ingredients: [], instructions: []
    })
    const otherOffsets = []
    await counts.route('**/rest/v1/rpc/search_items_optimized', async route => {
      const request = route.request().postDataJSON()
      if (request.search_term !== 'COUNT_QA' && request.search_term !== 'OTHER_QA') return route.continue()
      if (request.search_term === 'OTHER_QA' && request.item_type_filter === 'recipe') otherOffsets.push(request.result_offset)
      const rows = request.item_type_filter === 'recipe'
        ? request.result_offset === 0 ? Array.from({ length: 21 }, (_, i) => makeRecipe(i)) : [makeRecipe(20), makeRecipe(21)]
        : []
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) })
    })
    await counts.goto(`${base}/search`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await counts.waitForTimeout(3500)
    await counts.getByRole('searchbox', { name: '검색' }).fill('COUNT_QA')
    await counts.getByRole('tab', { name: /레시피\s+20\+/ }).waitFor({ state: 'visible', timeout: 18000 })
    assert.equal(await counts.locator('a[href^="/recipes/"]').count(), 20)
    console.log('PASS search first page: 20+ count visible before all pages are loaded')
    await counts.getByRole('button', { name: '레시피 더 보기' }).click()
    await counts.getByRole('tab', { name: /레시피\s+22$/ }).waitFor({ state: 'visible', timeout: 16000 })
    assert.equal(await counts.locator('a[href^="/recipes/"]').count(), 22)
    console.log('PASS search final page: exact count replaces progressive count')
    await counts.locator('a[href^="/recipes/"]').last().click()
    await counts.waitForURL(url => url.pathname.startsWith('/recipes/'), { timeout: 20000 })
    await counts.goBack({ timeout: 15000 })
    await counts.waitForURL(url => url.pathname === '/search' && url.searchParams.get('q') === 'COUNT_QA', { timeout: 15000 })
    await counts.getByRole('tab', { name: /레시피\s+22$/ }).waitFor({ state: 'visible', timeout: 15000 })
    assert.equal(await counts.locator('a[href^="/recipes/"]').count(), 22)
    console.log('PASS multi-page search: cached loaded pages remain after detail/Back')
    await counts.getByRole('searchbox', { name: '검색' }).fill('OTHER_QA')
    await counts.waitForURL(url => url.searchParams.get('q') === 'OTHER_QA', { timeout: 15000 })
    await counts.getByRole('tab', { name: /레시피\s+20\+/ }).waitFor({ state: 'visible', timeout: 15000 })
    await counts.waitForTimeout(650)
    assert.ok(otherOffsets.length > 0 && otherOffsets.every(offset => offset === 0), 'A fresh query must only load its first page')
    console.log('PASS changed search term: no unnecessary carryover page fetches')
    await countContext.close()

    const pwaContext = await qaContext('allow')
    await pwaContext.addInitScript(() => {
      window.__pwaChecks = 0
      Object.defineProperty(navigator, 'standalone', { configurable: true, value: true })
      ServiceWorkerRegistration.prototype.update = function () {
        window.__pwaChecks += 1
        return Promise.resolve()
      }
    })
    const pwa = await pwaContext.newPage()
    pwa.on('pageerror', error => errors.push(error.message))
    await pwa.goto(`${base}/search`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await pwa.waitForFunction(() => window.__pwaChecks > 0, { timeout: 18000 })
    const policy = await pwa.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.updateViaCache)
    assert.equal(policy, 'none')
    await pwa.evaluate(() => {
      const now = Date.now()
      Date.now = () => now + 61_000
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await pwa.waitForFunction(() => window.__pwaChecks >= 2, { timeout: 5000 })
    console.log('PASS installed PWA simulation: foreground triggers uncached worker update checks')
    await pwa.evaluate(() => navigator.serviceWorker.ready)
    await pwa.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
    await pwa.waitForFunction(() => Boolean(navigator.serviceWorker.controller), { timeout: 15000 })
    await pwa.getByRole('searchbox', { name: '검색' }).focus()
    await pwa.evaluate(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')))
    await pwa.waitForTimeout(450)
    assert.equal(new URL(pwa.url()).pathname, '/search')
    console.log('PASS installed PWA simulation: focused input is not automatically reloaded')
    const reloaded = pwa.waitForEvent('framenavigated', frame => frame === pwa.mainFrame(), { timeout: 10000 })
    await pwa.evaluate(() => {
      document.activeElement?.blur()
      navigator.serviceWorker.dispatchEvent(new Event('controllerchange'))
    }).catch(() => {})
    await reloaded
    console.log('PASS installed PWA simulation: new worker safely refreshes idle app')
    await pwaContext.close()
    assert.deepEqual(errors, [], 'No uncaught browser errors')
  } finally {
    await browser.close()
  }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1 })
