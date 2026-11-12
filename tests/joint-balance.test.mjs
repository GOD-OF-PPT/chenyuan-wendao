import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/full/content.ts';
import * as engine from '../src/full/engine.ts';
import {costsForAction,remainingMonths} from '../src/full/costs.ts';
import {createActivity,completeActivity} from '../src/full/activity.ts';
import {sourcePeriodMs,recipePeriodMs} from '../src/full/online-periods.ts';
import * as old from '../src/legacy/rules-v3/index.ts';

function driver(rules=engine){
 let game=rules.newGame('联合数值','joint-numbers');
 const act=a=>{const out=rules.resolve(game,{...a,commandId:'joint:'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});game=out.nextState;return out;};
 for(const a of [{type:'CHOOSE',choice:'leave'},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2},{type:'BREAKTHROUGH'},{type:'SCHOOL',school:'sword'}])act(a);
 return{get game(){return game;},act};
}

test('new calendar input is a real twelve-month price without stretching the published source or furnace clock',()=>{
 const d=driver();assert.equal(d.game.core.world.elapsedMonths,24);assert.equal(engine.stats(d.game).lifespanMonths,1200);d.act({type:'TRAVEL',location:'sect'});const before=structuredClone(d.game),plan={kind:'source',sourceId:'work',maxCycles:1,until:'cycles',target:null,monthBudget:12,remainingMonthsReserve:1};
 const a=createActivity(d.game,plan,{id:'new-source',ownerId:'new-owner',commandId:'new-start',now:10000});assert.equal(a.cycleMs,30000);assert.equal(sourcePeriodMs(d.game,'work'),30000);assert.equal(recipePeriodMs(d.game,'foundation'),30000);
 const out=engine.resolve(d.game,a.nextCommand),done=completeActivity(out.nextState,a,out.result,{commandId:a.nextCommand.commandId,now:a.dueAt});assert.equal(out.result.costs.months,12);assert.equal(done.spentMonths,12);assert.equal(done.gainedStones,20);assert.deepEqual(d.game,before);
 const legacy=driver(old.engine);assert.equal(legacy.game.core.world.elapsedMonths,2);assert.equal(costsForAction(legacy.game,{type:'SOURCE',sourceId:'work'}).months,1);assert.equal(sourcePeriodMs(legacy.game,'work'),30000);
});

test('all breakthrough medicines have a concrete premium over the full purchased inputs and furnace fee',()=>{
 const d=driver();assert.equal(C.items.foundation_pill.buy,195);
 for(const recipe of Object.values(C.recipes).filter(r=>C.items[r.output].kind==='breakthrough')){
  const input=Object.entries(recipe.inputs).reduce((n,[id,quantity])=>n+C.items[id].buy*quantity,recipe.stones),price=costsForAction(d.game,{type:'BUY',item:recipe.output,quantity:1}).stones;
  assert.ok(price>=input*1.3&&price<=input*1.6,recipe.output+' '+input+' -> '+price);
 }
});

test('an ordinary victory returns real materials and stones while the new life earns no combat cultivation',()=>{
 const d=driver();d.act({type:'TRAVEL',location:'wilderness'});const before=d.game;d.act({type:'ENCOUNTER',enemy:'wolf'});
 for(let i=0;d.game.battle&&i<40;i++)d.act({type:'BATTLE',move:'attack'});
 assert.equal(d.game.battle,null);assert.equal(d.game.wins,before.wins+1);assert.equal(d.game.core.player.xp,before.core.player.xp);assert.equal(d.game.core.inventory.core,before.core.inventory.core+1);assert.equal(d.game.core.player.stones,before.core.player.stones+10);
 assert.equal(old.content.enemies.wolf.xp,35);
});

test('a normally aged new life safely stops near the last year then explicitly consumes only its genuine remainder',()=>{
 const d=driver();d.act({type:'TRAVEL',location:'sect'});assert.throws(()=>d.act({type:'END_LIFE'}));
 for(let i=0;remainingMonths(d.game)>12&&i<1000;i++){
  const before=d.game;
  try{d.act({type:'SOURCE',sourceId:'work',count:50});}catch(e){if(e.code!=='AGE_LIMIT')throw e;assert.deepEqual(d.game,before);break;}
 }
 const before=d.game,months=remainingMonths(before);assert.ok(months>=1&&months<=12);assert.equal(before.status,'active');const ended=d.act({type:'END_LIFE'});assert.equal(ended.result.costs.months,months);assert.equal(ended.result.delta.months,months);assert.equal(d.game.ending,'lifespan');assert.equal(remainingMonths(d.game),0);engine.validateGame(d.game);
});


test('every source and furnace retains the entire published online schedule independently of its new calendar price',()=>{
 const g=driver().game;
 for(const [id,s]of Object.entries(old.content.sources)){
  assert.equal(C.sources[id].months,s.months*12,id);
  assert.equal(sourcePeriodMs(g,id),s.months*30000,id);
 }
 for(const [id,r]of Object.entries(old.content.recipes)){
  assert.equal(C.recipes[id].months,r.months*12,id);
  assert.equal(recipePeriodMs(g,id),r.months*30000,id);
 }
});


test('a capped normal chemical preparation has an actual gathering advantage over income-funded finished medicine',async()=>{
 const {createIdleRoute}=await import('../scripts/economy/idle-scenarios.mjs');
 const {projectProgression}=await import('../src/full/progression.ts');
 const r=createIdleRoute({choice:'leave',school:'sword',preparation:'gather',cultivation:'natural',answer:'accept',ending:'transmit',advanced:false});r.begin();r.grow('spirit');r.project('natural');
 const before=structuredClone(r.game),gather=projectProgression(r.game,'gather'),purchase=projectProgression(r.game,'purchase');
 assert.equal(gather.complete,true);assert.equal(purchase.complete,true);assert.equal(gather.closing.location,'cave');assert.equal(purchase.closing.location,'cave');
 assert.equal(gather.closing.inventory.ascension_seal,purchase.closing.inventory.ascension_seal);assert.equal(gather.closing.xp,purchase.closing.xp);
 assert.ok(gather.totals.costs.months<purchase.totals.costs.months,'self-sourced furnace must offer an actual lifespan advantage at this reported common checkpoint');
 assert.ok(gather.onlineMs<purchase.onlineMs,'self-sourced furnace must beat the reported income-purchase path when cash has to be earned');
 assert.deepEqual(r.game,before);
});
