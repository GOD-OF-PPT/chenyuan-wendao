import {contentForGame} from '../../src/full/rule-content.ts';
import * as C from '../../src/full/content';
import type {Game} from '../../src/full/types';
import {requirementsForAction} from '../../src/full/costs';

const earliest=(rows:{min:C.RealmId}[])=>rows.reduce<C.RealmId>((min,row)=>C.rank(row.min)<C.rank(min)?row.min:min,'ascended');
const thresholds:Record<string,C.RealmId>={
  forge:earliest(Object.values(C.recipes)),
  skills:earliest(Object.values(C.skills)),
  manual:C.swordManual.min,
  purchase:C.locations.market.min,
};
export function navigationGate(game:Game,feature:string){
 const ruleContent=contentForGame(game);

  const min=feature==='relics'?requirementsForAction(game,{type:'FORGE',relic:Object.keys(ruleContent.relics)[0]}).minRealm:thresholds[feature];
  const knownManual=game.core.learnedSkills.includes(ruleContent.swordManual.id);
  const held=feature==='relics'&&(game.ownedRelics.length>0||!!game.loadout.relic)||feature==='skills'&&(!!game.school||game.learned.length>0||knownManual)||feature==='manual'&&knownManual;
  const locked=!!min&&!held&&C.rank(game.core.player.realm)<C.rank(min);
  return{locked,reason:locked?ruleContent.realms[min].name+'开放':''};
}
