import {contentForGame} from '../../src/full/rule-content.ts';
import * as C from '../../src/full/content.ts';
import type {Action,Game} from '../../src/full/types.ts';
import {previewAction,getItemSources,getCurrencySources} from '../../src/full/queries.ts';
import {previewActivity} from '../../src/full/activity.ts';
import {ADVENTURE_CYCLE_MS} from '../../src/full/adventure.ts';
import {sourceNavigation} from './play-flow.ts';

/** A readonly scene description. Projection plans are never returned as authorization. */
export function caveThresholdView(game:Game){
 const ruleContent=contentForGame(game);

 const realm=ruleContent.realms[game.core.player.realm],item=realm.pill??null;
 const action:Action={type:game.core.player.realm==='spirit'?'START_TRIAL':'BREAKTHROUGH'};
 const quote=previewAction(game,action),required=item?quote.costs?.items[item]??1:0,have=item?game.core.inventory[item]:0;
 const routes=item&&have<required?getItemSources(game,item,1,['recipe','purchase']).map(source=>{
  const recipe=source.kind==='recipe'?ruleContent.recipes[source.id]:null;
  const selected:Action=recipe?{type:'CRAFT',recipeId:source.id}:{type:'BUY',item,quantity:1};
  const single=previewAction(game,selected);
  const costs=single.costs,projection=recipe?previewActivity(game,{kind:'craft',recipeId:source.id,maxCycles:1,until:'cycles',targetQuantity:1,stoneBudget:costs?.stones??0,stoneReserve:0,monthBudget:costs?.months??0,remainingMonthsReserve:1,itemReserves:{}}):previewActivity(game,{kind:'buy',item,maxCycles:1,until:'cycles',targetQuantity:1,stoneBudget:costs?.stones??0,stoneReserve:0});
  const stonesMissing=single.deficits.find(d=>d.kind==='stones')?.missing??0;
  return{kind:source.kind,id:source.id,title:recipe?'本炉炼制':'坊市求购',verb:recipe?'查看炉火安排':'查看坊市行旅',request:sourceNavigation(source,required),source,quote:single,stones:costs?.stones??0,seconds:projection.cycleMs/1000,travelSeconds:source.navigation?ADVENTURE_CYCLE_MS.travel/1000:0,
   condition:stonesMissing?'灵石尚缺 '+stonesMissing:source.available?'预计条件具备':source.failure?.message??'查看完整条件',stonesMissing};
 }):[];
 return{realm:realm.name,target:game.core.player.realm==='spirit'?'渡劫准备':realm.next?ruleContent.realms[realm.next].name+'境门':'当前道途',itemId:item,itemName:item?ruleContent.items[item].name:'引气准备',have,required,missing:Math.max(0,required-have),quote,routes,
  fundingNeeded:routes.some(r=>r.stonesMissing>0),fundingTarget:Math.max(1,...routes.map(r=>r.stones)),extraDeficits:quote.deficits.filter(d=>d.kind!=='item'&&d.kind!=='xp'&&d.kind!=='stones')};
}
export function caveFundingView(game:Game,quantity:number){
 const sources=getCurrencySources(game),source=sources.find(s=>s.available)??sources[0];
 return source?sourceNavigation(source,quantity):null;
}
