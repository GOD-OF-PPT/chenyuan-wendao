import {test,expect} from '@playwright/test';
import {advance} from '../../src/full/engine.ts';
import {getCausalAid} from '../../src/full/queries.ts';
import {ascensionMatrix} from '../../tests/ascension-matrix.mjs';
import {nextTrialMove} from '../../tests/trial-journey-route.mjs';
import {foundation,nextRealm,buy,craft,meditate,go} from '../e2e/progression';
import {action,snapshot} from '../e2e/support';
for(const route of ascensionMatrix)test(`normal ${route.id}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await foundation(page,route.school,route.strategy,route.choice);for(let stage=0;stage<3;stage++)await nextRealm(page,route.strategy);
 if(route.strategy==='craft')await craft(page,'ascension');else await buy(page,'ascension_seal',1);
 await buy(page,'healing_pill',12);await buy(page,'spirit_pill',4);await meditate(page);await go(page,'cave');await page.getByTestId('tab-0').click();if(await page.getByTestId('rest').isEnabled())await action(page,'rest');await go(page,'terrace');await page.getByTestId('tab-0').click();
 const prepared=await snapshot(page);expect(getCausalAid(prepared)).toEqual({allDamageReduction:0,thunderDamageReduction:0});expect(prepared.choices).toEqual({});
 await page.getByTestId('trial-review-entry').click();await action(page,'trial-confirm-entry');await action(page,route.school==='sword'?'answer-accept':'answer-release');
 for(let turn=0;turn<120;turn++){
  const before=await snapshot(page);if(!before.battle)break;const move=nextTrialMove(before),expected=advance(before,{type:'BATTLE',move,commandId:'expected-journey',runId:before.core.runId,expectedRevision:before.core.revision});await action(page,move==='heal'?'battle-heal':move==='restore'?'battle-restore':move);expect(await snapshot(page)).toEqual(expected);
  if(expected.trial?.stage!==before.trial.stage){await page.reload();await expect(page.getByTestId('trial-stage-summary')).toContainText(`已过 ${expected.trial.stage-1} / 3 关`);expect(await snapshot(page)).toEqual(expected);}
 }
 const ready=await snapshot(page);expect(ready.trial.stage).toBe(4);expect(ready.wins-prepared.wins).toBe(3);await page.getByTestId('ending-'+route.ending).click();await expect(page.getByTestId('ascension-confirmation')).toBeVisible();expect(await snapshot(page)).toEqual(ready);await page.getByTestId('ascension-cancel').click();expect(await snapshot(page)).toEqual(ready);
 await page.getByTestId('ending-'+route.ending).click();await action(page,'ascension-confirm');const final=await snapshot(page);expect(final.status).toBe('ascended');expect(final.ending).toBe(route.ending);expect(final.core.player.realm).toBe('ascended');expect(final.core.player.xp).toBe(0);expect(final.core.player.hp).toBe(ready.core.player.hp);expect(final.core.player.mp).toBe(ready.core.player.mp);expect(final.core.player.stones).toBe(ready.core.player.stones);expect(final.core.inventory).toEqual(ready.core.inventory);expect(final.choices).toEqual(ready.choices);expect(final.wins).toBe(ready.wins);expect(final.core.world).toEqual(ready.core.world);
 await expect(page.getByTestId('life-title')).toHaveText(route.ending==='transmit'?'飞升 · 留道传承':'飞升 · 独赴上界');await expect(page.getByTestId('ascension-sealed-stats')).toBeVisible();await expect(page.getByTestId('life-pledges')).toContainText('未记录已立下的护阵');await page.reload();await expect(page.getByTestId('realm')).toHaveText('飞升');expect(await snapshot(page)).toEqual(final);await expect(page.getByTestId('tab-0')).toHaveCount(0);await expect(page.getByTestId('cultivate')).toHaveCount(0);expect(await snapshot(page)).toEqual(final);expect(errors).toEqual([]);
});
