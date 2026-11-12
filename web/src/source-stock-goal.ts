import {contentForGame} from '../../src/full/rule-content.ts';
import type {Game} from '../../src/full/types.ts';
import type {Activity} from '../../src/full/activity.ts';
import * as C from '../../src/full/content.ts';

/** Saved authorization only. Drafts, clocks and cumulative yields are not stock. */
export function sourceStockGoal(game:Game,sourceId:string,activity:Activity|null){
 const ruleContent=contentForGame(game);

 const s=ruleContent.sources[sourceId],a=activity;
 if(!s||game.status!=='active'||a?.version!==2||a.runId!==game.core.runId||a.gameRevision!==game.core.revision||a.realm!==game.core.player.realm||s.location!==game.core.world.location||a.plan.sourceId!==sourceId||a.plan.until!=='target'||!a.plan.target)return null;
 const t=a.plan.target,id=t.kind==='stones'?'stones':t.id;
 if(id==='stones'?!s.stones:!s.items[id])return null;
 const quantity=id==='stones'?game.core.player.stones:game.core.inventory[id],met=a.status==='stopped'&&a.stopReason?.code==='TARGET_MET'&&quantity>=t.quantity;
 if(a.status!=='running'&&a.status!=='paused'&&!met)return null;
 return{id,target:t.quantity,met};
}
