import type {Page} from '@playwright/test';

/** Register isolated rule-built fixtures, not elapsed online play or a claimed earned route. */
export async function registerPositiveBattle(page:Page){
 await page.evaluate(()=>{
  const h=(globalThis as any).h;
  if(!h?.m02Rows||!h.milestoneModel||!h.adventure)throw new Error('M02 battle registration requires setupMilestones and m02Rows');
  const fingerprint=h.milestoneReceipts.canonicalFingerprint;
  const d=h.routes.driver('leave','sword');
  d.funds(200);d.buy('healing_pill',3);d.buy('spirit_pill',3);
  d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});
  const fresh=structuredClone(d.game);
  // These two legal setup turns cause the deficits; no HP/MP or battle field is patched.
  d.doAction({type:'BATTLE',move:'technique'});
  d.doAction({type:'BATTLE',move:'guard'});
  const medicine=structuredClone(d.game);
  for(const move of ['technique','heal','restore'] as const){
   const id='battle-'+move,game=structuredClone(move==='technique'?fresh:medicine);
   if(Object.hasOwn(h.m02Rows,id))throw new Error('Duplicate M02 row '+id);
   h.engine.validateGame(game);
   const stats=h.engine.stats(game),item=move==='heal'?'healing_pill':'spirit_pill';
   if(!game.battle||game.school!=='sword'||game.core.player.realm!=='qi')throw new Error(id+' must retain its lawful qi sword battle');
   if(move==='heal'&&!(game.core.player.hp<stats.maxHp&&game.core.inventory[item]>=1))throw new Error(id+' lacks a real HP deficit or medicine');
   if(move==='restore'&&!(game.core.player.mp<stats.maxMp&&game.core.inventory[item]>=1))throw new Error(id+' lacks a real MP deficit or medicine');
   const before=fingerprint(game),plan=h.adventure.singleBattlePlan(game,move);
   const activity=h.milestoneModel.createActivity(game,plan,{id:crypto.randomUUID(),ownerId:'m02-battle-fixture',commandId:crypto.randomUUID(),now:1000});
   if(plan.mode!=='single'||plan.maxCycles!==1||plan.move!==move||activity.cycleMs!==3000||activity.nextCommand.type!=='BATTLE'||activity.nextCommand.move!==move)throw new Error(id+' is not one formal three-second selected turn');
   const outcome=h.engine.resolve(game,activity.nextCommand);
   const items=move==='technique'?{}:{[item]:1},mp=move==='technique'?8:0;
   if(fingerprint(outcome.result.costs)!==fingerprint({stones:0,mp,months:0,items})||outcome.result.stopReason!==null||outcome.result.executedSteps!==1||outcome.result.requestedSteps!==1)throw new Error(id+' did not prove its exact positive formal consumption');
   // The selected medicine still occupies a turn and receives the real heavy counterattack.
   if(h.engine.intent(game.battle).damage<=0||!outcome.nextState.battle||outcome.nextState.battle.round!==game.battle.round+1)throw new Error(id+' lost its formal counterattack or battle turn');
   if(fingerprint(game)!==before)throw new Error(id+' registration mutated its original Game');
   h.m02Rows[id]={game,plan,cost:move==='technique'?{mp:8}:{items:{[item]:1}}};
  }
 });
}
