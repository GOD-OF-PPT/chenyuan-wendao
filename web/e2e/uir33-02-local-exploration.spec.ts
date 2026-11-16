import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {newGame,advance,resolve} from '../../src/full/engine';
import {completeActivity} from '../../src/full/activity';
import {canonicalFingerprint} from '../../src/full/receipts';
import {validateActivityReceipt} from '../src/activity-persistence';
import {snapshot,activitySnapshot as activity} from './support';
import {importRecoveryFixture,recoveryDatabase as database,recoveryReadonly as readonly,stored} from './idle-recovery-ui-support';
import {openSourceSettings,closeSourceSettings,openSupplySettings,closeSupplySettings} from './stage-support';
import {captureFixedPng} from './png-capture';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(60000);
const errors=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));});
test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));
function mortal(){let g=newGame('问路修士','uir3302-mortal');for(const a of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'}]as const)g=advance(g,{...a,commandId:'prefix'+g.core.revision,runId:g.core.runId,expectedRevision:g.core.revision});return g;}
function qi(place='cave'){const d=driver();d.go(place);return d.game;}
async function map(page:Page){await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-travel').click();await expect(page.getByTestId('journey-map')).toBeVisible();}
async function frame(page:Page,info:TestInfo,name:string){
 const g=await page.getByTestId('adventure-planner').evaluate(root=>{
  const nav=document.getElementById('primary-navigation')!.getBoundingClientRect(),limit=(r:DOMRect)=>r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=nav.top;
  return{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,controls:[...root.querySelectorAll<HTMLButtonElement>('button')].filter(n=>n.checkVisibility()).map(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{text:n.innerText,font:parseFloat(getComputedStyle(n).fontSize),height:r.height,width:r.width,inside:limit(r),hit:n.disabled||hit===n||!!hit&&n.contains(hit),overflow:n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1};}),text:[...root.querySelectorAll<HTMLElement>('.journey-decision strong,.journey-decision p,.journey-decision small,.adventure-heading strong,.adventure-confirm small')].filter(n=>n.checkVisibility()).map(n=>{const r=document.createRange();r.selectNodeContents(n);return{text:n.innerText,font:parseFloat(getComputedStyle(n).fontSize),min:n.tagName==='SMALL'?14:18,ink:[...r.getClientRects()].filter(r=>r.width&&r.height).every(limit)};})};
 });
 await info.attach(name+'-geometry',{body:JSON.stringify(g),contentType:'application/json'});await captureFixedPng(page,info.outputPath(name+'.png'));
 expect(g.width).toBeLessThanOrEqual(1440);expect(g.height).toBeLessThanOrEqual(900);
 for(const c of g.controls){expect(c.height,c.text).toBeGreaterThanOrEqual(44);expect(c.width,c.text).toBeGreaterThanOrEqual(44);expect(c.font,c.text).toBeGreaterThanOrEqual(14);expect(c.inside,c.text).toBe(true);expect(c.hit,c.text).toBe(true);expect(c.overflow,c.text).toBe(false);}
 for(const t of g.text){expect(t.font,t.text).toBeGreaterThanOrEqual(t.min);expect(t.ink,t.text).toBe(true);}
}
async function startTrip(page:Page,to:string){await page.getByTestId('travel-'+to).click();await page.getByTestId('adventure-start').click();await expect.poll(async()=>(await activity(page))?.status).toBe('running');const a=await activity(page);expect(a.plan).toEqual({kind:'travel',location:to,maxCycles:1});expect(a.cycleMs).toBe(6000);return a;}
async function savedTrip(page:Page,info:TestInfo,a:any,before:any,accepted:any){
 await expect.poll(async()=>(await activity(page))?.status).toBe('stopped');const raw=await database(page),formal=resolve(before,a.nextCommand),key=a.runId+':'+a.nextCommand.commandId;
 const records=raw.rows['full-receipts'].filter((r:any)=>r.key===key);expect(records).toHaveLength(1);const r=records[0].value;
 const input={kind:'TICK',tick:{commandId:a.nextCommand.commandId,runId:a.runId,expectedRevision:a.gameRevision,activityId:a.id,expectedActivityRevision:a.revision,ownerId:a.ownerId,generation:a.generation}};
 expect(r.version).toBe(2);expect(r.input).toEqual(input);expect(r.fingerprint).toBe(canonicalFingerprint(input));expect(r.command).toEqual(a.nextCommand);expect(r.result).toEqual(formal.result);
 expect(r.proof.activityBefore).toEqual(a);expect(r.proof.stateAfter).toEqual(formal.nextState);expect(r.proof.resolvedAt).toBeGreaterThanOrEqual(a.dueAt);expect(r.activity).toEqual(completeActivity(formal.nextState,a,formal.result,{commandId:a.nextCommand.commandId,now:r.proof.resolvedAt}));expect(()=>validateActivityReceipt(r,formal.nextState)).not.toThrow();
 expect(await snapshot(page)).toEqual(formal.nextState);expect(stored(raw,'current')).toEqual(formal.nextState);expect(stored(raw,'previous')).toEqual(before);expect(stored(raw,'activity')).toEqual(r.activity);expect(raw.version).toBe(9);
 expect(raw.rows['full-receipts'].filter((x:any)=>x.key!==key)).toEqual(accepted.rows['full-receipts']);expect(raw.rows['full-state'].filter((x:any)=>!['current','previous','activity'].includes(x.key))).toEqual(accepted.rows['full-state'].filter((x:any)=>!['current','previous','activity'].includes(x.key)));
 for(const n of Object.keys(raw.rows).filter(n=>!['full-state','full-receipts'].includes(n)))expect(raw.rows[n],n).toEqual(accepted.rows[n]);
 await info.attach('formal-travel-transaction',{body:JSON.stringify({before,a,accepted,formal,receipt:r,raw}),contentType:'application/json'});return raw;
}

test('UIR33-02-A1 a new mortal cave map offers its real cultivation goal without a same-place route or fake travel duration',async({page},info)=>{
 const before=await importRecoveryFixture(page,mortal()),raw=await database(page);await map(page);await expect(page.getByTestId('journey-local-open')).toHaveText('查看修行目标');await expect(page.locator('.journey-decision strong')).toHaveText('当前所在：听雨洞府');await expect(page.getByTestId('adventure-start')).toHaveCount(0);await expect(page.getByTestId('adventure-preview')).toHaveCount(0);await expect(page.getByTestId('journey-map')).not.toContainText('一次6秒');await expect(page.getByTestId('journey-map').locator('[data-testid^=travel-]')).toHaveCount(6);await frame(page,info,'mortal-current-place');
 await page.getByTestId('journey-local-open').click();await expect(page.getByTestId('goal-panel')).toContainText('引气入体');expect(await database(page)).toEqual(raw);await page.getByTestId('hub-close').click();await expect(page.getByTestId('journey-local-open')).toBeFocused();expect(await snapshot(page)).toEqual(before);expect(await database(page)).toEqual(raw);
});

test('UIR33-02-A2 all six actual locations lead only to their complete existing local catalogue or preparation view',async({browser},info)=>{
 test.setTimeout(90000);const d=driver();while(d.game.core.player.realm!=='spirit')d.realm();
 for(const [place,label,target]of [['cave','查看修行目标','goal-panel'],['wilderness','查看山野取材','source-planner'],['sect','查看宗门委托','source-planner'],['market','查看坊市交易','market-counter'],['secret','查看古境取材','source-planner'],['terrace','查看渡劫准备','goal-panel']]as const){
  const context=await browser.newContext({baseURL:'http://127.0.0.1:4173',viewport:{width:1440,height:900}}),page=await context.newPage(),faults:string[]=[];page.on('pageerror',e=>faults.push(e.message));
  try{d.go(place);const before=await importRecoveryFixture(page,d.game),raw=await database(page);await map(page);await expect(page.getByTestId('journey-local-open')).toHaveText(label);await frame(page,info,'local-'+place);if(place==='wilderness'){await page.getByTestId('journey-local-open').focus();await page.keyboard.press('Enter');}else await page.getByTestId('journey-local-open').click();await expect(page.getByTestId(target)).toBeVisible();if(target!=='goal-panel')await expect(page.getByTestId('explore-mode-'+(target==='market-counter'?'purchase':'source'))).toBeFocused();expect(await database(page)).toEqual(raw);expect(await activity(page)).toBeNull();expect(await snapshot(page)).toEqual(before);if(target==='goal-panel')await page.getByTestId('hub-close').click();else await page.getByTestId('explore-mode-travel').click();await expect(page.getByTestId('travel-'+place)).toHaveAttribute('aria-pressed','true');expect(await database(page)).toEqual(raw);expect(faults).toEqual([]);}finally{await context.close();}
 }
});

test('UIR33-02-A3 only an explicitly selected foreign destination runs the original six-second atomic trip and arrival exposes local viewing without another action',async({page},info)=>{
 const before=await importRecoveryFixture(page,qi()),raw=await database(page);await map(page);await page.getByTestId('travel-wilderness').click();expect(await database(page)).toEqual(raw);await expect(page.getByTestId('journey-local-open')).toHaveCount(0);await expect(page.getByTestId('journey-map')).toContainText('一次6秒');await frame(page,info,'foreign-route-confirmation');const a=await startTrip(page,'wilderness'),accepted=await database(page);
 await page.clock.fastForward(5999);expect(await database(page)).toEqual(accepted);await page.clock.fastForward(1);const done=await savedTrip(page,info,a,before,accepted);await expect(page.getByTestId('journey-local-open')).toHaveText('查看山野取材');await expect(page.getByTestId('adventure-start')).toHaveCount(0);await frame(page,info,'saved-arrival-local-entry');await page.clock.fastForward(86400000);expect(await database(page)).toEqual(done);await readonly(page,async()=>{await page.getByTestId('journey-local-open').click();await expect(page.getByTestId('source-planner')).toBeVisible();});
});

test('UIR33-02-A4 locked destinations and local category returns retain the selected route and all edited source and market limits',async({page},info)=>{
 await importRecoveryFixture(page,qi('wilderness'));await map(page);const raw=await database(page);await page.getByTestId('travel-secret').click();await expect(page.getByTestId('adventure-start')).toBeDisabled();await expect(page.getByTestId('adventure-preview')).toContainText('筑基');await frame(page,info,'locked-foreign-destination');await page.getByTestId('explore-mode-source').click();await openSourceSettings(page,true);await page.getByLabel('取材次数',{exact:true}).selectOption('5');await page.getByLabel('累计游戏月预算',{exact:true}).fill('7');await page.getByLabel('余寿保留量',{exact:true}).fill('11');await closeSourceSettings(page);await page.getByTestId('explore-mode-travel').click();await expect(page.getByTestId('travel-secret')).toHaveAttribute('aria-pressed','true');await page.getByTestId('travel-wilderness').click();await page.getByTestId('journey-local-open').click();await openSourceSettings(page,true);await expect(page.getByLabel('取材次数',{exact:true})).toHaveValue('5');await expect(page.getByLabel('累计游戏月预算',{exact:true})).toHaveValue('7');await expect(page.getByLabel('余寿保留量',{exact:true})).toHaveValue('11');await closeSourceSettings(page);expect(await database(page)).toEqual(raw);
 await page.getByTestId('explore-mode-travel').click();await page.getByTestId('journey-local-open').evaluate(node=>{(node as HTMLButtonElement).click();document.querySelector<HTMLButtonElement>('[data-testid=explore-mode-travel]')!.focus();});await expect(page.getByTestId('source-planner')).toBeVisible();await expect(page.getByTestId('explore-mode-travel')).toBeFocused();expect(await database(page)).toEqual(raw);
 await page.getByTestId('explore-mode-purchase').click();await openSupplySettings(page);await page.getByLabel('交易最多件数').fill('4');await page.getByLabel('累计采购灵石预算').fill('90');await closeSupplySettings(page);await page.getByTestId('explore-mode-travel').click();await page.getByTestId('explore-mode-purchase').click();await openSupplySettings(page);await expect(page.getByLabel('交易最多件数')).toHaveValue('4');await expect(page.getByLabel('累计采购灵石预算')).toHaveValue('90');await closeSupplySettings(page);expect(await database(page)).toEqual(raw);
});

test('UIR33-02-A5 a failed travel keeps its original retry while local viewing cannot replace its command or start another activity',async({page},info)=>{
 const before=await importRecoveryFixture(page,qi('wilderness'));await map(page);const a=await startTrip(page,'sect'),accepted=await database(page);await page.getByTestId('travel-wilderness').click();await frame(page,info,'local-view-during-authorized-trip');await readonly(page,async()=>{await page.getByTestId('journey-local-open').click();await expect(page.getByTestId('source-planner')).toBeVisible();});expect((await activity(page)).nextCommand).toEqual(a.nextCommand);
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-receipts'&&value?.input?.kind==='TICK'){IDBObjectStore.prototype.put=put;throw new DOMException('UIR33-02 original travel quota','QuotaExceededError');}return key===undefined?put.call(this,value):put.call(this,value,key);};});await page.clock.fastForward(6000);await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await database(page)).toEqual(accepted);
 await readonly(page,async()=>{await page.getByTestId('explore-mode-travel').click();await expect(page.getByTestId('journey-local-open')).toHaveText('查看山野取材');await frame(page,info,'local-view-after-original-failure');await page.getByTestId('journey-local-open').click();});expect(await activity(page)).toEqual(a);await page.getByTestId('retry').click();const done=await savedTrip(page,info,a,before,accepted);expect(stored(done,'current').core.world.location).toBe('sect');expect(stored(done,'activity').plan).toEqual(a.plan);await page.clock.fastForward(86400000);expect(await database(page)).toEqual(done);
});
