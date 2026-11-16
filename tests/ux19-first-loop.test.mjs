import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,advance} from '../src/full/engine.ts';
import {getBreakthroughGoal,previewAction} from '../src/full/queries.ts';
import {nextStep} from '../web/src/play-flow.ts';
import {driver} from './full-route.mjs';

for(const choice of ['help','trade','leave'])test(`UX19 ${choice}: mortal guidance matches the actual no-pill route at each first-loop boundary`,()=>{
 let game=newGame('听雨问路客','ux19-'+choice);
 const act=action=>{game=advance(game,{...action,commandId:'ux19-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});};
 const read=()=>{const before=structuredClone(game),step=nextStep(game);assert.deepEqual(game,before);return step;};
 act({type:'CHOOSE',choice});
 for(const location of ['temple','cave']){
  if(location==='cave')act({type:'TRAVEL',location});
  const step=read();assert.equal(step.kind,'cultivate');assert.match(step.detail,/洞府.*自然吐纳/);assert.match(step.detail,/圆满.*停/);assert.match(step.detail,/确认引气/);assert.match(step.detail,/无需突破丹/);assert.doesNotMatch(step.detail,/先历练|收集材料|筹备丹药/);
  assert.equal(previewAction(game,{type:'SOURCE',sourceId:'herbs',count:1}).allowed,false);
 }
 act({type:'CULTIVATE',method:'natural',count:1});assert.equal(game.core.player.xp,5);assert.equal(read().kind,'cultivate');assert.match(read().detail,/无需突破丹/);
 act({type:'CULTIVATE',method:'natural',count:1});assert.equal(game.core.player.xp,10);assert.equal(game.core.player.realm,'mortal');assert.equal(read().kind,'breakthrough');assert.match(read().detail,/确认引气入体.*无需突破物/);
 const goal=getBreakthroughGoal(game);assert.equal(goal.preview.allowed,true);assert.equal(goal.deficits.length,0);assert.deepEqual(goal.preview.costs.items,{});
 act({type:'BREAKTHROUGH'});assert.equal(game.core.player.realm,'qi');assert.equal(read().kind,'school');
});

test('UX19 later accumulation keeps its real material path instead of inheriting mortal no-pill instructions',()=>{
 const d=driver();
 for(let i=0;i<5;i++){
  d.go('cave');const before=structuredClone(d.game),step=nextStep(d.game);assert.equal(step.kind,'cultivate');assert.equal(step.detail,'修炼 → 筹备丹药 → 突破。也可以先历练收集材料。');assert.deepEqual(d.game,before);
  if(i<4)d.realm();
 }
});
