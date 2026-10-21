<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {previewAction} from '../../src/full/queries.ts';
import type {TrackingTarget} from '../../src/full/goals.ts';
import {formatCosts} from './presentation';
import {actionSeconds} from './action-timing';
import {pageSlice} from './play-flow';
import GameIcon from './GameIcon.vue';
import CataloguePager from './CataloguePager.vue';
import CatalogueArt from './CatalogueArt.vue';
import ProductionPlanner from './ProductionPlanner.vue';
import type {Activity,CraftPlan,ForgePlan,PreparationPlan} from '../../src/full/activity.ts';
import type {useGame} from './store';
const props=defineProps<{game:Game;mode:'inventory'|'forge';minimal?:boolean;busy:boolean;available:boolean;highlight:string;consumption:(action:Action)=>string;running:boolean;activity:Activity|null;runtime:ReturnType<typeof useGame>['activityRuntime'];savedProduction:CraftPlan|ForgePlan|null;savedPreparationPlan:PreparationPlan|null}>(),emit=defineEmits<{act:[Action];track:[TrackingTarget];travel:[C.LocationId];start:[CraftPlan|ForgePlan|PreparationPlan];move:[CraftPlan|ForgePlan];travelPlan:[PreparationPlan]}>();
const page=ref(0),filter=ref('all'),future=ref(false);
const rows=computed(()=>Object.entries(C.items).filter(([id,i])=>(future.value||C.rank(i.min)<=C.rank(props.game.core.player.realm)||props.game.core.inventory[id]>0)&&(filter.value==='all'||i.kind===filter.value)));
const paged=computed(()=>pageSlice<[string,unknown]>(rows.value,page.value,2)),cache=computed(()=>({game:props.game,map:new Map<string,ReturnType<typeof previewAction>>() }));
function quote(action:Action){const c=cache.value,key=JSON.stringify(action);if(!c.map.has(key))c.map.set(key,previewAction(c.game,action));return c.map.get(key)!;}
function can(action:Action){return props.available&&!props.busy&&!props.running&&quote(action).allowed;}
function why(action:Action){return props.busy?'当前行动进行中':!props.available?'存档未就绪':props.running?'当前活动进行中，请先暂停再行动':quote(action).failure?.message??'';}
watch([filter,future,()=>props.mode],()=>{page.value=0;},{flush:'sync'});watch(()=>props.game.core.runId,()=>{page.value=0;filter.value='all';future.value=false;});watch(()=>props.game.core.revision,()=>page.value=paged.value.page);
</script>
<template>
 <ProductionPlanner v-if="mode==='forge'" mode="craft" :minimal="minimal" :game="game" :busy="busy" :available="available" :running="running" :highlight="highlight" :saved-plan="savedProduction" :consumption="consumption" :activity="activity" :runtime="runtime" @start="emit('start',$event)" @track="emit('track',$event)" @act="emit('act',$event)" @travel="emit('move',$event)"/>
 <section v-else class="paper play-catalogue goods-catalogue catalogue-gallery" data-testid="inventory-catalogue" tabindex="-1">
  <CatalogueArt kind="supplies"/>
  <header><div><small>物资保存在当前人生，可追踪其来源</small></div><label><input type="checkbox" v-model="future" aria-label="显示后续物资配方"> 后续境界</label></header>
  <nav class="catalogue-tabs" aria-label="行囊分类"><button v-for="[id,label] in [['all','全部'],['material','灵材'],['medicine','丹药'],['breakthrough','突破物']]" :key="id" :aria-pressed="filter===id" @click="filter=id">{{label}}</button></nav>
  <div v-if="!rows.length" class="catalogue-empty" data-testid="catalogue-empty">当前尚无可用物资条目。<button @click="future=true">查看后续目录</button></div>
  <div v-else class="catalogue-grid inventory-cards"><article v-for="[id] in paged.rows" :key="id"><h3><GameIcon kind="item" :id="id"/>{{C.items[id].name}} <b :data-testid="'item-'+id">×{{game.core.inventory[id]}}</b></h3><p>{{C.items[id].description}}</p><template v-if="C.items[id].hp||C.items[id].mp"><small>{{why({type:'USE',item:id})}}</small><small>{{consumption({type:'USE',item:id})}}</small><button :data-testid="'inspect-use-'+id" @click="emit('act',{type:'USE',item:id})" :disabled="!available">查看服丹安排 · 不立即用药</button></template><template v-if="C.items[id].sell!==null"><small>{{consumption({type:'SELL',item:id,quantity:1})}}</small><button :data-testid="'inspect-sell-'+id" @click="emit('act',{type:'SELL',item:id,quantity:1})" :disabled="!available">查看出售安排 · 每件 {{C.items[id].sell}} 灵石</button></template><small v-else>突破物不可出售。</small><button class="text-button" :data-testid="'track-'+id" @click="emit('track',{kind:'item',id,quantity:1})">追踪来源 →</button></article></div>
  <CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="行囊" @change="page=$event"/>
 </section>
</template>
