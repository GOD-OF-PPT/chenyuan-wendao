import {test,expect,type Page,type Locator,type TestInfo} from '@playwright/test';
import {driver,fullRoute} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine';
import {guideCatalog,type GuideId} from '../src/guidance';
import {importRecoveryFixture,recoveryDatabase,recoveryReadonly} from './idle-recovery-ui-support';
import {openAlchemyLibrary,selectInventoryItem} from './stage-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
test.setTimeout(60000);
const errors=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{const rows:string[]=[];errors.set(page,rows);page.on('pageerror',e=>rows.push(e.message));});
test.afterEach(({page})=>expect(errors.get(page)).toEqual([]));
const help=(page:Page)=>page.getByRole('dialog',{name:'玩法帮助',exact:true});
async function press(control:Locator){
 await expect(control).toBeEnabled();
 const g=await control.evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{width:r.width,height:r.height,inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,hit:!!hit&&(hit===n||n.contains(hit))};});
 expect(g.width).toBeGreaterThanOrEqual(44);expect(g.height).toBeGreaterThanOrEqual(44);expect(g.inside).toBe(true);expect(g.hit).toBe(true);await control.click();
}
async function openHelp(page:Page,id:GuideId){
 await press(page.getByTestId('game-settings'));await press(page.getByTestId('gameplay-help-entry'));
 const d=help(page);await expect(d).toBeVisible();await expect(d.locator('#gameplay-help-title')).toBeFocused();
 const target=guideCatalog.find(g=>g.id===id)!,targetIndex=guideCatalog.indexOf(target);
 for(let i=0;i<guideCatalog.length&&await d.locator('.help-chapter h3').innerText()!==target.title;i++){
  const title=await d.locator('.help-chapter h3').innerText(),current=guideCatalog.findIndex(g=>g.title===title);
  expect(current).toBeGreaterThanOrEqual(0);await press(d.getByTestId(current<targetIndex?'catalogue-next':'catalogue-prev'));
 }
 await expect(d.locator('.help-chapter h3')).toHaveText(target.title);return d;
}
async function closeHelp(page:Page){await page.keyboard.press('Escape');await expect(help(page)).toBeHidden();await expect(page.getByTestId('game-settings')).toBeFocused();}
async function chapterFrame(page:Page,info:TestInfo,id:string){
 const g=await help(page).evaluate(n=>{
  const rect=n.getBoundingClientRect();return{overflow:n.scrollHeight>n.clientHeight+1,document:document.documentElement.scrollHeight,rows:[...n.querySelectorAll<HTMLElement>('h2,h3,p,button')].filter(e=>e.getClientRects().length).map(e=>{
   const r=e.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(e);const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
   return{text:e.innerText,font:parseFloat(getComputedStyle(e).fontSize),min:e.matches('.small')?14:18,button:e.matches('button'),height:r.height,inside:r.left>=rect.left&&r.right<=rect.right&&r.top>=rect.top&&r.bottom<=rect.bottom,lines:[...range.getClientRects()].every(x=>x.left>=r.left-.5&&x.right<=r.right+.5&&x.top>=r.top-.5&&x.bottom<=r.bottom+.5),hit:e.matches(':disabled')||!!hit&&(hit===e||e.contains(hit))};
  })};
 });
 await info.attach(id+'-geometry',{body:JSON.stringify(g),contentType:'application/json'});expect(g.document).toBeLessThanOrEqual(900);expect(g.overflow).toBe(false);
 for(const r of g.rows){expect(r.font,r.text).toBeGreaterThanOrEqual(r.min);expect(r.inside,r.text).toBe(true);expect(r.lines,r.text).toBe(true);if(r.button){expect(r.height,r.text).toBeGreaterThanOrEqual(44);expect(r.hit,r.text).toBe(true);}}
 await page.screenshot({path:info.outputPath('help-'+id+'.png')});
}
async function cave(page:Page){const d=driver();d.go('cave');return importRecoveryFixture(page,d.game);}

test('UX22-H1 all twelve manual chapters remain complete readable keyboard pages and never change the full database',async({page},info)=>{
 await cave(page);const before=await recoveryDatabase(page);await openHelp(page,'welcome');
 expect(guideCatalog.map(g=>g.id)).toEqual(['welcome','opening','cultivation','materials','equipment','recovery','breakthrough','battle','causality','trial','ending','save']);
 // The mortal cultivation hint is a contextual variant of the same manual chapter.
 for(const [i,g]of guideCatalog.entries()){
  await expect(help(page).locator('.help-chapter h3')).toHaveText(g.title);await expect(help(page).locator('.help-chapter p')).toHaveText(g.body);
  await chapterFrame(page,info,g.id);expect(await recoveryDatabase(page)).toEqual(before);
  if(i<guideCatalog.length-1){const next=help(page).getByTestId('catalogue-next');await next.focus();await page.keyboard.press('Enter');}
 }
 await expect(help(page).getByTestId('catalogue-next')).toBeDisabled();await closeHelp(page);await openHelp(page,'welcome');await closeHelp(page);expect(await recoveryDatabase(page)).toEqual(before);
});

