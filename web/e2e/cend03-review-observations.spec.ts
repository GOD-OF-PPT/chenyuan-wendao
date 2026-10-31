import {test,expect,type Page,type Locator} from '@playwright/test';
import {feedbackExamples} from '../../tests/action-feedback-fixtures.mjs';
import {previewAction} from '../../src/full/queries';
import {validateGame} from '../../src/full/engine';
import {stats,resolve} from '../../src/full/engine';
import {trialPreparationRunner} from '../../tests/trial-preparation-route.mjs';
import {importRecoveryFixture,recoveryDatabase as database,recoveryReadonly,stored,runRecoveryPlan,recoveryMove,openRecoveryRestore} from './idle-recovery-ui-support';
import {openHubFeature,revealPaged} from './support';
import {selectPlan} from './idle-route-support';
import {selectLearningSkill,selectAlchemyRecipe,selectRelic,selectSource,selectInventoryItem,inspectInventorySupply,selectMarketItem,openLearningSettings,closeLearningSettings,openSupplySettings,closeSupplySettings,openProductionSettings,closeProductionSettings,openRecoveryOptions,closeRecoveryOptions} from './stage-support';

test.use({viewport:{width:1440,height:900},actionTimeout:8000,navigationTimeout:15000});test.setTimeout(60000);
const examples=feedbackExamples().actions;
const actions=['CHOOSE','TRAVEL','CULTIVATE','SOURCE','BUY','SELL','CRAFT','USE','REST','BREAKTHROUGH','SCHOOL','STUDY','LEARN','EQUIP','FORGE','EQUIP_RELIC','ENCOUNTER','BATTLE','EVENT','DECIDE','START_TRIAL','ANSWER_TRIAL','END','RETIRE','END_LIFE'];

