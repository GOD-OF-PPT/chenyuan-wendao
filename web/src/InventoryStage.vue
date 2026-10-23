<script setup lang="ts">
import {computed} from 'vue';
import type {Action,Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import type {TrackingTarget} from '../../src/full/goals.ts';
import GameIcon from './GameIcon.vue';
const props=defineProps<{game:Game;itemId:string;available:boolean;reason:string;consumption:(a:Action)=>string}>();
const emit=defineEmits<{act:[Action];track:[TrackingTarget]}>();
const item=computed(()=>C.items[props.itemId]),stock=computed(()=>props.game.core.inventory[props.itemId]);
const main=computed(()=>stock.value&&(item.value.hp||item.value.mp)?'use':stock.value&&item.value.sell!==null?'sell':'source');
function view(kind:string){if(kind==='source')emit('track',{kind:'item',id:props.itemId,quantity:1});else emit('act',kind==='use'?{type:'USE',item:props.itemId}:{type:'SELL',item:props.itemId,quantity:1});}
function label(kind:string){return kind==='use'?'查看服丹安排 · 不立即用药':kind==='sell'?'查看出售安排 · 每件 '+item.value.sell+' 灵石':'查看'+item.value.name+'来源 →';}
</script>
<template>
 <div class="inventory-stage" data-testid="inventory-stage" :data-item="itemId" :data-owned="stock>0">
  <div class="inventory-directory"><slot name="directory"/></div>
  <div class="inventory-hand">
   <small class="inventory-hand-caption">{{stock?'已从行囊选中 · 查看不消耗':'物资图谱 · 尚未持有'}}</small>
   <button class="inventory-held primary" :data-testid="main==='source'?'track-'+itemId:'inspect-'+main+'-'+itemId" :disabled="main!=='source'&&!available" @click="view(main)">
    <span class="inventory-cloth" aria-hidden="true"></span><GameIcon kind="item" :id="itemId"/>
    <strong>{{item.name}}</strong><span class="inventory-held-stock">实存 {{stock}} 件</span><span class="inventory-hand-verb">{{label(main)}}</span>
   </button>
   <small>选定用途后再确认安排，不必逐次领取。</small>
  </div>
  <article class="inventory-object" data-testid="inventory-object">
   <header><small>{{item.kind==='medicine'?'随身丹药':item.kind==='breakthrough'?'破境之物':'修行灵材'}}</small><h3>{{item.name}} <b>×{{stock}}</b></h3></header><p>{{item.description}}</p>
   <template v-if="item.hp||item.mp"><small>{{reason}}</small><small>{{consumption({type:'USE',item:itemId})}}</small><button v-if="main!=='use'" :data-testid="'inspect-use-'+itemId" :disabled="!available" @click="view('use')">{{label('use')}}</button></template>
   <template v-if="item.sell!==null"><small>{{consumption({type:'SELL',item:itemId,quantity:1})}}</small><button v-if="main!=='sell'" :data-testid="'inspect-sell-'+itemId" :disabled="!available" @click="view('sell')">{{label('sell')}}</button></template><small v-else class="inventory-kept">突破物不可出售。</small>
   <button v-if="main!=='source'" :data-testid="'track-'+itemId" @click="view('source')">{{label('source')}}</button>
  </article>
 </div>
</template>
<style>
.immersive-stage .inventory-stage{display:grid;grid-template-columns:300px minmax(0,1fr) 330px;gap:24px;flex:1;min-height:0}
.immersive-stage .inventory-stage .inventory-directory{justify-content:space-between;gap:8px}
.immersive-stage .inventory-stage .inventory-objects{position:relative;padding:8px;gap:12px;background:repeating-linear-gradient(15deg,#1e484429 0 2px,transparent 2px 8px),linear-gradient(120deg,#2c4948,#143135);border:1px solid #7c99836b;border-radius:12px 36px 12px 22px;box-shadow:inset 0 0 35px #071c24aa,0 12px 22px #071d2855}
.immersive-stage .inventory-stage .inventory-objects>button{position:relative;min-height:130px;padding:8px 7px;gap:6px;border:0;border-bottom:1px solid #73978888;background:radial-gradient(ellipse at center,#4c70615c,#142c2f99);border-radius:12px 4px;box-shadow:inset 0 1px #a8c2a333;transition:background .18s,box-shadow .18s,transform .18s}
.immersive-stage .inventory-stage .inventory-objects>button[aria-pressed=true]{color:#e2f3cc;background:radial-gradient(ellipse,#66876688,#20443ddb);box-shadow:inset 0 0 0 2px #b5d6a3,0 0 15px #90c7ab28}
.immersive-stage .inventory-stage .inventory-objects>button:hover{transform:translateY(-2px)}
.immersive-stage .inventory-stage .inventory-objects>button:active{transform:translateY(1px);box-shadow:inset 0 3px 15px #041b27}
#app .inventory-stage .inventory-directory>.catalogue-pager{flex-wrap:nowrap;gap:8px}
#app .inventory-stage .inventory-directory>.catalogue-pager>span{width:auto;order:0}
#app .inventory-stage .inventory-directory>.catalogue-pager button{width:auto;min-width:44px;min-height:44px;padding:8px 10px;font-size:16px}
.inventory-hand{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:0;position:relative;background:radial-gradient(ellipse,#3a67524d,transparent 68%)}
.inventory-hand>small{font-size:14px;line-height:1.6;text-align:center;color:#c3d5bf}.inventory-hand-caption{border-bottom:1px solid #9db99a77;padding:6px 12px}
#app .inventory-stage .inventory-held{display:flex;position:relative;isolation:isolate;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px 16px;min-height:260px;flex:none;width:100%;max-width:370px;box-shadow:none!important;background:none!important;border:0!important;border-radius:0;color:#e4efce;transition:transform .18s}
.inventory-cloth{position:absolute;inset:40px 16px 80px;z-index:-1;pointer-events:none;transform:rotate(-6deg);border:1px solid #8ba68d77;border-radius:30% 10% 25% 8%;background:repeating-linear-gradient(0deg,transparent 0 4px,#a3c19d0a 4px 5px),linear-gradient(30deg,#264b44,#4b6955 44%,#23433e);box-shadow:0 18px 22px #071c24aa,inset 0 0 18px #152f2f}
.immersive-stage .inventory-held>.game-icon{width:120px;height:120px;color:#d3e4b5;filter:drop-shadow(0 8px 8px #071b21)}
.immersive-stage .inventory-held>strong{font-size:28px;line-height:1.4}.inventory-held-stock{font-size:18px;line-height:1.5}.inventory-hand-verb{font-size:18px;line-height:1.5;border:1px solid #a6c9a3aa;border-radius:28px;padding:10px 18px;background:linear-gradient(#347365,#174540);color:#eef3d9}
.inventory-held:hover .inventory-cloth{box-shadow:0 18px 22px #071c24aa,inset 0 0 26px #addaa22b}.inventory-held:active{transform:translateY(2px)}
.inventory-stage[data-owned=false] .inventory-cloth{background:linear-gradient(30deg,#1e383a,#2d4c48);border-style:dashed}.inventory-stage[data-owned=false] .inventory-held>.game-icon{opacity:.65}
.immersive-stage .inventory-stage .inventory-object{gap:10px;padding-left:18px;background:linear-gradient(90deg,#112f32b3,transparent)}.inventory-stage .inventory-object header>small{font-size:14px;color:#b6cdb5}.inventory-stage .inventory-kept{border-left:2px solid #adbd8a;padding:8px 12px;background:#273f36}
.hub-reduced .inventory-stage *{transition:none!important}
@media(prefers-reduced-motion:reduce){.inventory-stage *{transition:none!important}}
</style>
