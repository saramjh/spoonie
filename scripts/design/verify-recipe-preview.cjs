// Real application component versus approved static board, isolated localhost only.
const assert=require('node:assert/strict')
const {chromium}=require('playwright-core')
const mock='http://127.0.0.1:49152/index.html?screen=recipe&revision=20261107-3'
const actual='http://127.0.0.1:3001/recipes/design-preview?view=recipe'
const chrome='/Users/ojihun/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
const referenceSelectors={header:'.app-topbar',hero:'.detail-hero .photo',summary:'.detail-summary',title:'.detail-title',tags:'.detail-summary .tags',social:'.detail-summary .social-actions',tabs:'.sticky-tabs',ingredients:'.ingredient-head',cta:'.app-dock',nav:'.app-nav'}
const actualSelectors={header:'[data-design-slot=header]',hero:'[data-design-slot=hero]',summary:'[data-design-slot=summary]',title:'[data-design-slot=title]',tags:'[data-design-slot=tags]',social:'[data-design-slot=social]',tabs:'[role=tablist]',ingredients:'[data-design-slot=ingredients]',cta:'[aria-label="요리 시작"]',nav:'nav[aria-label="주요 메뉴"]'}
async function geometry(page,selectors,app){
 return page.evaluate(({selectors,app})=>{
  const o={}
  for(const [key,selector]of Object.entries(selectors)){
   let e=document.querySelector(selector),r=e?.getBoundingClientRect()
   if(key==='cta'&&app)r=e?.parentElement?.getBoundingClientRect()
   if(key==='summary'&&app&&r){
    const social=document.querySelector(selectors.social)?.getBoundingClientRect()
    if(social)r={x:r.x,y:r.y,width:r.width,height:social.bottom-r.y}
   }
   o[key]=r?{x:r.x,y:r.y,w:r.width,h:r.height}:null
  }
  return o
 },{selectors,app})
}
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:chrome})
try{
 const ref=await browser.newPage({viewport:{width:390,height:844}})
 const app=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'})
 await Promise.all([ref.goto(mock,{waitUntil:'domcontentloaded'}),app.goto(actual,{waitUntil:'domcontentloaded'})])
 await Promise.all([ref.locator('.detail-hero').waitFor(),app.locator('#recipe-tab-ingredients').waitFor()])
 await app.getByRole('link',{name:'만들어 본 사진 남기기'}).waitFor()
 const a=await geometry(app,actualSelectors,true),m=await geometry(ref,referenceSelectors,false)
 let checked=0
 for(const [name,refRect] of Object.entries(m)){
  assert.ok(refRect&&a[name],'both mock and actual need '+name)
  const expected={...refRect,y:refRect.y+(['cta','nav'].includes(name)?16:-24)}
  const errors=Object.fromEntries(['x','y','w','h'].map(k=>[k,Math.round(a[name][k]-expected[k])]))
  const tolerance=name==='ingredients'?14:12
  for(const [dimension,difference]of Object.entries(errors)){
   assert.ok(Math.abs(difference)<=tolerance,name+' '+dimension+' '+difference+'px exceeds '+tolerance)
   checked++
  }
  console.log('GEOMETRY_PASS',name,JSON.stringify(errors))
 }
 await app.locator('#recipe-tab-method').click()
 assert.equal(await app.locator('#recipe-tab-method').getAttribute('aria-selected'),'true')
 let metrics=await app.evaluate(()=>{
  const img=document.querySelector('#recipe-panel-method img'),panel=document.querySelector('#recipe-panel-method')
  const a=img.getBoundingClientRect(),b=panel.getBoundingClientRect(),s=getComputedStyle(panel)
  return {width:a.width,available:b.width-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),ratio:img.parentElement.clientWidth/img.parentElement.clientHeight}
 })
 assert.ok(metrics.width>=metrics.available-1)
 assert.ok(Math.abs(metrics.ratio-1.5)<.02)
 checked+=2
 await app.getByRole('button',{name:'요리 시작'}).click()
 await app.getByRole('dialog',{name:'요리 모드'}).waitFor()
 checked++
 await app.getByRole('button',{name:'요리 모드 닫기'}).click()
 assert.equal(await app.locator('#recipe-tab-method').getAttribute('aria-selected'),'true')
 checked++
 await app.locator('#recipe-tab-ingredients').click()
 const checkbox=app.locator('[role=checkbox]').first()
 await checkbox.click()
 assert.equal(await checkbox.getAttribute('aria-checked'),'true')
 checked++
 await app.getByRole('button',{name:'1인분 늘리기'}).click()
 assert.match(await app.locator('#recipe-panel-ingredients').innerText(),/300g/)
 checked++
 await app.getByText('가진 재료 양',{exact:false}).first().click()
 await app.locator('#adjust-reference-amount').waitFor()
 assert.equal(await app.locator('nav[aria-label="주요 메뉴"]').isVisible(),false)
 checked++
 await app.locator('#adjust-reference-amount').fill('0')
 assert.equal(await app.locator('#adjust-reference-amount').getAttribute('aria-invalid'),'true')
 checked++
 await app.getByRole('button',{name:'취소'}).click()
 assert.match(await app.locator('#recipe-panel-ingredients').innerText(),/300g/)
 checked++
 for(const width of [320,390,1440]){
  await app.setViewportSize({width,height:844})
  const data=await app.evaluate(()=>{
   const c=document.querySelector('[aria-label="요리 시작"]')?.parentElement?.getBoundingClientRect()
   const n=document.querySelector('nav[aria-label="주요 메뉴"]')?.getBoundingClientRect()
   return {over:document.documentElement.scrollWidth-innerWidth,ctaBottom:c?.bottom,navTop:n?.top}
  })
  assert.ok(data.over<=1&&data.ctaBottom<=data.navTop+2,'nav overlap at '+width+': '+JSON.stringify(data))
  checked++
 }
 const relationHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, OPTIONS'
 }
 const related = await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'})
 await related.route(/^http:\/\/127\.0\.0\.1:65432\/rest\/v1\/content_relations(?:\?|$)/, route => {
  if (route.request().method() === 'OPTIONS') return route.fulfill({status:204,headers:relationHeaders})
  return route.fulfill({
   headers: relationHeaders,
   json: [
    { relation_type: 'made', item: { id: 'related-post', user_id: 'related-author', item_type: 'post', author: { username: '작성자' } } },
    { relation_type: 'adapted', item: { id: 'related-recipe', user_id: 'related-author', item_type: 'recipe', title: '이어 만든 파스타', author: { username: '작성자' } } }
   ]
  })
 })
 await related.goto(actual,{waitUntil:'domcontentloaded'})
 for (const title of ['만들어 본 기록 보기', '이어진 레시피 보기']) {
  const disclosure = related.locator('details').filter({ has: related.locator('summary', { hasText: title }) })
  await disclosure.locator('summary').waitFor()
  assert.equal(await disclosure.locator('ul').isVisible(), true)
  await disclosure.locator('summary').click()
  assert.equal(await disclosure.locator('ul').isVisible(), false)
  await disclosure.locator('summary').press('Enter')
  assert.equal(await disclosure.locator('ul').isVisible(), true)
  checked++
 }
 console.log('REAL_RECIPE_PLAYWRIGHT_PARITY_PASS',checked)
}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
