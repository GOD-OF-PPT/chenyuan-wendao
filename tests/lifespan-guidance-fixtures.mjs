import {driver} from './full-route.mjs';
import {resolve} from '../src/full/engine.ts';
import {getLifeOverview} from '../src/full/queries.ts';
/** Lawful command prefixes for isolated UI setup; not real idle growth evidence. */
export function lifespanFixture(remaining=1,ready=false){
 const d=driver();
 if(ready){if(ready!=='no-pill')d.buy('foundation_pill',1);d.meditate();}
 d.go('sect');
 while(getLifeOverview(d.game).remainingMonths>remaining)d.doAction({type:'SOURCE',sourceId:'work',count:Math.min(50,getLifeOverview(d.game).remainingMonths-remaining)});
 return d.game;
}
export function atLocation(game,location){return game.core.world.location===location?game:resolve(game,{type:'TRAVEL',location,commandId:'life-fixture-travel-'+game.core.revision,runId:game.core.runId,expectedRevision:game.core.revision}).nextState;}