async function narrative(page:Page,id:string){
 await page.getByTestId('tab-0').click();await page.getByTestId('hub-current').getByRole('button',{name:/^(继续当前遭遇|查看问心选择|查看收卷选择)$/,exact:true}).click();
 if(await page.getByTestId('story-show-choices').isVisible())await page.getByTestId('story-show-choices').click();
 await page.getByTestId('response-choices-open').click();await expect(page.getByTestId('response-choices-dialog')).toBeVisible();await page.getByTestId('story-select-'+id).click();await page.getByTestId(id).click();
}
async function decisionSurface(page:Page,a:any):Promise<{root:Locator;control:Locator;details?:()=>Promise<void>;closeDetails?:()=>Promise<void>}>{
 const panel=(id:string,control:string,details?:()=>Promise<void>,closeDetails?:()=>Promise<void>)=>({root:page.getByTestId(id),control:page.getByTestId(control),details,closeDetails});
 const milestone=()=>panel('milestone-review','milestone-confirm');
 switch(a.type){
  case 'CHOOSE':await page.getByTestId(a.choice).click();return milestone();
  case 'TRAVEL':await selectPlan(page,{kind:'travel',location:a.location,maxCycles:1});return panel('adventure-planner','adventure-start');
  case 'CULTIVATE':await openHubFeature(page,'cultivation-details');await page.getByTestId('cultivation-method-'+a.method).click();return panel('cultivation-catalogue','training-start');
  case 'SOURCE':await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-source').click();await selectSource(page,a.sourceId);return panel('source-planner','source-start');
  case 'BUY':case 'SELL':await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-purchase').click();await selectMarketItem(page,a.item,a.type==='BUY'?'buy':'sell');return panel('market-planner','preparation-start',()=>openSupplySettings(page),()=>closeSupplySettings(page));
  case 'CRAFT':await openHubFeature(page,'forge');await selectAlchemyRecipe(page,a.recipeId);return panel('recipe-catalogue','production-start',()=>openProductionSettings(page),()=>closeProductionSettings(page));
  case 'FORGE':case 'EQUIP_RELIC':await openHubFeature(page,'relics');await selectRelic(page,a.relic);if(a.type==='EQUIP_RELIC'){await page.getByTestId('equip-relic-'+a.relic).click();return panel('configuration-dialog','configuration-confirm');}return panel('forging-planner','production-start');
  case 'STUDY':await openHubFeature(page,'skills');await page.getByTestId('equipment-mode-manual').click();return panel('learning-planner','preparation-start',()=>openLearningSettings(page),()=>closeLearningSettings(page));
  case 'LEARN':case 'EQUIP':await openHubFeature(page,'skills');await page.getByTestId('equipment-mode-skills').click();await selectLearningSkill(page,a.skill);await page.getByTestId((a.type==='LEARN'?'learn-':'equip-')+a.skill).click();return a.type==='LEARN'?panel('learning-planner','preparation-start',()=>openLearningSettings(page),()=>closeLearningSettings(page)):panel('configuration-dialog','configuration-confirm');
  case 'SCHOOL':await openHubFeature(page,'skills');await page.getByTestId('equipment-mode-school').click();await page.getByTestId('school-'+a.school).click();return panel('configuration-dialog','configuration-confirm');
  case 'USE':await page.getByTestId('tab-2').click();await selectInventoryItem(page,a.item);await inspectInventorySupply(page,a.item,'use');return panel('recovery-planner','preparation-start',()=>openSupplySettings(page),()=>closeSupplySettings(page));
  case 'REST':await openHubFeature(page,'cultivation-details');await page.getByTestId('rest').click();return panel('recovery-planner','preparation-start',()=>openSupplySettings(page),()=>closeSupplySettings(page));
  case 'ENCOUNTER':await page.getByTestId('tab-1').click();await page.getByTestId('explore-mode-battle').click();await revealPaged(page,'encounter-'+a.enemy,'adventure-planner','敌方');await page.getByTestId('encounter-'+a.enemy).click();return panel('adventure-planner','adventure-start');
  case 'BATTLE':await page.getByTestId('tab-0').click();return panel('battle-stage','battle-auto-start');
  case 'EVENT':await page.getByTestId('tab-3').click();await page.getByTestId('fate-mode-events').click();await page.getByTestId('event-'+a.event).click();return milestone();
  case 'DECIDE':await narrative(page,'decide-'+a.option);return milestone();
  case 'BREAKTHROUGH':case 'START_TRIAL':case 'ANSWER_TRIAL':case 'END':{
   const selected=await selectPlan(page,{kind:'milestone',action:a,maxCycles:1});return{root:page.locator('dialog[open]'),control:selected.control};
  }
  case 'RETIRE':case 'END_LIFE':await openHubFeature(page,'life');await page.getByTestId('life-manage-open').click();await page.getByTestId(a.type==='RETIRE'?'retire':'end-life').click();return{root:page.locator('dialog[open]'),control:page.getByTestId('life-confirm-end')};
  default:throw Error('No audited visible entry for '+a.type);
 }
}
async function readSurface(root:Locator){
 return root.evaluate(n=>({text:(n as HTMLElement).innerText,controls:[...n.querySelectorAll<HTMLElement>('button,input,select')].filter(x=>x.getClientRects().length&&getComputedStyle(x).visibility!=='hidden').map(x=>({id:x.dataset.testid,label:x.getAttribute('aria-label'),text:x.innerText,value:x instanceof HTMLInputElement||x instanceof HTMLSelectElement?x.value:null,disabled:(x as HTMLButtonElement).disabled})),seconds:[...(n as HTMLElement).innerText.matchAll(/\d+(?:\.\d+)?\s*秒/g)].map(m=>m[0])}));
}
for(const type of actions)test('CEND03 readonly '+type+' exposes the real decision object costs authorization and pre-action time for review',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const example=examples.get(type);expect(example).toBeTruthy();validateGame(example.before);const game=await importRecoveryFixture(page,example.before),raw=await database(page);const surface=await decisionSurface(page,example.action);await expect(surface.root).toBeVisible();await expect(surface.control).toBeVisible();
 const main=await readSurface(surface.root),control=await surface.control.evaluate(n=>({id:(n as HTMLElement).dataset.testid,text:n.textContent,disabled:(n as HTMLButtonElement).disabled}));await page.screenshot({path:info.outputPath(type+'-actual-decision.png')});expect(await database(page)).toEqual(raw);
 let details:any=null,ways:any=null;
 if(surface.details){await surface.details();details=await readSurface(page.locator('dialog[open]'));expect(await database(page)).toEqual(raw);await surface.closeDetails!();}
 if(type==='REST'||type==='USE'){await openRecoveryOptions(page);ways=await readSurface(page.getByTestId('recovery-options-dialog'));await closeRecoveryOptions(page);expect(await database(page)).toEqual(raw);}
 const quote=previewAction(game,example.action);await info.attach(type+'-decision-observation',{body:JSON.stringify({action:type,selectedOriginalPrimitive:example.action,fixtureFacts:{realm:game.core.player.realm,location:game.core.world.location,activeEvent:game.core.activeEvent?.id??null,trial:game.trial?.stage??null},formalPrimitiveAllowed:quote.allowed,main,control,details,ways,allGameDBUnchanged:true,errors,scope:'Current real readonly entry/decision on a formal-command fixture. Not action execution, normal earning, human understanding or a usability pass.'}),contentType:'application/json'});expect(errors).toEqual([]);
});

