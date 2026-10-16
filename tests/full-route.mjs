import {newGame,advance,reason,stats} from '../src/full/engine.ts';
import * as C from '../src/full/content.ts';
export function driver(choice='leave',school='sword') {
 let g=newGame('测试修士','test-'+choice+'-'+school);const actions=[];const checkpoints={};
 const doAction=a=>{g=advance(g,{...a,commandId:'c'+g.core.revision,runId:g.core.runId,expectedRevision:g.core.revision});actions.push(a);return g;};
 const go=location=>{if(g.core.world.location!==location)doAction({type:'TRAVEL',location});};
 const funds=n=>{while(g.core.player.stones<n){const src=Object.entries(C.sources).filter(([,s])=>s.stones>0&&Object.keys(s.items).length===0&&C.rank(s.min)<=C.rank(g.core.player.realm)).at(-1);if(!src)throw new Error('No work');go(src[1].location);doAction({type:'SOURCE',sourceId:src[0],count:Math.min(50,Math.ceil((n-g.core.player.stones)/src[1].stones))});}};
 const resource=(item,n)=>{if(g.core.inventory[item]>=n)return;const src=Object.entries(C.sources).find(([,s])=>s.items[item]>0&&C.rank(s.min)<=C.rank(g.core.player.realm));if(!src)throw new Error('No source '+item);go(src[1].location);doAction({type:'SOURCE',sourceId:src[0],count:Math.min(50,Math.ceil((n-g.core.inventory[item])/src[1].items[item])),target:{item,quantity:n}});};
 const buy=(item,n)=>{const count=Math.max(0,n-g.core.inventory[item]);if(!count)return;funds(C.items[item].buy*count);go('market');doAction({type:'BUY',item,quantity:count});};
 const craft=id=>{const r=C.recipes[id];for(const [k,n]of Object.entries(r.inputs))resource(k,n);funds(r.stones);go('cave');doAction({type:'CRAFT',recipeId:id});};
 const rest=()=>{go('cave');if(!reason(g,{type:'REST'}))doAction({type:'REST'});};
 const meditate=()=>{go('cave');while(g.core.player.xp<stats(g).xpCap)doAction({type:'CULTIVATE',method:'natural',count:50});};
 const event=(id,option)=>{const places={shen_return:'sect',shen_pact:'cave',pei_meet:'sect',pei_echo:'secret',pei_pact:'sect',lu_intro:'sect',lu_teach:'sect',lu_farewell:'sect',yan_stone:'secret',yan_mirror:'secret',yan_gate:'terrace'};go(places[id]);doAction({type:'EVENT',event:id});doAction({type:'DECIDE',option});};
 const fight=()=>{let steps=0;while(g.battle&&steps++<120){const b=g.battle,p=g.core.player,r=stats(g);let move;
   if(p.hp<r.maxHp*.5&&!reason(g,{type:'BATTLE',move:'heal'}))move='heal';
   else if(b.round%3===2)move='guard';
   else if(!reason(g,{type:'BATTLE',move:'release'}))move='release';
   else if(!reason(g,{type:'BATTLE',move:'technique'}))move='technique';
   else move='attack';doAction({type:'BATTLE',move});
 }if(steps>=120)throw new Error('battle cap');};
 const realm=(strategy='craft')=>{const p=g.core.player,r=C.realms[p.realm];if(!r.next)throw new Error('No next');if(r.pill){if(strategy==='purchase')buy(r.pill,1);else craft(Object.keys(C.recipes).find(k=>C.recipes[k].output===r.pill));}meditate();checkpoints[p.realm]=structuredClone(g);doAction({type:'BREAKTHROUGH'});};
 doAction({type:'CHOOSE',choice});realm();doAction({type:'SCHOOL',school});
 return {get game(){return g;},get actions(){return actions;},checkpoints,doAction,go,funds,resource,buy,craft,rest,meditate,event,fight,realm};
}
export function fullRoute(choice='leave',school='sword',strategy='craft',allies=false,ending='transmit',trialAnswer='accept'){
 const d=driver(choice,school);
 // Normal, real battle is part of every replay, not a debug reward.
 d.go('wilderness');d.doAction({type:'ENCOUNTER',enemy:'wolf'});d.fight();if(d.game.wins!==1)throw new Error('Opening battle lost');
 d.realm(strategy);
 if(allies){if(choice==='trade')d.funds(18);if(choice==='leave')d.resource('herb',2);d.event('shen_return',choice==='help'?'accept':choice==='trade'?'bargain':'assist');d.funds(15);d.event('pei_meet','cooperate');}
 d.realm(strategy);
 // Relic optional but actually purchased and equipped, without directly mutating snapshots.
 d.resource('jade',4);d.funds(140);d.go('cave');d.doAction({type:'FORGE',relic:'jade_seal'});d.doAction({type:'EQUIP_RELIC',relic:'jade_seal'});
 if(allies){d.resource('lotus',1);d.event('pei_echo','share');}
 d.realm(strategy);
 if(allies){d.buy('healing_pill',2);d.event('shen_pact','lend');}
 d.realm(strategy);
 if(allies){d.resource('dao',1);d.event('pei_pact','ally');}
 finishTrial(d,strategy,ending,trialAnswer);return d;
}
export function prepareTrial(d,strategy='craft',trialAnswer='accept'){
 if(strategy==='purchase')d.buy('ascension_seal',1);else d.craft('ascension');
 d.buy('healing_pill',12);d.buy('spirit_pill',4);d.meditate();d.rest();d.go('terrace');
 d.checkpoints.trial=structuredClone(d.game);d.doAction({type:'START_TRIAL'});d.doAction({type:'ANSWER_TRIAL',answer:trialAnswer});return d;
}
export function finishTrial(d,strategy='craft',ending='transmit',trialAnswer='accept'){
 prepareTrial(d,strategy,trialAnswer);d.fight();
 if(d.game.trial?.stage!==4)throw new Error('Trial failed '+JSON.stringify({strategy,hp:d.game.core.player.hp,journal:d.game.journal.slice(-5)}));
 d.checkpoints.ending=structuredClone(d.game);d.doAction({type:'END',ending});return d;
}
