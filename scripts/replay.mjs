import { newGame, resolve } from '../src/game/engine.ts';
import { content } from '../src/content/m1.ts';
const runs=[];
for(const choice of ['help','trade','leave'])for(const strategy of ['craft','purchase']){
  let s=newGame('顾长青',`${choice}-${strategy}`),actions=0,steps=0;
  const send=a=>{const r=resolve(s,{...a,commandId:`c${actions++}`,runId:s.runId,expectedRevision:s.revision});s=r.state;steps+=r.receipt.steps;};
  [{type:'CHOOSE',choice},{type:'TRAVEL',location:'cave'},{type:'CULTIVATE',method:'natural',count:2},{type:'BREAKTHROUGH'}].forEach(send);
  (strategy==='craft' ? [
    {type:'TRAVEL',location:'wilderness'},{type:'SOURCE',sourceId:'herbs',count:4},{type:'SOURCE',sourceId:'dew',count:2},
    {type:'TRAVEL',location:'sect'},{type:'SOURCE',sourceId:'core'},{type:'TRAVEL',location:'cave'},{type:'CRAFT',recipeId:'foundation'}
  ] : [{type:'TRAVEL',location:'sect'},{type:'SOURCE',sourceId:'work',count:6},{type:'TRAVEL',location:'market'},{type:'BUY',item:'foundation_pill',quantity:1},{type:'TRAVEL',location:'cave'}]).forEach(send);
  send({type:'CULTIVATE',method:'natural',count:50});send({type:'BREAKTHROUGH'});
  if(s.player.realm!=='foundation')throw Error('Route did not reach foundation');
  runs.push({choice,strategy,realm:s.player.realm,commands:actions,executedSteps:steps,gameMonths:s.world.elapsedMonths,stones:s.player.stones,inventory:s.inventory});
}
console.log(JSON.stringify({balanceVersion:content.balanceVersion,scope:'3 opening choices × 2 deterministic economic routes, NOT sword/talisman combat routes or full ascension',runs},null,2));
