const assert = require('node:assert/strict')
const { chromium } = require('playwright-core')

const origin = process.env.SPOONIE_QA_URL
if (!origin) throw new Error('SPOONIE_QA_URL is required')

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE || undefined })
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
    const page = await context.newPage()
    const errors = []
    const prefetches = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', req => {
      const u = new URL(req.url())
      if (u.origin !== new URL(origin).origin) return
      if (req.headers()['next-router-prefetch'] || req.headers()['purpose'] === 'prefetch') {
        prefetches.push({ pathname: u.pathname, type: req.resourceType() })
      }
    })
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.locator('article').first().waitFor({ state: 'visible', timeout: 17000 })
    await page.waitForTimeout(2700)
    assert.equal(prefetches.length, 0,
      `Opening home without interaction must not prefetch unused RSC pages: ${JSON.stringify(prefetches)}`)
    console.log('PASS idle home: zero speculative route prefetches')

    const recipeLink = page.locator('a[href^="/recipes/"]').first()
    await recipeLink.waitFor({ state: 'visible', timeout: 14000 })
    await recipeLink.hover()
    await page.waitForTimeout(1000)
    assert.ok(prefetches.some(x => x.pathname.startsWith('/recipes/')),
      'Hovering an intended recipe link should still warm its destination')
    console.log('PASS intended recipe: hover warms only the selected destination')

    await recipeLink.click()
    await page.waitForURL(u => u.pathname.startsWith('/recipes/'), { timeout: 20000 })
    console.log('PASS click: recipe detail still navigates')
    assert.deepEqual(errors, [])
    await context.close()

    // Touching a card while scrolling is not an intent to open its destination.
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
    const touchPage = await mobile.newPage()
    const touchPrefetches = []
    touchPage.on('request', req => {
      const u = new URL(req.url())
      if (u.origin === new URL(origin).origin && (req.headers()['next-router-prefetch'] || u.searchParams.has('_rsc'))) {
        touchPrefetches.push(u.pathname)
      }
    })
    await touchPage.goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const touchLink = touchPage.locator('a[href^="/recipes/"]').first()
    await touchLink.waitFor({ state: 'visible', timeout: 17000 })
    await touchLink.scrollIntoViewIfNeeded()
    await touchPage.waitForTimeout(2700)
    touchPrefetches.length = 0
    await touchLink.dispatchEvent('touchstart', { bubbles: true, cancelable: true })
    await touchPage.waitForTimeout(1100)
    assert.deepEqual(touchPrefetches, [], 'Touchstart before a possible scroll must not prefetch an unopened recipe')
    const rect = await touchLink.boundingBox()
    const x = Math.round(rect.x + rect.width / 2)
    const y = Math.round(rect.y + Math.min(70, rect.height * 0.45))
    const cdp = await mobile.newCDPSession(touchPage)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    for (let i = 1; i <= 5; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 28, id: 1 }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await touchPage.waitForTimeout(1100)
    assert.equal(new URL(touchPage.url()).pathname, '/', 'Swiping a card must not navigate')
    assert.deepEqual(touchPrefetches, [], `Swiping an unopened recipe must not spend server RSC requests: ${JSON.stringify(touchPrefetches)}`)
    console.log('PASS touch scroll: zero unused RSC prefetches')
    await touchLink.tap()
    await touchPage.waitForURL(u => u.pathname.startsWith('/recipes/'), { timeout: 20000 })
    console.log('PASS touch tap: recipe detail still navigates')
    await mobile.close()
  } finally { await browser.close() }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1 })
