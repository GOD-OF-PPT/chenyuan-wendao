<script setup lang="ts">
import {useRuleContent} from './rule-content';

import {computed} from 'vue';
import type {Action,Game,Move} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import BattleStrategy from './BattleStrategy.vue';
import BattlePresence from './BattlePresence.vue';
import type {Activity} from '../../src/full/activity.ts';
import type {AdventurePlan,BattlePlan} from '../../src/full/adventure.ts';
const ruleContent=useRuleContent(()=>props.game);
const props=withDefaults(defineProps<{game:Game;active?:boolean;compact?:boolean;can:(action:Action)=>boolean;cost:(action:Action)=>string;why:(action:Action)=>string;busy?:boolean;available?:boolean;running?:boolean;activity?:Activity|null;savedAdventurePlan?:AdventurePlan|null;planSaved?:boolean}>(),{busy:false,available:true,running:false,planSaved:false,active:true});
const emit=defineEmits<{move:[move:Move];details:[event:MouseEvent];start:[BattlePlan];takeover:[]}>();
const battle=computed(()=>props.game.battle!),enemy=computed(()=>ruleContent.value.enemies[battle.value.enemy]);
</script>
<template>
 <BattleStrategy :trial="enemy.trial" variant="battle" :game="game" :compact="compact" :busy="busy" :available="available" :running="running" :activity="activity" :saved-plan="savedAdventurePlan" :plan-saved="planSaved" :can="can" :cost="cost" :why="why" @move="emit('move',$event)" @details="emit('details',$event)" @start="emit('start',$event)" @takeover="emit('takeover')">
  <template #hero>
  <BattlePresence :game="game" :active="active"/>
  <details v-if="!compact" class="battle-details"><summary>术法说明与最近8条交锋</summary><p v-for="slot in ['builder','finisher'] as const" :key="slot" class="small">{{game.loadout[slot]?ruleContent.skills[game.loadout[slot]!].description:'引气入体后选择修法。'}}</p><div v-if="battle.log.length" class="battle-log" tabindex="0" aria-label="最近8条交锋"><p v-for="(line,index) in battle.log" :key="index">{{line}}</p></div><p v-else class="small">尚未行动；结果在保存后显示。</p></details>
  </template>
  <template #activity><slot name="activity"/></template>
 </BattleStrategy>
</template>
<style scoped>
@layer game{.battle-details{margin-top:12px}.battle-details summary{min-height:44px;cursor:pointer;line-height:1.7;padding-block:8px;font-size:var(--ui15)}.battle-details p{overflow-wrap:anywhere}.battle-log{height:160px}}
</style>
