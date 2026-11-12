import {test,expect} from '@playwright/test';
import {driver} from '../../tests/full-route.mjs';
import {resolve} from '../../src/full/engine';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
import {snapshot,activitySnapshot} from './support';
import {selectInventoryItem} from './stage-support';
import {paidResponseFixture,npcResponseFixtures} from '../../tests/response-context-fixtures.mjs';
import {narrativeFor} from '../src/story-pages';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});

test('NPC options are side by side and one confirmed response writes its real cost without a six-second timer',async({page},info)=>{
  const before=await importRecoveryFixture(page,paidResponseFixture());
  await page.getByTestId('tab-3').click();await page.getByTestId('fate-resume-dialogue').click();
  await expect(page.getByTestId('decide-bargain')).toBeVisible();
  const boxes=await page.locator('.direct-choices .choice-card').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().toJSON()));expect(boxes.length).toBeGreaterThanOrEqual(2);expect(boxes[0].top).toBe(boxes[1].top);expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].left);
  await page.screenshot({path:info.outputPath('direct-npc-choices.png')});
  const raw=await recoveryDatabase(page);await page.getByTestId('decide-bargain').click();
  await expect(page.getByTestId('game-confirmation')).toBeVisible();expect(await recoveryDatabase(page)).toEqual(raw);
  await page.screenshot({path:info.outputPath('direct-npc-one-confirmation.png')});
  await page.getByTestId('game-confirmation-confirm').click();
  await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before.core.revision+1);
  const after=await snapshot(page);expect(after).toEqual(resolve(before,{type:'DECIDE',option:'bargain',commandId:'proof',runId:before.core.runId,expectedRevision:before.core.revision}).nextState);
  expect(await activitySnapshot(page)).toBeNull();await expect(page.getByTestId('training-countdown')).toHaveCount(0);
});

test('a chosen medicine can be used once directly from the inventory without another planner or delay',async({page},info)=>{
  const d=driver();d.buy('healing_pill',3);d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.doAction({type:'BATTLE',move:'attack'});d.doAction({type:'BATTLE',move:'flee'});d.go('cave');
  const before=await importRecoveryFixture(page,d.game);await page.getByTestId('tab-2').click();await selectInventoryItem(page,'healing_pill');
  await expect.poll(()=>page.locator('[data-art-state=loading]:visible').count()).toBe(0);await page.screenshot({path:info.outputPath('direct-inventory-use.png')});
  await page.getByTestId('quick-use-healing_pill').dblclick();await expect.poll(async()=>(await snapshot(page)).core.revision).toBe(before.core.revision+1);
  expect(await snapshot(page)).toEqual(resolve(before,{type:'USE',item:'healing_pill',commandId:'proof',runId:before.core.runId,expectedRevision:before.core.revision}).nextState);
  await expect(page.getByTestId('recovery-planner')).toHaveCount(0);await expect(page.getByTestId('game-confirmation')).toHaveCount(0);expect(await activitySnapshot(page)).toBeNull();
});

for(const {person,game} of npcResponseFixtures())test(`all ${person} response options and full costs remain readable before a readonly cancelled confirmation`,async({page},info)=>{
  const g=await importRecoveryFixture(page,game);await page.getByTestId('tab-3').click();await page.getByTestId('resume-encounter').click();
  const raw=await recoveryDatabase(page),choices=narrativeFor(g)!.choices;
  for(const c of choices){const button=page.getByTestId(c.id);await expect(button).toBeVisible();const geometry=await button.evaluate(node=>{const r=node.getBoundingClientRect(),nav=document.getElementById('primary-navigation')!.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{width:r.width,height:r.height,above:r.bottom<=nav.top,hit:!!hit&&(hit===node||node.contains(hit)),clip:node.scrollHeight>node.clientHeight+1,inside:r.top>=node.closest('.response-canvas')!.getBoundingClientRect().top};});expect(geometry.width).toBeGreaterThanOrEqual(44);expect(geometry.height).toBeGreaterThanOrEqual(44);expect(geometry.above).toBe(true);expect(geometry.hit).toBe(true);expect(geometry.clip).toBe(false);expect(geometry.inside).toBe(true);await expect(button).toContainText(c.detail);}
  await page.screenshot({path:info.outputPath('direct-'+person+'-all-options.png')});
  const allowed=[];for(const c of choices)if(await page.getByTestId(c.id).isEnabled())allowed.push(c);await page.getByTestId(allowed[0].id).click();await expect(page.getByTestId('game-confirmation')).toBeVisible();await page.getByTestId('game-confirmation-cancel').click();expect(await recoveryDatabase(page)).toEqual(raw);
});
