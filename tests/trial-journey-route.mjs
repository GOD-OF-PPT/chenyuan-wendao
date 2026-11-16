import { advance, reason, stats } from '../src/full/engine.ts';
import { trialPreparationRunner } from './trial-preparation-route.mjs';
export function nextTrialMove(game) {
  if (game.core.player.hp < stats(game).maxHp * .5 && !reason(game,{type:'BATTLE',move:'heal'})) return 'heal';
  if (game.battle.round % 3 === 2) return 'guard';
  for (const move of ['release','technique','attack']) if (!reason(game,{type:'BATTLE',move})) return move;
  throw new Error('No legal trial move');
}
export function trialJourneyScenario(school='sword',answer='accept') {
  const r=trialPreparationRunner(school,'buy-product',2);r.buy('healing_pill',12);r.buy('spirit_pill',4);r.rest();r.go('terrace');
  const prepared=r.ledger.game;let game=prepared;const actions=[],states=[prepared];
  const step=action=>{game=advance(game,{...action,commandId:'journey-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision});actions.push(action);states.push(game);};
  step({type:'START_TRIAL'});step({type:'ANSWER_TRIAL',answer});
  for(let turns=0;game.battle && turns<120;turns++)step({type:'BATTLE',move:nextTrialMove(game)});
  if(game.trial?.stage!==4)throw new Error('Legally prepared trial did not reach the final choice');
  return{prepared,actions,states};
}
export const normalizeTrialGame=game=>{const g=structuredClone(game);g.core.runId='<run>';g.core.revision=0;if(g.core.activeEvent)g.core.activeEvent.instanceId='<run>:'+g.core.activeEvent.id;return g;};
