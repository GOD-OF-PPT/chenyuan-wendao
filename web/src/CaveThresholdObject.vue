<script setup lang="ts">
import{computed}from 'vue';
import type{Game}from '../../src/full/types.ts';
import type{NavigationRequest}from './navigation';
import{caveThresholdView,caveFundingView}from './cave-threshold-view';
import ItemArtifact from './ItemArtifact.vue';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
import './art17-cave.css';
const props=withDefaults(defineProps<{game:Game;enabled:boolean;phase?:string;engaged?:boolean;remaining?:number;seconds?:number;failed?:boolean}>(),{phase:'idle',engaged:false,remaining:0,seconds:0,failed:false});
const emit=defineEmits<{inspect:[Event];navigate:[NavigationRequest]}>();
const view=computed(()=>caveThresholdView(props.game));
function funding(){const route=caveFundingView(props.game,view.value.fundingTarget);if(route)emit('navigate',route);}
</script>
<template>
 <div class="art17-object" data-testid="cave-threshold-object" :data-item="view.itemId??'none'" :data-owned="!!view.have" :data-engaged="engaged" :data-phase="failed?'failed':phase">
  <div class="art17-object-name"><small>{{view.realm}} · {{view.target}}</small><strong>{{view.itemName}}</strong></div>
  <button type="button" class="art17-hero" data-testid="cave-object-inspect" :aria-label="'查看'+view.itemName+'完整筹备'" :disabled="!enabled" @click="emit('inspect',$event)">
   <i class="art17-pedestal" aria-hidden="true"/><i class="art17-orbit" aria-hidden="true"/>
   <ItemArtifact v-if="view.itemId" :item-id="view.itemId" :owned="view.have>0"/>
   <AssetImage v-else path="art/v2/characters/player-seated-cold.webp" asset-id="cave-ready-meditator" fit="contain" eager><GameIcon kind="nav" id="cultivate"/></AssetImage>
   <span class="art17-inspect-label">翻阅完整筹备 ›</span>
  </button>
  <div class="art17-stock" role="status"><span v-if="view.itemId" data-testid="milestone-material">{{view.itemName}} · {{engaged||failed?'原准备':'实有'}} {{view.have}}</span><span v-else>本次引气不消耗突破丹</span><strong v-if="view.itemId" data-testid="cave-material-gap">{{view.missing?(view.have?'尚未备齐，尚缺 ':'图谱 · 未持有，尚缺 ')+view.missing:'已备齐 · 本次需 '+view.required}}</strong></div>
  <div v-if="engaged||failed" class="art17-cycle" data-testid="cave-stage-clock" role="status"><strong>{{failed?'存档待核对，尚未确认新成果':phase==='saving'?'保存中 · 尚未落定':'凝神破境'}}</strong><span v-if="engaged&&phase==='running'" data-testid="milestone-cycle-clock">{{remaining}} / {{seconds}} 秒</span></div>
  <nav v-if="view.routes.length" class="art17-routes" aria-label="当前突破物的筹备路线">
   <button v-for="route in view.routes" :key="route.kind" type="button" :data-testid="'cave-route-'+route.kind" :disabled="!enabled" @click="emit('navigate',route.request)"><span class="art17-route-sign" aria-hidden="true">{{route.kind==='recipe'?'炉':'市'}}</span><strong>{{route.verb}} ›</strong><small>耗石 {{route.stones}} · {{route.kind==='recipe'?'本炉':'采购'}} {{route.seconds}} 秒</small><small v-if="route.travelSeconds">行旅另 {{route.travelSeconds}} 秒</small><small>{{route.condition}}</small></button>
  </nav>
  <small v-if="view.extraDeficits.length" class="art17-view-boundary" aria-label="其他正式门槛"><span v-for="d in view.extraDeficits" :key="d.kind">{{d.kind==='hp'?'气血':d.kind==='mp'?'灵力':'余寿游戏月'}}尚缺 {{d.missing}}　</span></small>
  <small v-if="view.routes.length" class="art17-view-boundary">仅查看路线；完整材料、预算与条件在原安排中核对。</small>
  <button v-if="view.fundingNeeded" type="button" class="art17-funding" data-testid="cave-funding" :disabled="!enabled" @click="funding">缺灵石 · 查看筹石委托 ›</button>
 </div>
</template>
