import test from 'node:test';
import assert from 'node:assert/strict';
import {advance,newGame} from '../src/full/engine.ts';
import {getTrialRecovery} from '../src/full/queries.ts';
import {currentVersions} from '../src/full/versions.ts';
import {trialPreparationRunner} from './trial-preparation-route.mjs';
import {trialReturnView} from '../web/src/trial-return.ts';
const prep=trialPreparationRunner('sword','buy-product',1).ledger.game;
const act=(g,a)=>advance(g,{...a,commandId:'ux21-'+g.core.revision,runId:g.core.runId,expectedRevision:g.core.revision});
const entered=act(prep,{type:'START_TRIAL'}),battle=act(entered,{type:'ANSWER_TRIAL',answer:'accept'}),failed=act(battle,{type:'BATTLE',move:'flee'});
const rawCp={format:'chenyuan-checkpoint',version:1,kind:'trial',sourceRunId:prep.core.runId,sourceRevision:prep.core.revision,versions:currentVersions,snapshot:prep};
const summary={kind:'trial',sourceRunId:prep.core.runId,sourceRevision:prep.core.revision,versions:currentVersions,target:{name:prep.core.player.name,realm:prep.core.player.realm,months:prep.core.world.elapsedMonths,hp:prep.core.player.hp,mp:prep.core.player.mp,inventory:structuredClone(prep.core.inventory)}};
const recovery=getTrialRecovery(failed,battle,rawCp);
test('UX21 actual spent seal offers two readonly paths without turning snapshot supply into current inventory',()=>{
 const originals=structuredClone({failed,summary,recovery}),v=trialReturnView(failed,summary,recovery,true);assert.equal(v.choice,true);assert.equal(v.canRestore,true);assert.equal(v.canRecord,true);assert.equal(v.currentSeal,0);assert.equal(v.savedSeal,1);assert.equal(Object.hasOwn(v,'command'),false);assert.deepEqual({failed,summary,recovery},originals);
});
test('UX21 no checkpoint or an ordinary checkpoint never authorizes trial restoration or invents a saved seal',()=>{
 for(const cp of [null,{...summary,kind:'breakthrough'}]){const v=trialReturnView(failed,cp,null,true);assert.equal(v.choice,false);assert.equal(v.canRestore,false);assert.equal(v.savedSeal,null);assert.match(v.notice,/未找到本局已验证的渡劫准备检查点/);}
 const v=trialReturnView(failed,null,recovery,true);assert.equal(v.choice,true);assert.equal(v.canRestore,false);assert.equal(v.canRecord,true);
});
test('UX21 unavailable or unverified current scope does not borrow the old checkpoint or adjacent report',()=>{
 const v=trialReturnView(failed,summary,recovery,false);assert.equal(v.choice,false);assert.equal(v.canRestore,false);assert.equal(v.canRecord,false);assert.equal(v.savedSeal,null);assert.match(v.notice,/尚待核对/);
});
test('UX21 ordinary rest can retire a battle report while a verified complete preparation remains a truthful option',()=>{
 const rested=act(failed,{type:'REST'}),v=trialReturnView(rested,summary,null,true);assert.equal(v.canRestore,true);assert.equal(v.canRecord,false);assert.match(v.title,/已有完整准备/);assert.doesNotMatch(v.state,/本轮止于/);assert.equal(v.currentSeal,0);
});
test('UX21 current restored supplies and active question or battle never become a failed-return decision',()=>{
 for(const g of [prep,entered,battle,newGame('初入山门','ux21-fresh')])assert.equal(trialReturnView(g,summary,recovery,true),null);
 const atTerrace=act(failed,{type:'TRAVEL',location:'terrace'});assert.equal(trialReturnView(atTerrace,summary,recovery,true),null);
});