test('UX22-H2 equipment help names the real school and loadout entries and both school comparisons cancel without writes or a fake timer',async({page})=>{
 const g=driver().checkpoints.mortal,qi=resolve(g,{type:'BREAKTHROUGH',commandId:'ux22-qi',runId:g.core.runId,expectedRevision:g.core.revision}).nextState;
 await importRecoveryFixture(page,qi);await recoveryReadonly(page,async()=>{
  const d=await openHelp(page,'equipment');await expect(d.locator('.help-chapter p')).toContainText('「功法」');await expect(d.locator('.help-chapter p')).not.toContainText('修行页');await closeHelp(page);
  await expect(page.getByTestId('hub-skills')).toHaveText('功法');await press(page.getByTestId('hub-skills'));await press(page.getByTestId('equipment-mode-school'));
  for(const school of ['sword','talisman']){await press(page.getByTestId('school-'+school));await expect(page.getByTestId('configuration-dialog')).toBeVisible();await expect(page.getByTestId('action-execution')).toHaveCount(0);await press(page.getByTestId('configuration-cancel'));await expect(page.getByTestId('school-'+school)).toBeFocused();}
  await press(page.getByTestId('equipment-mode-summary'));await expect(page.getByTestId('loadout-mind')).toBeVisible();await expect(page.getByTestId('hub-relics')).toHaveText('法宝');await press(page.getByTestId('hub-relics'));await press(page.getByTestId('relic-library-open'));await expect(page.getByTestId('relic-library-dialog')).toBeVisible();await press(page.getByTestId('relic-library-close'));
 });
});

test('UX22-H3 material help distinguishes the inventory sources from the alchemy recipe book without travel or crafting',async({page})=>{
 await cave(page);await recoveryReadonly(page,async()=>{
  const d=await openHelp(page,'materials');await expect(d.locator('.help-chapter p')).toContainText('「行囊」');await expect(d.locator('.help-chapter p')).toContainText('「丹炉」');await closeHelp(page);
  await press(page.getByTestId('tab-2'));await selectInventoryItem(page,'healing_pill');await press(page.getByTestId('inventory-main-uses'));await expect(page.getByTestId('track-healing_pill')).toBeVisible();await press(page.getByTestId('inventory-uses-close'));
  await expect(page.getByTestId('hub-forge')).toHaveText('丹炉');await press(page.getByTestId('hub-forge'));await openAlchemyLibrary(page);await expect(page.getByTestId('craft-healing')).toBeVisible();await press(page.getByTestId('alchemy-library-close'));
 });
});

test('UX22-H4 breakthrough help leads to the original thirty second single arrangement and cancelling does not break through',async({page})=>{
 await importRecoveryFixture(page,driver().checkpoints.mortal);await recoveryReadonly(page,async()=>{
  const d=await openHelp(page,'breakthrough');await expect(d.locator('.help-chapter p')).toContainText('读秒');await expect(d.locator('.help-chapter p')).toContainText('保存');await closeHelp(page);
  await press(page.getByTestId('breakthrough'));await expect(page.getByTestId('milestone-review')).toHaveAttribute('data-action','BREAKTHROUGH');await expect(page.getByTestId('milestone-period')).toHaveText('30 秒 · 仅本次');const notes=page.getByTestId('milestone-notes');await press(notes.locator('summary'));await expect(notes.locator(':scope>small').first()).toHaveText('在线 30 秒 · 仅一次 · 初值未平衡');await press(notes.locator('summary'));await expect(page.getByTestId('milestone-confirm')).toHaveText('引气入体');await expect(page.getByTestId('action-execution')).toHaveCount(0);await press(page.getByTestId('milestone-cancel'));await expect(page.getByTestId('breakthrough')).toBeFocused();
 });
});

test('UX22-H5 battle help exposes finite automatic strategy and optional manual control without starting a round',async({page})=>{
 const d=driver();d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});await importRecoveryFixture(page,d.game);
 await recoveryReadonly(page,async()=>{
  const h=await openHelp(page,'battle');await expect(h.locator('.help-chapter p')).toContainText('「战策」');await expect(h.locator('.help-chapter p')).toContainText('自动');await closeHelp(page);
  await press(page.getByTestId('battle-view-strategy'));for(const tab of ['priority','supplies','safety'])await press(page.getByTestId('strategy-tab-'+tab));await expect(page.getByTestId('strategy-risk-pause')).toBeVisible();await expect(page.getByTestId('battle-auto-start')).toContainText('自动斗法');await press(page.getByTestId('battle-manual-takeover'));await expect(page.getByTestId('attack')).toBeVisible();await expect(page.getByTestId('training-activity')).toHaveCount(0);
 });
});

test('UX22-H6 trial help reaches preparation and the explicit fifteen second entry confirmation without consuming the seal',async({page})=>{
 const g=fullRoute('help','sword','craft',true).checkpoints.trial;await importRecoveryFixture(page,g);
 await recoveryReadonly(page,async()=>{
  const d=await openHelp(page,'trial');await expect(d.locator('.help-chapter p')).toContainText('「修行」');await expect(d.locator('.help-chapter p')).toContainText('有有效检查点');await closeHelp(page);
  await expect(page.getByTestId('breakthrough')).toHaveText('查看渡劫准备');await press(page.getByTestId('breakthrough'));await expect(page.getByTestId('trial-preparation-title')).toBeVisible();await press(page.getByTestId('trial-review-entry'));await expect(page.getByTestId('trial-entry-confirmation')).toBeVisible();await expect(page.getByTestId('trial-review-cost')).toContainText('在线15秒');await expect(page.getByTestId('trial-confirm-entry')).toHaveText('安排登台一次 · 15秒');await press(page.getByTestId('trial-entry-cancel'));
 });
});
