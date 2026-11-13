<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types.ts';
import {hudGoalObject,type HudGoalContext} from './hud-goal.ts';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
const props=defineProps<{game:Game;goal:string;gap:string;context?:HudGoalContext|null}>();
const item=computed(()=>hudGoalObject(props.game,props.context));
</script>
<template>
 <template v-if="item">
  <strong class="hud-goal-heading" data-testid="hub-target">{{goal}}</strong>
  <span class="hud-goal-object" data-testid="hud-goal-object" :data-item="item.id" :data-owned="item.have>0">
   <AssetImage class="hud-goal-art" :path="'art/v2/items/'+item.id+'-v1.webp'" :asset-id="'hud-goal-'+item.id" fit="contain" eager><GameIcon kind="item" :id="item.id"/></AssetImage>
   <span class="hud-goal-copy"><span data-testid="hub-gap">尚缺{{item.name}} {{item.missing}}</span><small>{{item.have?'实存 '+item.have+' / '+item.required:'图谱'}} · {{item.xp?'修为未满':'修为已满'}}<template v-if="item.extra"> · 另{{item.extra}}项</template></small></span>
  </span>
  <span class="hud-goal-view" data-testid="hub-goal-open">查看缺口与来源 ›</span>
 </template>
 <template v-else><small>当前目标</small><strong data-testid="hub-target">{{goal}}</strong><small data-testid="hub-gap">{{gap}}</small><span data-testid="hub-goal-open">查看缺口与来源 ›</span></template>
</template>
<style scoped>
@layer game{
:global(#app .hud-goal:has(.hud-goal-object)){padding-top:3px!important;padding-bottom:3px!important}
:global(#app .hud-goal .hud-goal-heading){line-height:1.2}
:global(#app .hud-goal>.hud-goal-object){display:grid;grid-template-columns:44px minmax(0,1fr);gap:7px;align-items:center;font-size:18px;line-height:1.3}
.hud-goal-art{width:44px;height:44px;pointer-events:none;filter:saturate(.45)}
.hud-goal-art :deep(.game-icon){width:40px;height:40px;color:var(--palette-jade)}
.hud-goal-copy{display:grid;gap:0;min-width:0;color:var(--palette-ink)}
:global(#app .hud-goal .hud-goal-copy small){font-size:14px;line-height:1.2;color:var(--palette-muted)}
:global(#app .hud-goal>.hud-goal-view){line-height:1.2}}
</style>
