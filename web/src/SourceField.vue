<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import type {SourcePlan} from '../../src/full/activity';
import * as C from '../../src/full/content';
import {sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import {useActivityPresentation} from './use-activity-effect';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
import CataloguePager from './CataloguePager.vue';
import './art02-source.css';
const props=defineProps<{game:Game;plan:SourcePlan;rows:[string,C.Source][];catalogue:{page:number;pages:number;total:number};available:boolean}>();
const emit=defineEmits<{select:[string];page:[number];locations:[];home:[]}>();
const {store,activity,runtime,working,progress,phase,effect}=useActivityPresentation(a=>a.version===2&&a.plan.sourceId===props.plan.sourceId,()=>props.game.core.runId+':'+props.game.core.world.location+':'+props.plan.sourceId);
const source=computed(()=>C.sources[props.plan.sourceId]);
const commission=computed(()=>props.game.core.world.location==='sect');
const resources=computed(()=>source.value?[...Object.keys(source.value.items),...(source.value.stones?['stones']:[])]:[]);
const landscape=computed(()=>sceneAssetPath(scenePresentation(props.game)));
const name=(id:string)=>id==='stones'?'灵石':C.items[id].name;
const stock=(id:string)=>id==='stones'?props.game.core.player.stones:props.game.core.inventory[id];
const icon=(s:C.Source)=>Object.keys(s.items)[0]??'inventory';
const gains=(s:C.Source)=>Object.entries(s.items).map(([id,n])=>name(id)+' ×'+n).concat(s.stones?'灵石 +'+s.stones:[]).join(' · ');
const state=computed(()=>!props.available||store?.error?'failed':runtime.value?phase.value==='saving'?'saving':'working':activity.value?.status??'idle');
const status=computed(()=>store?.activityPausing&&state.value!=='failed'?'正在停手，保存后暂停':({failed:'存档待核对 · 已停手',saving:'本轮保存中 · 保存后入囊',paused:'此段已暂停',stopped:'此段已结束',running:'此段安排已保存',working:commission.value?'委托进行中':'取材进行中',idle:'待安排'})[state.value]);
const total=(id:string)=>activity.value?.version===2?(id==='stones'?activity.value.gainedStones:activity.value.gainedItems[id]??0):0;
const arrival=computed(()=>{const r=effect.value?.result;if(r?.type!=='SOURCE')return '';return Object.entries(r.delta.inventory).filter(([,n])=>n>0).map(([id,n])=>name(id)+' +'+n).concat(r.delta.stones>0?'灵石 +'+r.delta.stones:[]).join(' · ');});
function point(index:number){const positions=commission.value?[[25,26],[70,26],[25,74],[70,74]]:props.rows.length===1?[[45,52]]:props.rows.length===2?[[27,69],[70,33]]:[[22,62],[52,33],[78,67]];const p=positions[index]??positions[0];return {'--point-x':p[0]+'%','--point-y':p[1]+'%'};}
</script>
<template>
 <div class="source-field" :class="{'source-working':working}" :data-location="game.core.world.location" :data-kind="commission?'commission':'natural'" :data-state="state" data-testid="source-field">
  <div class="source-field-scene">
   <AssetImage class="source-field-landscape" :path="landscape" asset-id="source-location" eager/>
   <header class="source-field-location"><strong>{{C.locations[game.core.world.location].name}}</strong><span v-if="arrival" :key="effect?.sequence" class="source-arrival" data-testid="source-arrival" :data-sequence="effect?.sequence" role="status">已入囊 · {{arrival}}</span><span>当前所在 · {{commission?'择一份差事，安排后逐轮承办':'点选资源，安排后逐轮取材'}}</span></header>
   <template v-if="source">
    <div class="source-points"><nav class="source-point-grid" :aria-label="commission?'差事木签':'场景资源点'">
     <button v-for="([id,s],index) in rows" :key="id" :style="point(index)" :data-testid="'source-'+id" :aria-pressed="plan.sourceId===id" :aria-label="s.name+'，选择查看，不会立即执行'" @click="emit('select',id)">
      <span class="source-object-mark"><i class="source-object-progress" :style="{'--source-progress':(working&&id===plan.sourceId?progress:0)*360+'deg'}" aria-hidden="true"/><GameIcon :kind="Object.keys(s.items).length?'item':'nav'" :id="icon(s)"/></span>
      <strong>{{s.name}}</strong><small>{{gains(s)}} · 需{{C.realms[s.min].name}}</small>
     </button>
    </nav><CataloguePager :page="catalogue.page" :pages="catalogue.pages" :total="catalogue.total" label="来源" @change="emit('page',$event)"/></div>
    <aside class="source-focus">
     <div class="source-chosen"><strong>{{source.name}}</strong><span>每轮 {{source.months*30}} 秒 / {{source.months}} 游戏月 · 需{{C.realms[source.min].name}}<template v-if="source.xp"> · 修为最多 +{{source.xp}}</template></span></div>
     <div class="source-cycle-state"><strong data-testid="source-work-state">{{status}}</strong><span v-if="runtime" data-testid="source-local-countdown">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span><small v-else>每轮 {{gains(source)}}，在线逐轮保存</small></div>
     <div class="source-field-bag" data-testid="source-field-bag"><strong>行囊 · 实际持有</strong><div v-for="id in resources" :key="id"><GameIcon :kind="id==='stones'?'nav':'item'" :id="id==='stones'?'inventory':id"/><span>{{name(id)}} <b>{{stock(id)}}</b><small>本段已保存 +{{total(id)}}</small></span></div></div>
     <small class="source-field-hint">所得自动入囊，无需逐轮领取。</small>
    </aside>
   </template>
   <div v-else class="source-field-empty catalogue-empty"><strong>{{game.core.player.realm==='mortal'?'引气入体后可采集与承接委托':'此地暂无采集或委托'}}</strong><p>查看其他地点，明确启程后才会离开此地。</p><button data-testid="source-other-location" @click="emit('locations')">查看可前往的地点</button><button @click="emit('home')">返回主舞台</button></div>
  </div>
  <slot name="arrangement"/>
 </div>
</template>
