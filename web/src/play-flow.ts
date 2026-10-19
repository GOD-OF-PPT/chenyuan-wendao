import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {gamePhase} from '../../src/full/contracts.ts';
import {getBreakthroughGoal,getItemSources,getCurrencySources,previewAction,type ItemSource} from '../../src/full/queries.ts';
import type {NavigationRequest} from './navigation';
export function preparationFor(game:Game){
 const goal=getBreakthroughGoal(game),pill=C.realms[game.core.player.realm].pill;
 const recipe=pill?Object.entries(C.recipes).find(([,r])=>r.output===pill):undefined;
 const craft:Action|null=recipe?{type:'CRAFT',recipeId:recipe[0]}:null,buy:Action|null=pill?{type:'BUY',item:pill,quantity:1}:null;
 return{goal,pill,recipe:recipe?{id:recipe[0],...recipe[1]}:null,craft,buy,craftQuote:craft?previewAction(game,craft):null,buyQuote:buy?previewAction(game,buy):null};
}
export function nextStep(game:Game){
 const phase=gamePhase(game),realm=C.realms[game.core.player.realm],goal=getBreakthroughGoal(game);
 if(game.status!=='active')return{kind:'record',title:goal.title,detail:'查看来路、导出存档，或开启新的人生。'};
 if(phase!=='idle')return{kind:'encounter',title:goal.title,detail:game.battle?'观察敌方意图，再选择攻守。':'先完成眼前的抉择，再继续修行。'};
 if(game.core.player.realm!=='mortal'&&!game.school)return{kind:'school',title:'选择剑修或符修',detail:'选择会配好基础功法；两种修法均能走完主线。'};
 if(game.core.player.xp<realm.xpCap)return{kind:'cultivate',title:'修炼至'+realm.xpCap+'修为',detail:'修炼 → 筹备丹药 → 突破。也可以先历练收集材料。'};
 if(realm.pill&&!game.core.inventory[realm.pill])return{kind:'prepare',title:'筹备'+C.items[realm.pill].name,detail:'修为已满，接下来炼制或采购突破物；继续吐纳不会增加修为。'};
 if(goal.preview?.allowed)return{kind:'breakthrough',title:goal.title,detail:'物资已齐，确认后消耗对应物品并突破。'};
 if(goal.preview?.requirements.location&&game.core.world.location!==goal.preview.requirements.location)return{kind:'return',title:'前往'+C.locations[goal.preview.requirements.location].name,detail:goal.preview.failure?.message??'物资已齐，前往对应地点确认下一步。'};
 if(goal.deficits.some(d=>d.kind==='hp'||d.kind==='mp'))return{kind:'recover',title:'先恢复气血灵力',detail:'到洞府疗养，或使用现有丹药，再继续当前筹备。'};
 return{kind:game.core.player.realm==='spirit'?'trial':'prepare',title:goal.title,detail:goal.preview?.failure?.message??'核对地点、修法和物资后继续。'};
}
export function resourceSources(game:Game,item:string|null,quantity:number){return item?getItemSources(game,item,Math.max(1,quantity)):getCurrencySources(game);}
export function sourceNavigation(source:ItemSource,quantity:number):NavigationRequest{
 return{location:source.location,tab:source.kind==='recipe'?'行囊':source.kind==='event'?'仙缘':'历练',focusId:`${({source:'source',recipe:'craft',purchase:'buy',battle:'encounter',event:'event'}as const)[source.kind]}-${source.kind==='event'?source.id.split(':')[0]:source.id}`,
 ...(source.kind==='purchase'?{quantity:source.rewardCount}:{}),...(source.kind==='source'?{collection:source.resource.kind==='item'?{kind:'item',id:source.resource.id!,quantity}:{kind:'stones',quantity}}:{})};
}
export function pageSlice<T>(rows:readonly T[],page:number,size:number){const pages=Math.max(1,Math.ceil(rows.length/size)),current=Math.max(0,Math.min(pages-1,page));return{rows:rows.slice(current*size,(current+1)*size),page:current,pages,total:rows.length};}
