const {execFileSync}=require("node:child_process");
const assert=require("node:assert/strict");
const cli="/Users/ojihun/.local/bin/agent-browser";
const run=(session,args)=>execFileSync(cli,args,{env:{...process.env,AGENT_BROWSER_SESSION:session},encoding:"utf8",timeout:30000});
const refSession="spoonie-ref-"+process.pid,appSession="spoonie-app-"+process.pid;
function read(s,impl) {
 const js=impl?
 "(()=>{const e={header:'[data-design-slot=\"header\"]',hero:'[data-design-slot=\"hero\"]',summary:'[data-design-slot=\"summary\"]',title:'[data-design-slot=\"title\"]',tags:'[data-design-slot=\"tags\"]',social:'[data-design-slot=\"social\"]',tabs:'[role=tablist]',ingredients:'[data-design-slot=\"ingredients\"]',cta:'[aria-label=\"요리 시작\"]',nav:'nav[aria-label=\"주요 메뉴\"]'};return Object.fromEntries(Object.entries(e).map(([k,q])=>{const el=document.querySelector(q);if(!el)return[k,null];let r=el.getBoundingClientRect();if(k==='cta')r=el.parentElement.getBoundingClientRect();if(k==='summary'){const t=document.querySelector(e.social)?.getBoundingClientRect();if(t)r={x:r.x,y:r.y,width:r.width,height:t.bottom-r.y}}return[k,{x:r.x,y:r.y,w:r.width,h:r.height}]}))})()":
 "(()=>{const e={header:'.app-topbar',hero:'.detail-hero .photo',summary:'.detail-summary',title:'.detail-title',tags:'.detail-summary .tags',social:'.detail-summary .social-actions',tabs:'.sticky-tabs',ingredients:'.ingredient-head',cta:'.app-dock',nav:'.app-nav'};return Object.fromEntries(Object.entries(e).map(([k,q])=>{const el=document.querySelector(q);if(!el)return[k,null];const r=el.getBoundingClientRect();return[k,{x:r.x,y:r.y,w:r.width,h:r.height}]}))})()";
 return JSON.parse(run(s,["eval",js]));
}
try{
 for(const s of [refSession,appSession])run(s,["set","viewport","390","844"]);
 run(refSession,["open","http://127.0.0.1:49152/index.html?screen=recipe&revision=20261107-3"]);
 run(appSession,["open","http://127.0.0.1:3001/recipes/design-preview"]);
 const a=read(appSession,true),t=read(refSession,false);
 const errors=[];
 for(const k of Object.keys(t)){
  if(!a[k]){errors.push(k+" missing actual renderer element");continue}
  const expected={...t[k],y:t[k].y+((k==="cta"||k==="nav")?16:-24)};
  const diffs=Object.fromEntries(["x","y","w","h"].map(d=>[d,Math.round(a[k][d]-expected[d])]));
  console.log(k+" "+JSON.stringify(diffs));
  const tol=k==="ingredients"?14:12;
  for(const [d,diff] of Object.entries(diffs))if(Math.abs(diff)>tol)errors.push(k+" "+d+" "+diff+"px");
 }
 console.log("VISUAL_GEOMETRY_ERRORS",JSON.stringify(errors));
 if(errors.length)process.exitCode=1;
 else console.log("VISUAL_GEOMETRY_PASS");
 run(appSession,["screenshot","/private/tmp/spoonie-real-design-after-architecture-change-20261107.png"]);
} finally{
 for(const s of [refSession,appSession])try{run(s,["close"])}catch{}
}
