<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import type {Activity} from '../../src/full/activity';
import {sourceStockGoal} from './source-stock-goal';
const props=defineProps<{game:Game;sourceId:string;rowId:string;activity:Activity|null}>();
const goal=computed(()=>sourceStockGoal(props.game,props.sourceId,props.activity));
</script>
<template>
 <span v-if="goal&&goal.id===rowId" class="source-stock-goal" data-testid="source-stock-goal" :data-item="rowId" :data-met="goal.met"><span aria-hidden="true">/</span><strong>{{goal.target}}</strong><small>{{goal.met?'目标已达':'本段目标'}}</small></span>
</template>
<style scoped>
@layer game{
.source-stock-goal{display:inline-flex;align-items:baseline;gap:5px;color:var(--palette-jade);line-height:1.65}
.source-stock-goal>strong{font-size:22px;font-weight:500;line-height:1.6}
.source-stock-goal>small{font-size:14px;line-height:1.65;color:var(--palette-muted);white-space:nowrap}
.source-stock-goal[data-met=true]>small{color:var(--palette-ink)}
:global(#app .ta08-field[data-state=failed] .ta08-held-rows:has(.source-stock-goal)){grid-template-columns:minmax(0,1fr)}}
</style>
