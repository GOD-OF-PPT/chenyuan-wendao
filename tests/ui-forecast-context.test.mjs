import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {previewActivity} from '../src/full/activity.ts';
import {newGame,advance} from '../src/full/engine.ts';
import {driver} from './full-route.mjs';
// Vite accepts these existing extensionless local TS imports; load their real files in Node too.
const loader=registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&context.parentURL?.includes('/web/src/')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw error;}}});
const {stopMessage}=await import('../web/src/activity-view.ts');loader.deregister();
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function unchanged(game,plan,reason,expected){const before=structuredClone({game,plan,reason});freeze(game);freeze(plan);freeze(reason);assert.equal(stopMessage(plan,reason,true),expected);assert.deepEqual({game,plan,reason},before);}
test('forecast source target describes a future condition while its actual simulated stop and source Game stay unchanged',()=>{
 const d=driver('help');d.go('wilderness');const game=structuredClone(d.game),plan={kind:'source',sourceId:'herbs',maxCycles:2,until:'target',target:{kind:'item',id:'herb',quantity:game.core.inventory.herb+4},monthBudget:24,remainingMonthsReserve:1},before=structuredClone(game),q=previewActivity(game,plan);
 assert.equal(q.allowed,true);assert.equal(q.cycles,2);assert.equal(q.stopReason.code,'TARGET_MET');assert.equal(game.core.inventory.herb,0);assert.deepEqual(game,before);assert.equal(stopMessage(plan,q.stopReason),'当前库存已达到安排目标，取材停止');assert.equal(stopMessage(plan,q.stopReason,false),q.stopReason.message);unchanged(game,plan,q.stopReason,'达到所设目标后停手');
});
test('forecast finite work and travel never reuse the saved completion tense',()=>{
 const d=driver('help');d.go('wilderness');const game=d.game,source={kind:'source',sourceId:'herbs',maxCycles:1,until:'cycles',target:null,monthBudget:12,remainingMonthsReserve:1},trip={kind:'travel',location:'cave',maxCycles:1};
 for(const [p,message]of [[source,'完成本段次数后停手'],[trip,'抵达目的地后停步']]){const q=previewActivity(game,p);assert.equal(q.allowed,true);assert.equal(q.stopReason.code,'CYCLES_COMPLETE');assert.equal(stopMessage(p,q.stopReason),p.kind==='travel'?'已抵达目的地，本次行旅结束':q.stopReason.message);unchanged(structuredClone(game),p,q.stopReason,message);}
});
test('forecast cultivation cap remains future and the real cap reason retains its historical wording',()=>{
 let game=newGame('预告修士','forecast-cap');const act=a=>game=advance(game,{...a,commandId:'f'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});act({type:'CHOOSE',choice:'leave'});act({type:'TRAVEL',location:'cave'});const p={kind:'cultivation',method:'natural',maxCycles:50,until:'xp-cap',stoneBudget:0,stoneReserve:0},q=previewActivity(game,p);assert.equal(q.allowed,true);assert.equal(q.cycles,2);assert.equal(q.stopReason.code,'XP_CAP');assert.equal(stopMessage(p,q.stopReason),'修为已圆满，停止修炼并筹备突破');unchanged(game,p,q.stopReason,'修为圆满后停手，转为筹备突破');
});
test('explicit forecast leaves precise failures unknown codes null and default history projections unchanged',()=>{
 const plans=[{kind:'buy',item:'herb'},{kind:'learn'},{kind:'sell',item:'herb'},{kind:'use',item:'healing_pill'},{kind:'battle'},{kind:'encounter'}];
 for(const plan of plans)for(const reason of [null,undefined,{code:'ACTIVITY_BUDGET',message:'原累计预算不足'},{code:'INSUFFICIENT_STONES',message:'原灵石不足'},{code:'INSUFFICIENT_ITEM',message:'原库存不足'},{code:'STATE_CHANGED',message:'实际进度已变化'},{code:'UNRECOGNISED_FUTURE_CODE',message:'原未知原因，必须保留'}]){const before=structuredClone({plan,reason}),old=stopMessage(plan,reason);assert.equal(stopMessage(plan,reason,true),old);assert.equal(stopMessage(plan,reason,false),old);assert.deepEqual({plan,reason},before);}
 assert.equal(stopMessage({kind:'battle'},{code:'CYCLES_COMPLETE',message:'原回合上限'}),'已完成本段斗法动作上限，不再自动出招');assert.equal(stopMessage({kind:'encounter'},{code:'CYCLES_COMPLETE',message:'原动作上限'}),'已完成本段历练动作上限，后续由你另行安排');
});
