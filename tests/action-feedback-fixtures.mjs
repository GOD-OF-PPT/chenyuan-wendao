import {newGame,resolve} from '../src/full/engine.ts';
import {getLifeOverview} from '../src/full/queries.ts';
import {driver,fullRoute} from './full-route.mjs';
/** UI fixtures are prefixes of real commands, not hand-edited rewards or realm fields. */
export function feedbackExamples(){
 const actions=new Map(),moves=new Map();let seed=1;
 function collect(sequence){let game=newGame('动作试玩','00000000-0000-4000-8000-'+String(seed++).padStart(12,'0'));for(const [i,action]of sequence.entries()){const before=game;game=resolve(game,{...action,commandId:'fixture-'+i,runId:game.core.runId,expectedRevision:game.core.revision}).nextState;if(!actions.has(action.type))actions.set(action.type,{before,action});if(action.type==='BATTLE'&&!moves.has(before.school+':'+action.move))moves.set(before.school+':'+action.move,{before,action});}}
 for(const school of ['sword','talisman'])for(const strategy of ['craft','purchase'])collect(fullRoute('help',school,strategy,true,'transmit').actions);
 for(const school of ['sword','talisman']){const d=driver('leave',school);d.buy('healing_pill',3);d.buy('spirit_pill',3);d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'warden'});d.doAction({type:'BATTLE',move:'attack'});d.doAction({type:'BATTLE',move:'technique'});d.doAction({type:'BATTLE',move:'heal'});d.doAction({type:'BATTLE',move:'restore'});d.doAction({type:'BATTLE',move:'flee'});d.doAction({type:'USE',item:'healing_pill'});d.rest();d.resource('herb',2);d.go('market');d.doAction({type:'SELL',item:'herb',quantity:1});d.realm();d.funds(600);d.go('sect');d.doAction({type:'STUDY',manual:'jinghong'});const skill=school==='sword'?'sword_still':'talisman_calm';d.doAction({type:'LEARN',skill});d.doAction({type:'EQUIP',skill});collect(d.actions);collect([...d.actions,{type:'RETIRE'}]);}
 const life=driver();life.go('sect');while(getLifeOverview(life.game).remainingMonths>1)life.doAction({type:'SOURCE',sourceId:'work',count:Math.min(50,getLifeOverview(life.game).remainingMonths-1)});life.doAction({type:'END_LIFE'});collect(life.actions);
 return{actions,moves};
}
