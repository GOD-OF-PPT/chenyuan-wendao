<script setup lang="ts">
import{computed,ref,watch,onMounted,onScopeDispose}from'vue';
import type{Action,Game}from'../../src/full/types.ts';
import * as C from'../../src/full/content.ts';
import{previewAction,type ItemSource}from'../../src/full/queries.ts';
import{formatCosts}from'./presentation';
import{preparationFor,resourceSources,sourceNavigation,pageSlice}from'./play-flow';
import type{NavigationRequest}from'./navigation';
import CataloguePager from'./CataloguePager.vue';
import GoalBoard from'./GoalBoard.vue';
import ItemArtifact from'./ItemArtifact.vue';
import PreparationMaterials,{restoreMaterialFocus}from'./PreparationMaterials.vue';
import './preparation-bench.css';
const props=defineProps<{game:Game;busy:boolean;available:boolean;running:boolean;blocked?:boolean}>(),emit=defineEmits<{act:[Action];navigate:[NavigationRequest];home:[];compare:['gather'|'purchase']}>();
const route=ref<'craft'|'purchase'>('craft'),focus=ref<{item:string|null;quantity:number;page:number}|null>(null),page=ref(0);
const model=computed(()=>preparationFor(props.game)),pill=computed(()=>model.value.pill),have=computed(()=>pill.value?props.game.core.inventory[pill.value]:0),action=computed(()=>route.value==='craft'?model.value.craft:model.value.buy),quote=computed(()=>action.value?previewAction(props.game,action.value):null);
const needs=computed(()=>{const c=quote.value?.costs;if(!c)return[];return [...Object.entries(c.items).map(([id,required])=>({id,label:C.items[id].name,required,have:props.game.core.inventory[id]})),...(c.stones?[{id:null,label:'灵石',required:c.stones,have:props.game.core.player.stones}]:[])];});
const media=window.matchMedia('(max-width:1099px)'),compact=ref(media.matches),capacity=computed(()=>compact.value?2:4);
function resized(){compact.value=media.matches;page.value=0;}onMounted(()=>media.addEventListener('change',resized));onScopeDispose(()=>media.removeEventListener('change',resized));
const missing=computed(()=>needs.value.filter(n=>n.have<n.required));
const needPage=computed(()=>pageSlice(needs.value,page.value,capacity.value)),sources=computed(()=>focus.value?resourceSources(props.game,focus.value.item,Math.max(1,focus.value.quantity-(focus.value.item?props.game.core.inventory[focus.value.item]:props.game.core.player.stones))):[]),sourcePage=computed(()=>pageSlice(sources.value,page.value,compact.value?1:2));
const ready=computed(()=>!!quote.value?.allowed&&props.available&&!props.busy);
watch(route,()=>{focus.value=null;page.value=0;});watch(()=>props.game.core.runId,()=>{focus.value=null;page.value=0;});
function inspect(id:string|null,quantity:number){focus.value={item:id,quantity,page:focus.value?.page??page.value};page.value=0;}
function back(e:Event){const f=focus.value;if(!f)return;page.value=f.page;focus.value=null;restoreMaterialFocus(e,f.item);}
function go(source:ItemSource){if(!focus.value)return;emit('navigate',sourceNavigation(source,focus.value.quantity));}
function canTravel(source:ItemSource){return props.available&&!props.busy&&(!props.running||!source.navigation)&&!(props.blocked&&source.navigation)&&(!source.navigation||previewAction(props.game,source.navigation).allowed);}
function earn(source:ItemSource){const deficit=source.deficits.find(d=>d.kind==='stones');if(deficit)inspect(null,deficit.required);}
</script>
<template>
<section class="paper play-catalogue preparation-catalogue" data-testid="preparation-catalogue" :data-route="route" tabindex="-1">
<header><div><small>修炼 → 筹备 → 突破</small></div><button data-testid="preparation-compare" @click="emit('compare',route==='purchase'?'purchase':'gather')">比较筹备取舍</button><button v-if="focus" @click="back" data-testid="prepare-back">← 返回材料清单</button><button v-else @click="emit('home')">返回修行</button></header>
<GoalBoard :title="focus?(focus.item?C.items[focus.item].name:'灵石')+'来源':pill?'筹备'+C.items[pill].name:model.goal.title" :kind="focus?focus.item?'item':'stones':pill?'item':'breakthrough'" :id="focus?.item??pill??''" :state="(!focus||focus.item)&&(focus?.item??pill)&&!game.core.inventory[(focus?.item??pill)!]?'图谱 · 未持有':undefined" :ready="!!pill&&have>0" :detail="focus?'当前 '+(focus.item?game.core.inventory[focus.item]:game.core.player.stones)+' / '+focus.quantity:pill?'现有 '+have+' 枚':''">
<template v-if="focus?.item||!focus&&pill" #artifact><span class="preparation-target-art"><ItemArtifact :item-id="(focus?.item??pill)!" :owned="game.core.inventory[(focus?.item??pill)!]>0"/></span></template>
<template #conditions>
<p v-if="!pill">{{model.goal.preview?.failure?.message??'当前无需突破丹药。'}}<button @click="emit('home')">继续修行</button></p>
<template v-else-if="have>0"><div class="preparation-ready"><strong>{{C.items[pill].name}}已备齐</strong><p>当前 {{have}} 枚。{{model.goal.preview?.failure?.message??'返回洞府即可确认下一步。'}}</p><button class="primary" @click="emit('home')">返回修行，核对突破</button></div></template>
<template v-else-if="!focus">
<nav class="goal-route-choice" aria-label="丹药筹备路线"><button :aria-pressed="route==='craft'" @click="route='craft'" data-testid="prepare-craft-route"><span class="goal-route-mark" aria-hidden="true">鼎</span><strong>自行炼制</strong><small>备药入炉 · 查看材料</small></button><button :aria-pressed="route==='purchase'" @click="route='purchase'" data-testid="prepare-purchase-route"><span class="goal-route-mark" aria-hidden="true">市</span><strong>坊市成丹</strong><small>筹石换丹 · 查看所需</small></button></nav>
<p class="catalogue-description">{{route==='craft'?'材料齐后回洞府炼丹；来源可选。':'攒灵石到坊市购丹，无需战斗或炼制。'}}<span>本次成本：{{formatCosts(quote?.costs??null)}}</span></p>
<PreparationMaterials :needs="needPage.rows" @inspect="inspect"/>
<CataloguePager :page="needPage.page" :pages="needPage.pages" :total="needPage.total" label="筹备材料" @change="page=$event"/>
</template>
</template>
<template v-if="pill&&!have&&focus" #routes>
<div class="catalogue-grid source-catalogue"><article v-for="source in sourcePage.rows" :key="source.kind+source.id" :data-testid="'prepare-route-'+source.kind+'-'+source.id"><strong>{{source.label}}</strong><small>{{C.locations[source.location].name}} · {{source.conditionalOnVictory?'胜利后获得':'每份获得'}} {{source.rewardCount}}</small><small>成本：{{formatCosts(source.costs)}}</small><small v-if="source.failure">{{source.failure.message}}</small><div><button v-if="source.deficits.some(d=>d.kind==='stones')" @click="earn(source)">查看灵石来源</button><button @click="go(source)" :disabled="!canTravel(source)" :data-testid="'prepare-go-'+source.kind+'-'+source.id">{{source.navigation?'前往':'查看'}}{{source.navigation?C.locations[source.location].name:source.kind==='source'?'此地采集/委托':source.kind==='purchase'?'此地采购':source.kind==='battle'?'此地挑战':'此地机缘'}}</button></div></article></div>
<CataloguePager :page="sourcePage.page" :pages="sourcePage.pages" :total="sourcePage.total" label="来源" @change="page=$event"/>
<p class="catalogue-note">{{blocked?'请先处理原安排或重新读取；仍可查看。':'前往只旅行或定位；采集、采购、挑战由你另行确认。'}}</p>
</template>
<template v-if="pill&&!have&&!focus" #decision>
<footer class="catalogue-confirm"><small v-if="missing.length!==1||!needPage.rows.includes(missing[0])">{{missing.length?'还需 '+missing.map(n=>n.label+' ×'+(n.required-n.have)).join('、'):quote?.failure?.message??'条件已齐，可以查看安排。'}}</small><button v-if="ready&&action" class="primary" :data-testid="route==='craft'?'prepare-confirm-craft':'prepare-confirm-buy'" @click="emit('act',action)">{{route==='craft'?'查看炼丹安排 →':'查看购丹安排 · 不立即购买'}}</button><button v-else-if="quote?.requirements.location&&quote.requirements.location!==game.core.world.location&&!quote.deficits.some(d=>d.kind==='item'||d.kind==='stones')" @click="emit('navigate',{location:quote.requirements.location,tab:route==='craft'?'行囊':'历练',focusId:route==='craft'?'craft-'+model.recipe?.id:'buy-'+pill,quantity:1})" :disabled="busy||running||!available||blocked" data-testid="prepare-go-finish">前往{{C.locations[quote.requirements.location].name}}</button></footer>
</template>
</GoalBoard>
</section>
</template>
