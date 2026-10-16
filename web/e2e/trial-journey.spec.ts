import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {advance} from '../../src/full/engine.ts';
import {trialJourneyScenario,nextTrialMove,normalizeTrialGame} from '../../tests/trial-journey-route.mjs';
import {foundation,nextRealm,buy,meditate,go} from './progression';
import {action,snapshot} from './support';
test.use({actionTimeout:8000,navigationTimeout:15000});
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',error=>list.push(error.message));});
test.afterEach(async({page})=>expect(errors.get(page)).toEqual([]));
async function imported(page:Page,game:any){await page.goto('/');await page.getByLabel('导入已有存档',{exact:true}).setInputFiles({name:'legal-trial-journey.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(game))});await expect(page.getByTestId('realm')).toHaveText('化神');await expect.poll(async()=>(await snapshot(page)).core.world.elapsedMonths).toBe(game.core.world.elapsedMonths);}
async function enter(page:Page,answer='accept'){await page.getByTestId('trial-review-entry').click();await action(page,'trial-confirm-entry');await action(page,'answer-'+answer);}
const moveId=(move:string)=>move==='heal'?'battle-heal':move==='restore'?'battle-restore':move;
async function playTo(page:Page,stage:number){for(let n=0;n<120;n++){const game=await snapshot(page);if(game.trial?.stage===stage)return;if(!game.battle)throw new Error('Trial stopped before required gate');await action(page,moveId(nextTrialMove(game)));}throw new Error('Trial move budget');}
async function restoreReview(page:Page){await page.getByTestId('trial-restore-open').click();await expect(page.getByTestId('trial-restore-confirmation')).toBeVisible();}
async function fault(page:Page){await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;(globalThis as any).restoreJourneyPut=()=>{IDBObjectStore.prototype.put=put;};IDBObjectStore.prototype.put=function(value:any,key?:IDBValidKey){if(this.name==='full-state'&&key==='current')throw new DOMException('journey quota','QuotaExceededError');return put.call(this,value,key!);};});}
async function unfault(page:Page){await page.evaluate(()=>(globalThis as any).restoreJourneyPut());}

for(const [school,answer] of [['sword','accept'],['talisman','release']] as const)test(`${school}/${answer}: normal new game crosses all gates with exact resources and resumes every stage and round`,async({page})=>{
 test.setTimeout(300000);await foundation(page,school,'purchase','leave');for(let n=0;n<3;n++)await nextRealm(page,'purchase');
 await buy(page,'ascension_seal',2);await buy(page,'healing_pill',12);await buy(page,'spirit_pill',4);await meditate(page);await go(page,'cave');await page.getByTestId('tab-0').click();if(await page.getByTestId('rest').isEnabled())await action(page,'rest');await go(page,'terrace');await page.getByTestId('tab-0').click();
 const prepared=await snapshot(page);await page.getByTestId('trial-review-entry').click();await action(page,'trial-confirm-entry');await expect(page.getByTestId('trial-question-memory')).toContainText('保留丹药');const question=await snapshot(page);await page.reload();await expect(page.getByTestId('answer-'+answer)).toBeVisible();expect(await snapshot(page)).toEqual(question);await action(page,'answer-'+answer);
 const resumed=new Set<number>();for(let turn=0;turn<120;turn++){
  const before=await snapshot(page);if(!before.battle)break;const stage=before.trial.stage;
  if(!resumed.has(stage)&&before.battle.round>=1){const text=await page.getByTestId('intent').innerText();await page.reload();await expect(page.getByTestId('intent')).toHaveText(text,{useInnerText:true});expect(await snapshot(page)).toEqual(before);resumed.add(stage);}
  await expect(page.getByTestId('trial-selected-effect')).toContainText(answer==='accept'?'每击减伤 10':'直接攻击额外伤害 8');
  const move=nextTrialMove(before),expected=advance(before,{type:'BATTLE',move,commandId:'expected-ui',runId:before.core.runId,expectedRevision:before.core.revision});await action(page,moveId(move));const after=await snapshot(page);expect(after).toEqual(expected);
  if(after.trial?.stage!==stage){await page.reload();await expect(page.getByTestId('trial-stage-summary')).toContainText(`已过 ${after.trial.stage-1} / 3 关`);expect(await snapshot(page)).toEqual(after);}
 }
 const final=await snapshot(page);expect(final.trial.stage).toBe(4);expect(final.status).toBe('active');expect(final.core.player.realm).toBe('spirit');expect(final.wins-prepared.wins).toBe(3);expect(final.core.player.stones).toBe(prepared.core.player.stones);expect(final.core.player.xp).toBe(prepared.core.player.xp);expect(final.core.world.elapsedMonths).toBe(prepared.core.world.elapsedMonths);expect([...resumed]).toEqual([1,2,3]);
 await expect(page.getByTestId('trial-step-trial_gate')).toContainText('已完成');await expect(page.getByTestId('ending-transmit')).toBeVisible();
});

test('two actual lethal failures retain exact consumption across reload and restore the whole preparation on mobile',async({page},info)=>{
 test.setTimeout(300000);await page.setViewportSize({width:390,height:844});await imported(page,trialJourneyScenario().prepared);const prepared=await snapshot(page);
 for(let attempt=0;attempt<2;attempt++){
  await enter(page);await playTo(page,2);await action(page,'battle-heal');
  for(let turn=0;turn<45&&(await snapshot(page)).battle;turn++)await action(page,'guard');
  await expect(page.getByTestId('trial-failure-title')).toBeVisible();await expect(page.getByTestId('trial-failure-reason')).toContainText('未能抵住');await expect(page.getByTestId('trial-consumed')).toContainText('渡劫引 ×1');await expect(page.getByTestId('trial-consumed')).toContainText('回春丹 ×1');const failed=await snapshot(page);expect(failed.core.player.hp).toBe(1);
  await page.reload();await expect(page.getByTestId('trial-consumed')).toContainText('回春丹 ×1');expect(await snapshot(page)).toEqual(failed);
  await page.getByTestId('trial-prepare-again').click();await expect(page.getByTestId('trial-preparation-title')).toBeFocused();expect(await snapshot(page)).toEqual(failed);
  await page.getByTestId('trial-progress').screenshot({path:info.outputPath('trial-loss-mobile.png')});await restoreReview(page);if(attempt===0)await page.getByTestId('trial-restore-confirmation').screenshot({path:info.outputPath('trial-restore-mobile.png')});await page.getByTestId('trial-restore-cancel').click();expect(await snapshot(page)).toEqual(failed);await restoreReview(page);await page.getByTestId('trial-restore-confirm').click();await expect(page.getByTestId('trial-preparation-title')).toBeFocused();expect(normalizeTrialGame(await snapshot(page))).toEqual(normalizeTrialGame(prepared));
 }
});

test('a failed question leaves the exact question and retries one answer without another entry charge',async({page})=>{
 await imported(page,trialJourneyScenario().prepared);await page.getByTestId('trial-review-entry').click();await action(page,'trial-confirm-entry');const before=await snapshot(page);await fault(page);await page.getByTestId('answer-release').click();await expect(page.getByTestId('error')).toContainText('存储空间不足');expect(await snapshot(page)).toEqual(before);await expect(page.getByTestId('answer-release')).toBeVisible();await unfault(page);await action(page,'retry');const after=await snapshot(page);expect(after.trial).toEqual({stage:1,answer:'release'});expect(after.core.inventory).toEqual(before.core.inventory);await page.reload();await expect(page.getByTestId('trial-selected-effect')).toContainText('直接攻击额外伤害 8');expect(await snapshot(page)).toEqual(after);
});

test('failed complete restore can be cancelled or retried without partial state or a second restore',async({page})=>{
 await imported(page,trialJourneyScenario().prepared);const prepared=await snapshot(page);await enter(page);await action(page,'attack');const battle=await snapshot(page);await restoreReview(page);await fault(page);await page.getByTestId('trial-restore-confirm').click();await expect(page.getByTestId('trial-restore-error')).toContainText('存储空间不足');expect(await snapshot(page)).toEqual(battle);await page.getByTestId('trial-restore-cancel').click();await expect(page.getByTestId('retry')).toHaveCount(0);
 await restoreReview(page);await page.getByTestId('trial-restore-confirm').click();await expect(page.getByTestId('trial-restore-error')).toContainText('存储空间不足');await unfault(page);await page.getByTestId('trial-restore-retry').click();await expect(page.getByTestId('trial-preparation-title')).toBeFocused();expect(normalizeTrialGame(await snapshot(page))).toEqual(normalizeTrialGame(prepared));await expect(page.getByTestId('trial-progress')).toHaveCount(0);
});

test('a fixed restore cannot rewind another tab turn or its replacement life',async({page,context})=>{
 await imported(page,trialJourneyScenario().prepared);await enter(page);await restoreReview(page);const other=await context.newPage();await other.goto('/');await expect(other.getByTestId('guard')).toBeVisible();await action(other,'guard');await expect(page.getByTestId('trial-restore-stale')).toBeVisible();await expect(page.getByTestId('trial-restore-confirm')).toBeDisabled();const current=await snapshot(other);await page.getByTestId('trial-restore-confirm').evaluate((button:HTMLButtonElement)=>button.disabled=false);await page.getByTestId('trial-restore-confirm').click();expect(await snapshot(other)).toEqual(current);
 await other.getByRole('button',{name:'设置',exact:true}).click();other.once('dialog',dialog=>dialog.accept());await other.getByTestId('restart').click();await expect(other.getByTestId('help')).toBeVisible();await expect.poll(async()=>(await snapshot(page)).core.runId).toBe((await snapshot(other)).core.runId);await expect(page.getByTestId('trial-restore-stale')).toBeVisible();await page.getByTestId('trial-restore-cancel').click();expect((await snapshot(page)).core.player.realm).toBe('mortal');await other.close();
});

test('an imported battle resumes its actual gate, then withdrawal has no invented cumulative consumption or checkpoint',async({page})=>{
 const game=trialJourneyScenario('talisman','release').states.find((g:any)=>g.trial?.stage===2);await imported(page,game);const before=await snapshot(page);await expect(page.getByTestId('trial-step-trial_thunder')).toHaveAttribute('aria-current','step');await expect(page.getByTestId('trial-checkpoint-unavailable')).toBeVisible();await page.reload();await expect(page.getByTestId('trial-stage-summary')).toContainText('九霄雷劫');expect(await snapshot(page)).toEqual(before);
 await action(page,'flee');await expect(page.getByTestId('trial-failure-reason')).toContainText('主动退离');await expect(page.getByTestId('trial-consumed-unknown')).toBeVisible();await expect(page.getByTestId('trial-restore-open')).toHaveCount(0);await action(page,'rest');await expect(page.getByTestId('trial-failure-title')).toHaveCount(0);await expect(page.getByTestId('trial-preparation')).toBeVisible();
});

test('mobile saved marks and current export remain unchanged while viewing interruption guidance',async({page},info)=>{
 const game=trialJourneyScenario('talisman','release').states.find((g:any)=>g.trial?.stage===2&&g.battle?.marks.length);await page.setViewportSize({width:390,height:844});await imported(page,game);const before=await snapshot(page);await page.getByText('暂离、导出与准备恢复',{exact:true}).click();const event=page.waitForEvent('download');await page.getByTestId('trial-export-current').click();const download=await event;expect(JSON.parse(await readFile((await download.path())!,'utf8'))).toEqual(before);expect(await snapshot(page)).toEqual(before);await page.reload();await expect(page.getByTestId('trial-stage-summary')).toContainText('九霄雷劫');expect(await snapshot(page)).toEqual(before);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByTestId('trial-progress').screenshot({path:info.outputPath('trial-progress-mobile.png')});
});


test('reviewing retirement during a failed preparation navigation cannot retry or discard that separate action',async({page})=>{
 await imported(page,trialJourneyScenario().prepared);const before=await snapshot(page);await fault(page);await page.getByTestId('trial-go-rest').click();await expect(page.getByTestId('retry')).toBeVisible();expect(await snapshot(page)).toEqual(before);
 await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByTestId('settings-retire').click();await expect(page.getByTestId('life-retry')).toHaveCount(0);await page.getByTestId('life-cancel').click();await expect(page.getByTestId('retry')).toBeVisible();await unfault(page);await action(page,'retry');const after=await snapshot(page);expect(after.status).toBe('active');expect(after.core.world.location).toBe('cave');expect(after.core.inventory).toEqual(before.core.inventory);
});
