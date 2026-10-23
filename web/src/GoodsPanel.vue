<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {previewAction} from '../../src/full/queries.ts';
import type {TrackingTarget} from '../../src/full/goals.ts';
import {pageSlice} from './play-flow';
import GameIcon from './GameIcon.vue';
import CataloguePager from './CataloguePager.vue';
import InventoryStage from './InventoryStage.vue';
import ProductionPlanner from './ProductionPlanner.vue';
import type {Activity,CraftPlan,ForgePlan,PreparationPlan} from '../../src/full/activity.ts';
import type {useGame} from './store';
const props=defineProps<{game:Game;mode:'inventory'|'forge';minimal?:boolean;busy:boolean;available:boolean;highlight:string;consumption:(action:Action)=>string;running:boolean;activity:Activity|null;runtime:ReturnType<typeof useGame>['activityRuntime'];savedProduction:CraftPlan|ForgePlan|null;savedPreparationPlan:PreparationPlan|null}>(),emit=defineEmits<{act:[Action];track:[TrackingTarget];travel:[C.LocationId];start:[CraftPlan|ForgePlan|PreparationPlan];move:[CraftPlan|ForgePlan];travelPlan:[PreparationPlan]}>();
const page=ref(0),filter=ref('all'),future=ref(false),pick=ref('');
const rows=computed(()=>Object.entries(C.items).filter(([id,i])=>(future.value||C.rank(i.min)<=C.rank(props.game.core.player.realm)||props.game.core.inventory[id]>0)&&(filter.value==='all'||i.kind===filter.value)));
const paged=computed(()=>pageSlice(rows.value,page.value,4)),item=computed(()=>rows.value.find(([id])=>id===pick.value)?.[1]);
const stock=(id:string)=>props.game.core.inventory[id];
function why(action:Action){return props.busy?'保存中':!props.available?'存档未就绪':props.running?'活动中，请先暂停':previewAction(props.game,action).failure?.message??'';}
function turn(n:number){page.value=n;pick.value=pageSlice(rows.value,n,4).rows[0]?.[0]??'';}
watch([filter,future,()=>props.mode],()=>turn(0),{flush:'sync'});watch(()=>props.game.core.runId,()=>{filter.value='all';future.value=false;turn(0);});watch(rows,()=>{const i=rows.value.findIndex(([id])=>id===pick.value);if(i<0)turn(0);else page.value=Math.floor(i/4);},{immediate:true});
</script>
<template>
 <ProductionPlanner v-if="mode==='forge'" mode="craft" :minimal="minimal" :game="game" :busy="busy" :available="available" :running="running" :highlight="highlight" :saved-plan="savedProduction" :consumption="consumption" :activity="activity" :runtime="runtime" @start="emit('start',$event)" @track="emit('track',$event)" @act="emit('act',$event)" @travel="emit('move',$event)"/>
 <section v-else class="paper play-catalogue goods-catalogue" data-testid="inventory-catalogue" tabindex="-1">
  <header><small>选择只查看，不消耗</small><label><input type="checkbox" v-model="future" aria-label="显示后续物资配方"> 后续境界</label></header>
  <nav class="catalogue-tabs" aria-label="行囊分类"><button v-for="[id,label] in [['all','全部'],['material','灵材'],['medicine','丹药'],['breakthrough','突破物']]" :key="id" :aria-pressed="filter===id" @click="filter=id">{{label}}</button></nav>
  <div v-if="!rows.length" class="catalogue-empty" data-testid="catalogue-empty">当前尚无可用物资条目。<button @click="future=true">查看后续目录</button></div>
  <InventoryStage v-else-if="item" :game="game" :item-id="pick" :available="available" :reason="why({type:'USE',item:pick})" :consumption="consumption" @act="emit('act',$event)" @track="emit('track',$event)"><template #directory><div class="inventory-objects"><button v-for="[id,i] in paged.rows" :key="id" :data-testid="'inventory-select-'+id" :aria-pressed="pick===id" :class="{'inventory-zero':!stock(id)}" @click="pick=id"><GameIcon kind="item" :id="id"/><strong>{{i.name}}</strong><b :data-testid="'item-'+id">×{{stock(id)}}</b></button></div><CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="行囊" @change="turn"/></template></InventoryStage>
 </section>
</template>
