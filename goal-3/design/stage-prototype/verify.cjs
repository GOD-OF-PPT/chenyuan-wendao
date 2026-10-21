const {chromium}=require('../../../web/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await context.newPage();page.setDefaultTimeout(8000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const out=path.resolve(__dirname,'../../../artifacts/goal-3/u8-a/hierarchy-prototype-qa');fs.mkdirSync(out,{recursive:true});
 const result={viewport:{width:1440,height:900},browser:'single Chromium',pages:[],errors,checks:[],gameSaveTouched:false};
 try{
  await page.goto('http://127.0.0.1:56885/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#navigation button').count(),8);
  for(const name of ['alchemy','cultivate','explore','study','relic','inventory','fate','life']){
   await page.locator(`[data-page="${name}"]`).click();
   await page.waitForLoadState('networkidle');
   const geometry=await page.evaluate(()=>{
    const nav=document.querySelector('.dock').getBoundingClientRect();
    return [...document.querySelectorAll('main button,main input,main select,#navigation button,.hud button,.journal')].filter(el=>el.getBoundingClientRect().width>0).map(el=>{
     const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
     return {label:el.textContent.trim(),inside:r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,aboveDock:!!el.closest('.dock')||r.bottom<=nav.top,hit:!!hit&&(el===hit||el.contains(hit)),height:r.height};
    });
   });
   assert.ok(geometry.every(r=>r.inside&&r.aboveDock&&r.hit&&r.height>=44),JSON.stringify({name,failed:geometry.filter(r=>!r.inside||!r.aboveDock||!r.hit||r.height<44)}));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),true,name);
   assert.ok(await page.locator('main .primary:not(:disabled)').count()<=1,name);
   result.pages.push({name,visibleControls:geometry.length,allInsideAndHit:true,atMostOnePrimary:true});
   if(['alchemy','inventory'].includes(name))await page.screenshot({path:path.join(out,name+'.png')});
  }
  await page.locator('[data-page="alchemy"]').click();await page.getByText('调整这次安排',{exact:true}).click();
  await page.locator('#cycles-input').fill('3');await page.locator('#budget-input').fill('6');await page.locator('#apply-plan').click();
  assert.match(await page.locator('.plan-line').innerText(),/本段 3 炉.*灵石上限 6/);
  await page.locator('#main-action').click();assert.equal(await page.locator('#activity').isVisible(),true);
  await page.waitForTimeout(600);const count=await page.locator('#countdown').innerText();assert.match(count,/00:(29|30)/);
  await page.locator('[data-page="inventory"]').click();assert.equal(await page.locator('#activity').isVisible(),true);
  await page.locator('#pause').click();assert.match(await page.locator('#activity-state').innerText(),/已暂停/);
  const paused=await page.locator('#countdown').innerText();await page.waitForTimeout(200);assert.equal(await page.locator('#countdown').innerText(),paused);
  await page.locator('#activity-view').click();await page.locator('#stop-activity').click();assert.equal(await page.locator('#activity').isVisible(),false);
  result.checks.push('edit finite plan before starting','cross-page activity remains visible','pause freezes displayed timer','explicit stop only clears prototype activity');
  await page.locator('#goal').click();await page.locator('dialog [data-route=alchemy]').click();assert.equal(await page.locator('[data-recipe="2"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#activity').isVisible(),false);
  for(const id of ['profile','help','settings','journal']){await page.locator('#'+id).click();assert.equal(await page.locator('dialog[open]').count(),1);await page.locator('#close-detail').click();}
  result.checks.push('goal source navigation is read-only','one detail surface with reachable close');
  assert.deepEqual(await page.evaluate(async()=>({local:localStorage.length,session:sessionStorage.length,databases:(await indexedDB.databases()).length})),{local:0,session:0,databases:0});
  assert.deepEqual(errors,[]);result.status='passed';
 }catch(e){result.status='failed';result.failure=String(e);await page.screenshot({path:path.join(out,'failure.png')});throw e;}
 finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');await browser.close();}
 console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;});
