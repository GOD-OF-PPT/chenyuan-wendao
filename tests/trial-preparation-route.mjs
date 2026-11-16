import { runner } from '../scripts/economy/scenarios.mjs';
import { causalRoute } from './causal-route.mjs';
export function trialPreparationRunner(school='sword',preparation='gather',quantity=1) {
  const r=runner({choice:'leave',school,preparation,cultivation:'natural',advancedMind:false});
  r.grow('spirit',false);
  if(preparation==='buy-product')r.buy('ascension_seal',quantity);else{for(let count=0;count<quantity;count++)r.craft('ascension');}
  r.meditate();r.go('terrace');return r;
}
export function detailedTrialScenario(){
  const d=causalRoute({choice:'trade',school:'talisman',returnVisit:true,meet:'rival',echo:'joint',finish:false}).driver;
  d.funds(100);d.go('sect');d.doAction({type:'LEARN',skill:'talisman_calm'});d.doAction({type:'EQUIP',skill:'talisman_calm'});
  d.buy('ascension_seal',2);d.buy('healing_pill',3);d.buy('spirit_pill',2);d.meditate();d.rest();d.go('terrace');
  const prefix=d.checkpoints.nascent;
  return{game:d.game,prefix,actions:d.actions.slice(prefix.core.revision)};
}
export function zeroManaTrialScenario(){
  const r=trialPreparationRunner('talisman','buy-product');r.funds(80);r.go('sect');r.act({type:'LEARN',skill:'talisman_frost'});r.act({type:'EQUIP',skill:'talisman_frost'});
  while(r.ledger.game.core.player.mp>=20){r.go('wilderness');r.act({type:'ENCOUNTER',enemy:'wolf'});r.act({type:'BATTLE',move:'technique'});r.act({type:'BATTLE',move:'technique'});}
  r.go('wilderness');r.act({type:'ENCOUNTER',enemy:'wolf'});r.act({type:'BATTLE',move:'technique'});r.act({type:'BATTLE',move:'flee'});
  const pills=r.ledger.game.core.inventory.healing_pill;if(pills){r.go('market');r.act({type:'SELL',item:'healing_pill',quantity:pills});}
  r.go('terrace');return r.ledger.game;
}
