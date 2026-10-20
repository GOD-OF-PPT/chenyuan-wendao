<script setup lang="ts">
import {computed,ref,watch,onMounted,onScopeDispose} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {previewAction,type ItemSource} from '../../src/full/queries.ts';
import {formatCosts} from './presentation';
import {preparationFor,resourceSources,sourceNavigation,pageSlice} from './play-flow';
import type {NavigationRequest} from './navigation';
import CataloguePager from './CataloguePager.vue';
import CatalogueArt from './CatalogueArt.vue';
const props=defineProps<{game:Game;busy:boolean;available:boolean}>(),emit=defineEmits<{act:[Action];navigate:[NavigationRequest];home:[]}>();
const route=ref<'craft'|'purchase'>('craft'),focus=ref<{item:string|null;quantity:number}|null>(null),page=ref(0);
const model=computed(()=>preparationFor(props.game)),action=computed(()=>route.value==='craft'?model.value.craft:model.value.buy),quote=computed(()=>action.value?previewAction(props.game,action.value):null);
const needs=computed(()=>{const c=quote.value?.costs;if(!c)return[];return [...Object.entries(c.items).map(([id,required])=>({id,label:C.items[id].name,required,have:props.game.core.inventory[id]})),...(c.stones?[{id:null,label:'灵石',required:c.stones,have:props.game.core.player.stones}]:[])];});
const pagerMedia=window.matchMedia('(max-width:1099px)'),compact=ref(pagerMedia.matches),capacity=computed(()=>compact.value?2:4);
function resized(){compact.value=pagerMedia.matches;page.value=0;}onMounted(()=>pagerMedia.addEventListener('change',resized));onScopeDispose(()=>pagerMedia.removeEventListener('change',resized));
const missingText=computed(()=>needs.value.filter(n=>n.have<n.required).map(n=>n.label+' ×'+(n.required-n.have)).join('、'));
const needPage=computed(()=>pageSlice(needs.value,page.value,capacity.value)),sources=computed(()=>focus.value?resourceSources(props.game,focus.value.item,Math.max(1,focus.value.quantity-(focus.value.item?props.game.core.inventory[focus.value.item]:props.game.core.player.stones))):[]),sourcePage=computed(()=>pageSlice(sources.value,page.value,compact.value?1:2));
const ready=computed(()=>!!quote.value?.allowed&&props.available&&!props.busy);
watch(route,()=>{focus.value=null;page.value=0;});watch(()=>props.game.core.runId,()=>{focus.value=null;page.value=0;});
function inspect(id:string|null,quantity:number){focus.value={item:id,quantity};page.value=0;}
function go(source:ItemSource){if(!focus.value)return;emit('navigate',sourceNavigation(source,focus.value.quantity));}
function travelAllowed(source:ItemSource){return props.available&&!props.busy&&(!source.navigation||previewAction(props.game,source.navigation).allowed);}
function earn(source:ItemSource){const deficit=source.deficits.find(d=>d.kind==='stones');if(deficit)inspect(null,deficit.required);}
</script>
<template>
 <section class="paper play-catalogue preparation-catalogue catalogue-gallery" data-testid="preparation-catalogue" tabindex="-1">
  <CatalogueArt kind="alchemy"/>
  <header><div><small>修炼 → 筹备 → 突破</small><h2>{{focus?(focus.item?C.items[focus.item].name:'灵石')+'来源':model.pill?'筹备'+C.items[model.pill].name:model.goal.title}}</h2></div><button v-if="focus" @click="focus=null;page=0" data-testid="prepare-back">← 返回材料清单</button><button v-else @click="emit('home')">返回修行</button></header>
  <p v-if="!model.pill">{{model.goal.preview?.failure?.message??'当前无需突破丹药。'}}<button @click="emit('home')">继续修行</button></p>
  <template v-else-if="game.core.inventory[model.pill]>0"><div class="preparation-ready"><strong>{{C.items[model.pill].name}}已备齐</strong><p>当前 {{game.core.inventory[model.pill]}} 枚。{{model.goal.preview?.failure?.message??'返回洞府即可确认下一步。'}}</p><button class="primary" @click="emit('home')">返回修行，核对突破</button></div></template>
  <template v-else>
   <nav v-if="!focus" class="catalogue-tabs" aria-label="丹药筹备路线"><button :aria-pressed="route==='craft'" @click="route='craft'" data-testid="prepare-craft-route">自行炼制</button><button :aria-pressed="route==='purchase'" @click="route='purchase'" data-testid="prepare-purchase-route">坊市成丹</button></nav>
   <template v-if="!focus"><p class="catalogue-description">{{route==='craft'?'收齐材料后回洞府炼丹；材料有多条来源。':'积攒灵石到坊市购买成丹，无需战斗或炼制。'}}<span>本次成本：{{formatCosts(quote?.costs??null)}}</span></p>
    <div class="catalogue-grid preparation-needs"><article v-for="need in needPage.rows" :key="need.id??'stones'" :data-testid="'prepare-need-'+(need.id??'stones')"><div><strong>{{need.label}}</strong><span>{{need.have}} / {{need.required}}</span></div><small>{{need.have>=need.required?'已经备齐':'尚缺 '+(need.required-need.have)}}</small><button v-if="need.have<need.required" @click="inspect(need.id,need.required)" :data-testid="'prepare-source-'+(need.id??'stones')">{{need.id?'去获取':'去赚灵石'}} →</button></article></div>
    <CataloguePager :page="needPage.page" :pages="needPage.pages" :total="needPage.total" label="筹备材料" @change="page=$event"/>
    <footer class="catalogue-confirm"><small>{{missingText?'还需 '+missingText:quote?.failure?.message??'条件已齐，可以确认行动。'}}</small><button v-if="ready&&action" class="primary" :data-testid="route==='craft'?'prepare-confirm-craft':'prepare-confirm-buy'" @click="emit('act',action)">{{route==='craft'?'炼制丹药':'购买成丹'}}</button><button v-else-if="quote?.requirements.location&&quote.requirements.location!==game.core.world.location&&!quote.deficits.some(d=>d.kind==='item'||d.kind==='stones')" @click="emit('navigate',{location:quote.requirements.location,tab:route==='craft'?'行囊':'历练',focusId:route==='craft'?'craft-'+model.recipe?.id:'buy-'+model.pill,quantity:1})" :disabled="busy||!available" data-testid="prepare-go-finish">前往{{C.locations[quote.requirements.location].name}}</button></footer>
   </template>
   <template v-else>
    <div class="catalogue-grid source-catalogue"><article v-for="source in sourcePage.rows" :key="source.kind+source.id" :data-testid="'prepare-route-'+source.kind+'-'+source.id"><strong>{{source.label}}</strong><small>{{C.locations[source.location].name}} · {{source.conditionalOnVictory?'胜利后获得':'每份获得'}} {{source.rewardCount}}</small><small>成本：{{formatCosts(source.costs)}}</small><small v-if="source.failure">{{source.failure.message}}</small><div><button v-if="source.deficits.some(d=>d.kind==='stones')" @click="earn(source)">先筹灵石</button><button @click="go(source)" :disabled="!travelAllowed(source)" :data-testid="'prepare-go-'+source.kind+'-'+source.id">前往{{source.kind==='source'?'采集/委托':source.kind==='purchase'?'采购':source.kind==='battle'?'挑战':'查看'}}</button></div></article></div>
    <CataloguePager :page="sourcePage.page" :pages="sourcePage.pages" :total="sourcePage.total" label="来源" @change="page=$event"/>
    <p class="catalogue-note">前往只旅行或定位；采集、采购、挑战由你另行确认。</p>
   </template>
  </template>
 </section>
</template>
