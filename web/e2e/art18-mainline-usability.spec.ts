import {test,expect,type Page} from '@playwright/test';
import {newGame,advance,validateGame} from '../../src/full/engine.ts';
import {driver} from '../../tests/full-route.mjs';
import {trialJourneyScenario} from '../../tests/trial-journey-route.mjs';
import {feedbackExamples} from '../../tests/action-feedback-fixtures.mjs';
import {importRecoveryFixture,recoveryDatabase} from './idle-recovery-ui-support';
test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});
function fixture(kind:string){
 if(kind==='opening')return newGame('初入山门客','audit-opening');
 if(kind==='qi-school'){const g=driver().checkpoints.mortal;return advance(g,{type:'BREAKTHROUGH',commandId:'audit-qi-school',runId:g.core.runId,expectedRevision:g.core.revision});}
 if(kind==='foundation-growth'||kind==='nascent-growth'){const d=driver();for(let i=0;i<(kind==='foundation-growth'?1:3);i++)d.realm();d.go('cave');return d.game;}
 if(kind==='trial-question')return trialJourneyScenario().states.find((g:any)=>g.trial&&g.trial.answer===null&&!g.battle)!;
 if(kind==='trial-battle')return trialJourneyScenario().states.find((g:any)=>g.battle)!;
 if(kind==='trial-second-gate')return trialJourneyScenario().states.find((g:any)=>g.trial?.stage===2&&g.battle)!;
 if(kind==='needs-recovery')return feedbackExamples().actions.get('REST')!.before;
 if(kind==='sealed-life'){const g=feedbackExamples().actions.get('END')!.before;return advance(g,{type:'END',ending:'transmit',commandId:'audit-sealed',runId:g.core.runId,expectedRevision:g.core.revision});}
 if(kind==='first-cultivation'){let g=newGame('听雨问路客','audit-first');for(const a of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'}]as const)g=advance(g,{...a,commandId:'audit-'+g.core.revision,runId:g.core.runId,expectedRevision:g.core.revision});return g;}
 if(kind==='foundation-preparation'){const d=driver();d.meditate();return d.game;}
 if(kind==='golden-growth'){const d=driver();d.realm();d.realm();d.go('cave');return d.game;}
 if(kind==='trial-ready')return trialJourneyScenario().prepared;
 if(kind==='trial-recovery'){const g=trialJourneyScenario().states.find((g:any)=>g.battle)!;return advance(g,{type:'BATTLE',move:'flee',commandId:'audit-flee',runId:g.core.runId,expectedRevision:g.core.revision});}
 return feedbackExamples().actions.get('END')!.before;
}
async function controls(page:Page){return page.locator('main button:visible').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent?.trim(),label:n.getAttribute('aria-label'),testId:n.getAttribute('data-testid'),disabled:(n as HTMLButtonElement).disabled})));}
for(const kind of ['opening','first-cultivation','qi-school','foundation-preparation','foundation-growth','golden-growth','nascent-growth','needs-recovery','trial-ready','trial-question','trial-battle','trial-second-gate','trial-recovery','ending-ready','sealed-life'])test('ART18-MAIN '+kind+' exposes actual goal gap next actions and readonly return for player review',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const source=fixture(kind);validateGame(source);await importRecoveryFixture(page,source);const before=await recoveryDatabase(page);if(kind==='trial-second-gate')expect(source.trial?.stage).toBe(2);
 if(kind==='sealed-life'){
  const home={content:(await page.locator('main:visible').allInnerTexts()).join('\n'),visibleMainSurfaces:await page.locator('main:visible').count(),primaryNavigationButtons:await page.locator('#primary-navigation button').count()};await page.screenshot({path:info.outputPath(kind+'-home.png')});await page.getByRole('button',{name:'查看生平与收卷',exact:true}).click();await expect(page.getByTestId('life-panel')).toBeVisible();const goal={text:await page.getByTestId('life-panel').innerText()};await page.getByTestId('life-manage-open').click();await expect(page.getByTestId('life-manage-dialog')).toBeVisible();await page.screenshot({path:info.outputPath(kind+'-goal.png')});await page.getByTestId('life-manage-close').click();expect(await recoveryDatabase(page)).toEqual(before);await info.attach(kind+'-player-review',{body:JSON.stringify({kind,facts:{realm:source.core.player.realm,trialStage:source.trial?.stage??null,status:source.status,hp:source.core.player.hp},home,goal,fixture:'Formal-command sealed UI setup; absence of eight-entry HUD is recorded for review, not certified as usability success.',errors}),contentType:'application/json'});return;
 }
 const navigation=page.locator('#primary-navigation');await expect(navigation.getByRole('button')).toHaveCount(8);expect(await page.getByTestId('hub-target').innerText()).not.toBe('');expect(await page.getByTestId('hub-gap').innerText()).not.toBe('');
 const home={hud:await page.getByTestId('game-hud').innerText(),content:await page.locator('#game-content').innerText(),controls:await controls(page),navigation:await navigation.innerText()};await page.screenshot({path:info.outputPath(kind+'-home.png')});
 await page.getByTestId('hub-goal').click();await expect(page.getByTestId('goal-panel')).toBeVisible();const goal={text:await page.getByTestId('goal-panel').innerText(),controls:await controls(page)};expect(await recoveryDatabase(page)).toEqual(before);await page.screenshot({path:info.outputPath(kind+'-goal.png')});await page.getByTestId('hub-close').click();expect(await recoveryDatabase(page)).toEqual(before);
 await info.attach(kind+'-player-review',{body:JSON.stringify({kind,facts:{realm:source.core.player.realm,trialStage:source.trial?.stage??null,status:source.status,hp:source.core.player.hp},home,goal,fixture:'Formal-command UI setup only; not an earned normal route or human comprehension proof.',errors}),contentType:'application/json'});expect(errors).toEqual([]);
});
