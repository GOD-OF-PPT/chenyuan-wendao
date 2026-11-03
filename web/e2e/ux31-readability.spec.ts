import {test,expect,type Page,type Locator,type TestInfo} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import * as C from '../../src/full/content';
import {resolve} from '../../src/full/engine';
import {importRecoveryFixture,recoveryDatabase as database} from './idle-recovery-ui-support';
import {snapshot,activitySnapshot as activity,openHubFeature} from './support';
import * as stage from './stage-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
const errors=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{const rows:string[]=[];errors.set(page,rows);page.on('pageerror',e=>rows.push(e.message));});
test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));

function recoveryFixture(){
 const d=driver();d.realm();d.funds(300);d.buy('healing_pill',6);d.buy('spirit_pill',6);d.go('wilderness');
 d.doAction({type:'ENCOUNTER',enemy:'wolf'});
 for(let n=0;n<9;n++)d.doAction({type:'BATTLE',move:n%3===2?'attack':'guard'});
 d.doAction({type:'BATTLE',move:'technique'});if(d.game.battle)d.doAction({type:'BATTLE',move:'flee'});d.go('cave');return d;
}
async function openMedicine(page:Page,id='healing_pill'){
 await page.getByTestId('tab-2').click();await stage.selectInventoryItem(page,id);await stage.inspectInventorySupply(page,id,'use');
}
async function readonly(page:Page,work:()=>Promise<void>){const before=await database(page);await work();expect(await database(page)).toEqual(before);}
async function frame(page:Page,info:TestInfo,name:string,root:Locator){
 const g=await root.evaluate(root=>{
  const dialog=root.closest('dialog'),nav=document.getElementById('primary-navigation')!.getBoundingClientRect(),limit=dialog?innerHeight:nav.top;
  return{pageHeight:document.documentElement.scrollHeight,pageWidth:document.documentElement.scrollWidth,
   controls:[...root.querySelectorAll<HTMLElement>('button,input,select,summary')].filter(n=>n.checkVisibility()).map(n=>{
    const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return{text:n.innerText,h:r.height,w:r.width,inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=limit,
     hit:n.matches(':disabled')||!!hit&&(hit===n||n.contains(hit)),unclipped:n.scrollWidth<=n.clientWidth+1&&n.scrollHeight<=n.clientHeight+1};
   })};
 });
 await info.attach(name+'-controls',{body:JSON.stringify(g),contentType:'application/json'});
 await page.screenshot({path:info.outputPath(name+'.png')});
 expect(g.pageHeight).toBeLessThanOrEqual(900);expect(g.pageWidth).toBeLessThanOrEqual(1440);
 for(const r of g.controls){expect(r.h,r.text).toBeGreaterThanOrEqual(44);expect(r.w,r.text).toBeGreaterThanOrEqual(44);expect(r.inside,r.text).toBe(true);expect(r.hit,r.text).toBe(true);expect(r.unclipped,r.text).toBe(true);}
}
async function word(locator:Locator,phrase:string,minimum:number){
 await expect(locator).toBeVisible();await expect(locator).toContainText(phrase);
 const g=await locator.evaluate((node,phrase)=>{
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),rects=[];let found=false;
  while(walker.nextNode()){const text=walker.currentNode,at=text.textContent?.indexOf(phrase)??-1;if(at<0)continue;found=true;
   const range=document.createRange();range.setStart(text,at);range.setEnd(text,at+phrase.length);
   for(const r of range.getClientRects())if(r.width&&r.height)rects.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom});
  }
  const box=node.getBoundingClientRect();return{found,rows:[...new Set(rects.map(r=>Math.round(r.top*100)))],rects,font:parseFloat(getComputedStyle(node).fontSize),inside:rects.every(r=>r.left>=box.left-.5&&r.right<=box.right+.5&&r.top>=box.top-.5&&r.bottom<=box.bottom+.5)};
 },phrase);
 expect(g.found,phrase).toBe(true);expect(g.rects.length,phrase).toBeGreaterThan(0);expect(g.rows,phrase+' remains one readable word group').toHaveLength(1);expect(g.font,phrase).toBeGreaterThanOrEqual(minimum);expect(g.inside,phrase).toBe(true);
}
async function fallback(page:Page,info:TestInfo,name:string,id:string){
 const art=page.locator('.recovery-medicine [data-art-state]');await expect(art).toHaveAttribute('data-art-state','failed');
 const caption=page.locator('.recovery-medicine .asset-fallback small');await expect(caption).toContainText(C.items[id].name+' · 绘图暂缺');
 const g=await caption.evaluate(node=>{
  const range=document.createRange();range.selectNodeContents(node);const words=[...range.getClientRects()].filter(r=>r.width&&r.height).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));
  const bowl=document.querySelector('.recovery-jade-bowl')!,box=bowl.getBoundingClientRect(),css=getComputedStyle(bowl,'::before');
  const rim={left:box.left+parseFloat(css.left),right:box.right-parseFloat(css.right),top:box.top+parseFloat(css.top),bottom:box.top+parseFloat(css.top)+parseFloat(css.height)+parseFloat(css.borderTopWidth)+parseFloat(css.borderBottomWidth)};
  const overlaps=(a:any,b:any)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  return{words,bowl:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},rim,font:parseFloat(getComputedStyle(node).fontSize),occluded:words.some(r=>overlaps(r,box)||overlaps(r,rim))};
 });
 await info.attach(name+'-caption',{body:JSON.stringify(g),contentType:'application/json'});await frame(page,info,name,page.getByTestId('recovery-ritual'));
 expect(g.words.length).toBeGreaterThan(0);expect(g.font).toBeGreaterThanOrEqual(14);expect(g.occluded,'full fallback words avoid bowl and rim').toBe(false);
}
async function quotaStart(page:Page){
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){
  if(this.name==='full-receipts'&&value?.input?.kind==='START'){IDBObjectStore.prototype.put=put;throw new DOMException('UX31 START quota','QuotaExceededError');}
  return key===undefined?put.call(this,value):put.call(this,value,key);
 };});
}
async function finishCycle(page:Page,a:any,before:any,accepted:any){
 await page.clock.fastForward(a.cycleMs-1);expect(await database(page)).toEqual(accepted);
 await page.clock.fastForward(1);await expect.poll(async()=>(await activity(page)).completedCycles).toBe(a.completedCycles+1);
 const raw=await database(page),formal=resolve(before,a.nextCommand),rows=raw.rows['full-receipts'].filter((r:any)=>r.key===a.runId+':'+a.nextCommand.commandId);
 expect(await snapshot(page)).toEqual(formal.nextState);expect(rows).toHaveLength(1);expect(rows[0].value.command).toEqual(a.nextCommand);expect(rows[0].value.result).toEqual(formal.result);return raw;
}

