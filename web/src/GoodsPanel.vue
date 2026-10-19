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
const props=defineProps<{game:Game;mode:'inventory'|'forge';busy:boolean;available:boolean;highlight:string;consumption:(action:Action)=>string}>(),emit=defineEmits<{act:[Action];track:[TrackingTarget];travel:[C.LocationId]}>();
const page=ref(0),filter=ref('all'),future=ref(false);
const rows=computed(()=>props.mode==='forge'?Object.entries(C.recipes).filter(([,r])=>future.value||C.rank(r.min)<=C.rank(props.game.core.player.realm)):Object.entries(C.items).filter(([id,i])=>(future.value||C.rank(i.min)<=C.rank(props.game.core.player.realm)||props.game.core.inventory[id]>0)&&(filter.value==='all'||i.kind===filter.value)));
const paged=computed(()=>pageSlice<[string,unknown]>(rows.value,page.value,2)),cache=computed(()=>({game:props.game,map:new Map<string,ReturnType<typeof previewAction>>() }));
function quote(action:Action){const c=cache.value,key=JSON.stringify(action);if(!c.map.has(key))c.map.set(key,previewAction(c.game,action));return c.map.get(key)!;}
function can(action:Action){return props.available&&!props.busy&&quote(action).allowed;}
function why(action:Action){return props.busy?'当前行动进行中':!props.available?'存档未就绪':quote(action).failure?.message??'';}
function locate(){if(!props.highlight.startsWith('craft-'))return;const id=props.highlight.slice(6);future.value=!!C.recipes[id]&&C.rank(C.recipes[id].min)>C.rank(props.game.core.player.realm);page.value=Math.max(0,Math.floor(rows.value.findIndex(([key])=>key===id)/2));}
watch(()=>props.highlight,locate,{immediate:true});watch([filter,future,()=>props.mode],()=>{page.value=0;},{flush:'sync'});watch(()=>props.game.core.runId,()=>{page.value=0;filter.value='all';future.value=false;});watch(()=>props.game.core.revision,()=>page.value=paged.value.page);
</script>
<template>
 <section class="paper play-catalogue goods-catalogue" :data-testid="mode==='forge'?'recipe-catalogue':'inventory-catalogue'" tabindex="-1">
  <header><div><small>{{mode==='forge'?'按固定配方炼制，物资由实际行动消耗':'物资保存在当前人生，可追踪其来源'}}</small><h2>{{mode==='forge'?'丹炉':'行囊'}}</h2></div><label><input type="checkbox" v-model="future" aria-label="显示后续物资配方"> 后续境界</label></header>
  <nav v-if="mode==='inventory'" class="catalogue-tabs" aria-label="行囊分类"><button v-for="[id,label] in [['all','全部'],['material','灵材'],['medicine','丹药'],['breakthrough','突破物']]" :key="id" :aria-pressed="filter===id" @click="filter=id">{{label}}</button></nav>
  <p v-if="mode==='forge'&&game.core.world.location!=='cave'" class="catalogue-options">炼丹需在洞府。<button @click="emit('travel','cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">前往洞府</button></p>
  <div v-if="!rows.length" class="catalogue-empty" :data-testid="mode==='forge'?'forge-locked':'catalogue-empty'">当前尚无可用{{mode==='forge'?'配方；引气入体后可炼丹':'物资条目'}}。<button @click="future=true">查看后续目录</button></div>
  <div v-else-if="mode==='inventory'" class="catalogue-grid inventory-cards"><article v-for="[id] in paged.rows" :key="id"><h3><GameIcon kind="item" :id="id"/>{{C.items[id].name}} <b :data-testid="'item-'+id">×{{game.core.inventory[id]}}</b></h3><p>{{C.items[id].description}}</p><template v-if="C.items[id].hp||C.items[id].mp"><small>{{why({type:'USE',item:id})}}</small><small>{{consumption({type:'USE',item:id})}}</small><button @click="emit('act',{type:'USE',item:id})" :disabled="!can({type:'USE',item:id})">服用 · {{actionSeconds({type:'USE',item:id})}} 秒</button></template><template v-else-if="C.items[id].sell!==null&&game.core.world.location==='market'"><small>{{why({type:'SELL',item:id,quantity:1})}}</small><small>{{consumption({type:'SELL',item:id,quantity:1})}}</small><button @click="emit('act',{type:'SELL',item:id,quantity:1})" :disabled="!can({type:'SELL',item:id,quantity:1})">售出 · {{C.items[id].sell}}</button></template><button class="text-button" :data-testid="'track-'+id" @click="emit('track',{kind:'item',id,quantity:1})">追踪来源 →</button></article></div>
  <div v-else class="catalogue-grid recipe-cards"><article v-for="[id] in paged.rows" :key="id"><h3><GameIcon kind="item" :id="C.recipes[id].output"/>{{C.recipes[id].name}}</h3><p>{{formatCosts(quote({type:'CRAFT',recipeId:id}).costs)}}</p><small>{{why({type:'CRAFT',recipeId:id})}}</small><small>{{consumption({type:'CRAFT',recipeId:id})}}</small><button :data-testid="'craft-'+id" @click="emit('act',{type:'CRAFT',recipeId:id})" :disabled="!can({type:'CRAFT',recipeId:id})">炼制 · {{actionSeconds({type:'CRAFT',recipeId:id})}} 秒</button><button class="text-button" @click="emit('track',{kind:'item',id:C.recipes[id].output,quantity:1})">查看来源与筹备 →</button></article></div>
  <CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" :label="mode==='forge'?'配方':'行囊'" @change="page=$event"/>
 </section>
</template>
