import {contentForGame} from '../../src/full/rule-content.ts';
import * as C from '../../src/full/content';
import type {Game} from '../../src/full/types';
import type {SourcePlan,CraftPlan} from '../../src/full/activity';
import type {EncounterPlan} from '../../src/full/adventure';
import {defaultEncounterPlan} from '../../src/full/adventure';
import {remainingMonths} from '../../src/full/costs';
import {REPEAT_CYCLE_LIMIT} from '../../src/full/repetition';
import type {CollectionTarget} from '../../src/full/goals';

export function continuingSource(game:Game,sourceId:string,target:CollectionTarget|null=null):SourcePlan {
  return{kind:'source',sourceId,maxCycles:REPEAT_CYCLE_LIMIT,repeat:true,until:target?'target':'cycles',target,
    monthBudget:Math.max(0,remainingMonths(game)-1),remainingMonthsReserve:1};
}

export function continuingCraft(game:Game,recipeId:string):CraftPlan {
 const ruleContent=contentForGame(game);

  const recipe=ruleContent.recipes[recipeId],breakthrough=ruleContent.items[recipe.output].kind==='breakthrough';
  const maximum=Math.max(0,Math.min(Math.floor(game.core.player.stones/Math.max(1,recipe.stones)),
    ...Object.entries(recipe.inputs).map(([id,n])=>Math.floor(game.core.inventory[id]/n))));
  const cycles=breakthrough?Math.min(1,maximum):maximum;
  return{kind:'craft',recipeId,repeat:true,maxCycles:REPEAT_CYCLE_LIMIT,until:breakthrough?'target':'cycles',
    targetQuantity:breakthrough?1:null,stoneBudget:cycles*recipe.stones,stoneReserve:0,
    monthBudget:Math.min(Math.max(0,remainingMonths(game)-1),cycles*recipe.months),remainingMonthsReserve:1,itemReserves:{}};
}

export function continuingEncounter(game:Game,enemy:string):EncounterPlan {
  const plan=defaultEncounterPlan(game,enemy);
  return{...plan,repeat:true,maxCycles:REPEAT_CYCLE_LIMIT,maxEncounters:REPEAT_CYCLE_LIMIT,
    monthBudget:Math.max(0,remainingMonths(game)-1),mpBudget:game.core.player.mp};
}