test('UX31-A1 both medicine fallbacks keep complete words clear of the bowl through a real failed acceptance and original retry',async({page},info)=>{
 await page.route('**/art/v2/items/*-v1.webp',route=>route.fulfill({status:200,contentType:'image/webp',body:'UX31 isolated missing art'}));
 const before=await importRecoveryFixture(page,recoveryFixture().game);await openMedicine(page);
 for(const id of ['healing_pill','spirit_pill'])await readonly(page,async()=>{await stage.selectRecoveryMethod(page,id);await fallback(page,info,id+'-complete-fallback',id);});
 const raw=await database(page);await quotaStart(page);await page.getByTestId('preparation-start').click();await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await database(page)).toEqual(raw);
 await fallback(page,info,'failed-medicine-complete-fallback','spirit_pill');await page.getByTestId('retry').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');
 const a=await activity(page);await expect(page.getByTestId('training-countdown')).toHaveText('6.0 秒');await finishCycle(page,a,before,await database(page));await fallback(page,info,'saved-medicine-complete-fallback','spirit_pill');
});

test('UX31-A2 trade direction and recovery reserve values stay in complete word groups while all viewing stays readonly',async({page},info)=>{
 const d=recoveryFixture();d.go('market');await importRecoveryFixture(page,d.game);const raw=await database(page);
 await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-purchase').click();await stage.selectMarketItem(page,'herb','buy');
 for(const mode of ['buy','sell']){await stage.selectMarketMode(page,mode);await word(page.locator('.counter-exchange>strong'),mode==='buy'?'灵石换物':'物资换石',18);await word(page.locator('.counter-exchange>small'),mode==='buy'?'物资入囊':'收取灵石',14);await frame(page,info,mode+'-grouped-direction',page.getByTestId('market-counter'));expect(await database(page)).toEqual(raw);}
 await openMedicine(page);for(const reserve of [0,C.maxQuantity]){
  await stage.openSupplySettings(page);await page.getByLabel('最多服丹数').fill('50');await page.getByLabel('服丹库存保留量').fill(String(reserve));await stage.closeSupplySettings(page);
  await word(page.getByTestId('recovery-plan-open'),'库存保留 '+reserve,18);await expect(page.getByTestId('recovery-plan-open')).toContainText('最多 50 丹');await frame(page,info,'reserve-'+reserve+'-grouped',page.getByTestId('recovery-ritual'));expect(await database(page)).toEqual(raw);
 }
});