test('CEND03 extra foreign rest preserves Game and records the actual travel preparation and disclosed time',async({page},info)=>{
 const example=examples.get('USE'),before=example.before,foreign=resolve(before,{type:'TRAVEL',location:'sect',commandId:'cend03-foreign-rule-prefix',runId:before.core.runId,expectedRevision:before.core.revision}).nextState,game=await importRecoveryFixture(page,foreign);expect(game.core.world.location).toBe('sect');const raw=await database(page);
 await decisionSurface(page,example.action);await openRecoveryOptions(page);await page.getByTestId('recovery-rest').click();await expect(page.getByTestId('preparation-travel')).toBeEnabled();const main=await readSurface(page.getByTestId('recovery-planner'));await page.screenshot({path:info.outputPath('foreign-rest-main-before-travel.png')});await openSupplySettings(page);const details=await readSurface(page.locator('dialog[open]'));await closeSupplySettings(page);expect(await database(page)).toEqual(raw);
 await info.attach('foreign-rest-observation',{body:JSON.stringify({actualLocation:game.core.world.location,formalTravel:previewAction(game,{type:'TRAVEL',location:'cave'}),main,details,allDBUnchanged:true,scope:'No travel or recovery executed; source real travel6sec inherited separately.'}),contentType:'application/json'});
});

test('CEND03 extra real prepared trial checkpoint exposes both current preparation and explicit restoration without changing the saved state',async({page},info)=>{
 const prepared=await importRecoveryFixture(page,trialPreparationRunner('sword','buy-product',2).ledger.game);await runRecoveryPlan(page,{kind:'milestone',action:{type:'START_TRIAL'},maxCycles:1});await runRecoveryPlan(page,{kind:'milestone',action:{type:'ANSWER_TRIAL',answer:'accept'},maxCycles:1});await recoveryMove(page,'flee');const raw=await database(page),current=stored(raw,'current'),cp=stored(raw,'checkpoint'),owner=stored(raw,'checkpoint-owner');expect(cp.snapshot).toEqual(prepared);expect(owner.runId).toBe(current.core.runId);expect(current.battle).toBeNull();expect(current.trial).toBeNull();
 await page.getByTestId('tab-0').click();const home=await readSurface(page.getByTestId('game-hud'));await page.screenshot({path:info.outputPath('real-checkpoint-current-home.png')});await openRecoveryRestore(page);await expect(page.getByTestId('trial-restore-confirmation')).toBeVisible();const restoration=await readSurface(page.getByTestId('trial-restore-confirmation'));await page.screenshot({path:info.outputPath('real-checkpoint-explicit-restore-review.png')});expect(await database(page)).toEqual(raw);await page.getByTestId('trial-restore-cancel').click();await expect(page.getByTestId('trial-restore-confirmation')).not.toBeVisible();await expect(page.getByTestId('trial-restore-open')).toBeFocused();expect(await database(page)).toEqual(raw);
 await info.attach('real-checkpoint-observation',{body:JSON.stringify({formalFacts:{realm:current.core.player.realm,hp:current.core.player.hp,maxHp:stats(current).maxHp,location:current.core.world.location,seal:current.core.inventory.ascension_seal},fullPreparationCheckpointAndCurrentOwnerProven:true,home,restoration,reviewAllDBUnchanged:true,explicitCancelClickedFocusedAndAllDBUnchanged:true,scope:'Three real formal accepted activities on a lawful fixture created the checkpoint; restore only reviewed, not executed.'}),contentType:'application/json'});
});
