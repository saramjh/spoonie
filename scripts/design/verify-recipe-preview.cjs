const { execFileSync } = require("node:child_process")
const assert = require("node:assert/strict")
const browser = "/Users/ojihun/.local/bin/agent-browser"
const env = { ...process.env, AGENT_BROWSER_SESSION: "spoonie-design-test-" + process.pid }
const url = "http://127.0.0.1:3001/recipes/design-preview"
function run(...args) { return execFileSync(browser, args, { env, encoding: "utf8", timeout: 20000 }) }
function state(code) { return JSON.parse(run("eval", "(" + code + ")")) }
function act(code) { run("eval", code) }
function button(text) { act("Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()===" + JSON.stringify(text) + ")?.click()") }
function check(given, message) { assert.ok(given, message); console.log("PASS", message) }
try {
  run("set", "viewport", "320", "700")
  run("open", url)
  let x = state("({title:document.querySelector('h1')?.textContent,tab:document.querySelector('[role=tab][aria-selected=true]')?.textContent,methodHidden:document.querySelector('#recipe-panel-method')?.hidden,nav:!!document.querySelector('nav[aria-label]'),cta:!!document.querySelector('[aria-label=\"요리 시작\"]'),overflow:document.documentElement.scrollWidth-innerWidth})")
  check(x.title==="토마토 크림 파스타" && x.tab==="재료" && x.methodHidden && x.nav && x.cta,"320px first view has ingredients tab, navigation and cooking action")
  check(x.overflow<=1,"320px viewport has no horizontal overflow")
  x=state("(()=>{const c=document.querySelector('[aria-label=\"요리 시작\"]').getBoundingClientRect(),n=document.querySelector('nav[aria-label]').getBoundingClientRect();return {ctaBottom:c.bottom,navTop:n.top,ctaw:c.width}})()")
  check(x.ctaBottom<=x.navTop+2 && x.ctaw>=275,"cooking action stays above bottom navigation")
  run("focus","#recipe-tab-ingredients")
  run("press","ArrowRight")
  x=state("({tab:document.querySelector('[role=tab][aria-selected=true]')?.textContent,ingredientHidden:document.querySelector('#recipe-panel-ingredients')?.hidden,methodHidden:document.querySelector('#recipe-panel-method')?.hidden,photoWidth:document.querySelector('#recipe-panel-method img')?.getBoundingClientRect().width,panelWidth:document.querySelector('#recipe-panel-method')?.getBoundingClientRect().width})")
  check(x.tab==="만드는 법" && x.ingredientHidden && !x.methodHidden,"keyboard arrow selects method and hides ingredients")
  check(x.photoWidth>0 && x.photoWidth>=x.panelWidth*0.7,"method photo has usable full-column width")
  run("click",'[aria-label="요리 시작"]')
  x=state("({modal:!!document.querySelector('[role=dialog][aria-label=\"요리 모드\"]'),nav:!!document.querySelector('nav[aria-label]')})")
  check(x.modal,"cooking mode opens from shared action")
  run("click",'[aria-label="요리 모드 닫기"]')
  x=state("({modal:!!document.querySelector('[role=dialog][aria-label=\"요리 모드\"]'),tab:document.querySelector('[role=tab][aria-selected=true]')?.textContent})")
  check(!x.modal&&x.tab==="만드는 법","cooking mode close retains prior tab")
  run("click","#recipe-tab-ingredients")
  act("document.querySelector('[role=checkbox]')?.scrollIntoView({block:'center',behavior:'instant'})")
  run("click",'[role="checkbox"]')
  act('document.querySelector("[aria-label=\\"1인분 늘리기\\"]")?.scrollIntoView({block:"center",behavior:"instant"})')
  run("click",'[aria-label="1인분 늘리기"]')
  x=state("({checked:document.querySelector('[role=checkbox]')?.getAttribute('aria-checked'),grams:document.querySelector('#recipe-panel-ingredients').textContent.includes('300g')})")
  check(x.checked==="true"&&x.grams,"servings change preserves ingredient check")
  act("Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('가진 재료 양'))?.click()")
  x=state("({nav:!!document.querySelector('nav[aria-label]'),tabs:!!document.querySelector('[role=tablist]'),toolbar:!!document.querySelector('[aria-label=\"재료량 맞추기 도구\"]'),initial:document.querySelector('#adjust-reference-amount')?.value})")
  check(!x.nav&&!x.tabs&&x.toolbar&&x.initial==="300","quantity editor owns the single bottom toolbar and hides navigation")
  run("fill","#adjust-reference-amount","400")
  x=state("({scaled:document.querySelector('#recipe-panel-ingredients').textContent.includes('20개') && document.querySelector('#adjust-reference-amount')?.value==='400',disabled:Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('이 양 적용'))?.disabled})")
  check(x.scaled&&!x.disabled,"draft quantity previews scaled amounts without immediate commit")
  button("취소")
  x=state("({nav:!!document.querySelector('nav[aria-label]'),grams:document.querySelector('#recipe-panel-ingredients').textContent.includes('300g'),checked:document.querySelector('[role=checkbox]')?.getAttribute('aria-checked')})")
  check(x.nav&&x.grams&&x.checked==="true","cancel restores applied amount, checklist and navigation")
  act("Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('가진 재료 양'))?.click()")
  run("fill","#adjust-reference-amount","0")
  x=state("({disabled:Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('이 양 적용'))?.disabled,invalid:document.querySelector('#adjust-reference-amount')?.getAttribute('aria-invalid')})")
  check(x.disabled&&x.invalid==="true","zero quantity cannot be applied")
  run("fill","#adjust-reference-amount","400")
  button("이 양 적용")
  x=state("({nav:!!document.querySelector('nav[aria-label]'),grams:document.querySelector('#recipe-panel-ingredients').textContent.includes('400g'),checked:document.querySelector('[role=checkbox]')?.getAttribute('aria-checked')})")
  check(x.nav&&x.grams&&x.checked==="true","apply saves valid ratio without losing checks")
  act("Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('가진 재료 양'))?.click()")
  button("원래대로")
  button("취소")
  x=state("document.querySelector('#recipe-panel-ingredients').textContent.includes('400g')")
  check(x,"reset then cancel does not alter committed ratio")
  act("Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('가진 재료 양'))?.click()")
  button("원래대로")
  button("이 양 적용")
  x=state("document.querySelector('#recipe-panel-ingredients').textContent.includes('200g')")
  check(x,"reset then apply restores original quantities")
  for(const [width,height] of [[390,844],[1440,1000]]) {
    run("set","viewport",String(width),String(height))
    x=state("(()=>{const c=document.querySelector('[aria-label=\"요리 시작\"]').getBoundingClientRect(),n=document.querySelector('nav[aria-label]').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth-innerWidth,ctaBottom:c.bottom,navTop:n.top}})()")
    check(x.overflow<=1 && x.ctaBottom<=x.navTop+2,width+"px does not overflow or overlap nav")
  }
  console.log("RECIPE_DESIGN_E2E_PASS")
} finally {
  try { run("close") } catch {}
}