test('UX31-A3 unmade owned and bound relic labels remain complete words during a real unrelated saved-error state',async({page},info)=>{
 const d=driver();for(let i=0;i<4;i++)d.realm();d.resource('jade',7);d.resource('core',1);d.funds(2000);d.go('cave');d.doAction({type:'FORGE',relic:'jade_seal'});d.doAction({type:'FORGE',relic:'frost_sword'});d.doAction({type:'EQUIP_RELIC',relic:'frost_sword'});d.go('sect');
 const g=await importRecoveryFixture(page,d.game),raw=await database(page);
 for(const error of [false,true]){
  if(error){await page.getByTestId('hub-skills').click();await page.getByTestId('equipment-mode-skills').click();await stage.selectLearningSkill(page,'sword_guard');await page.getByTestId('learn-sword_guard').click();await quotaStart(page);await page.getByTestId('preparation-start').click();await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await database(page)).toEqual(raw);}
  await openHubFeature(page,'relics');
  for(const id of Object.keys(C.relics)){await stage.selectRelic(page,id);const owned=g.ownedRelics.includes(id),bound=g.loadout.relic===id;
   const phrases=owned?bound?['已装备为本命']:['已炼成','尚未装备']:['器谱冷胚示意','尚未炼成'];for(const phrase of phrases)await word(page.getByTestId('production-relic-state'),phrase,18);
   await frame(page,info,id+(error?'-failed':'-normal')+'-complete-state',page.getByTestId('relic-atelier'));expect(await database(page)).toEqual(raw);
  }
 }
});

test('UX31-A4 paused study keeps a concise current state and full progress on demand before the original remaining cycle resumes',async({page},info)=>{
 const d=driver();d.realm();d.realm();d.funds(2000);d.go('sect');await importRecoveryFixture(page,d.game);await page.getByTestId('hub-skills').click();await page.getByTestId('equipment-mode-skills').click();
 for(const id of ['sword_guard','sword_echo']){await stage.selectLearningSkill(page,id);await page.getByTestId('learn-'+id).click();}
 const before=await snapshot(page);await page.getByTestId('preparation-start').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');const a=await activity(page);await finishCycle(page,a,before,await database(page));
 await page.getByTestId('training-pause').click();await expect.poll(async()=>(await activity(page))?.status).toBe('paused');const paused=await activity(page),raw=await database(page),g=await snapshot(page),root=page.getByTestId('learning-planner');
 await expect(root.getByTestId('preparation-plan-state')).toHaveText('原已保存安排');await expect(root.getByTestId('preparation-start')).toHaveText('上方继续研习');await expect(root.getByTestId('preparation-start')).toBeDisabled();await expect(page.getByTestId('paused-plan-progress')).toBeHidden();
 await expect(page.getByTestId('jade-study-status')).toContainText('此段研习已暂停');await expect(root.locator('.art10-authorization-summary')).toContainText('累计灵石上限 240 · 保留 0');await frame(page,info,'concise-paused-study',root);
 await readonly(page,async()=>{await stage.openLearningSettings(page);await expect(page.getByTestId('paused-plan-progress')).toBeVisible();await expect(page.getByTestId('paused-plan-progress')).toContainText('已完成 1 / 2 卷');await expect(page.getByTestId('learning-full-estimate')).toContainText('继续沿用原累计预算与保留线');await expect(page.getByTestId('learning-full-estimate')).toContainText('新安排预演');await frame(page,info,'complete-paused-progress',page.getByTestId('learning-plan-dialog'));await stage.closeLearningSettings(page);});
 expect(await database(page)).toEqual(raw);await page.getByTestId('training-resume').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');const resumed=await activity(page);expect(resumed.id).toBe(paused.id);expect(resumed.plan).toEqual(paused.plan);expect(resumed.spentStones).toBe(paused.spentStones);await expect(page.getByTestId('training-countdown')).toHaveText('30.0 秒');await finishCycle(page,resumed,g,await database(page));await expect.poll(async()=>(await activity(page)).status).toBe('stopped');
});
