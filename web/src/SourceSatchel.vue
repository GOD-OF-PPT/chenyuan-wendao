<script setup lang="ts">
import {useRuleContent} from './rule-content';

import {computed,onDeactivated,ref,useId,watch} from 'vue';
import type {Game} from '../../src/full/types';
import type {Activity} from '../../src/full/activity';
import type {ActionResult} from '../../src/full/contracts';
import * as C from '../../src/full/content';
import {sourceHoldings,sourcePeriodTotals,savedSourceYield} from './source-choreography';
import SourceStockGoal from './SourceStockGoal.vue';
import './ta08-source.css';
const ruleContent=useRuleContent(()=>props.game);
const props=defineProps<{game:Game;sourceId:string;activity:Activity|null;result:ActionResult|null;sequence:number}>();
const instance=useId(),paint=(material:string)=>`ta08-bag-${props.sourceId}-${instance}-${material}`;
const materials=computed(()=>Object.fromEntries(['bag','lid','clasp'].map(name=>['--ta08-'+name+'-fill',`url(#${paint(name)})`])));
const opened=ref(false);
const commission=computed(()=>ruleContent.value.sources[props.sourceId]?.location==='sect');
const rows=computed(()=>sourceHoldings(props.game,props.sourceId));
const totals=computed(()=>sourcePeriodTotals(props.game,props.sourceId,props.activity));
const saved=computed(()=>props.sequence>0?savedSourceYield(props.game,props.sourceId,props.activity,props.result):null);
const count=(id:string)=>id==='stones'?totals.value?.stones??0:totals.value?.items[id]??0;
watch([()=>props.game.core.runId,()=>props.sourceId],()=>opened.value=false);
onDeactivated(()=>opened.value=false);
</script>
<template>
 <aside class="ta08-satchel" data-testid="source-satchel" :data-source="sourceId" :data-kind="commission?'commission':'natural'" :data-inspecting="opened" :data-sequence="saved?sequence:0" :style="materials">
  <div class="source-field-bag ta08-bag-content" data-testid="source-field-bag">
   <button type="button" class="ta08-bag-inspect" data-testid="source-satchel-inspect" :aria-pressed="opened" :aria-label="(opened?'合上':'检视')+(commission?'承办匣':'采集袋')+'，只查看，不领取或执行'" @click="opened=!opened">
    <svg class="ta08-bag-vessel" viewBox="0 0 260 150" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
     <defs>
      <linearGradient :id="paint('bag')" x2=".8" y2="1"><stop stop-color="#819968"/><stop offset=".42" stop-color="#4a7753"/><stop offset="1" stop-color="#173e32"/></linearGradient>
      <linearGradient :id="paint('lid')" x2="0" y2="1"><stop stop-color="#9cae78"/><stop offset=".45" stop-color="#64855b"/><stop offset="1" stop-color="#274f3d"/></linearGradient>
      <linearGradient :id="paint('clasp')" x2="1" y2=".5"><stop stop-color="#675d3c"/><stop offset=".5" stop-color="#d4c691"/><stop offset="1" stop-color="#667855"/></linearGradient>
     </defs>
     <template v-if="commission"><path d="M46 61L128 40L215 63V120L129 144L46 119Z" class="ta08-bag-shell"/><path d="M46 61L129 86L215 63M129 86V144M59 91L115 108M146 110L200 92"/><path class="ta08-bag-lid" d="M44 56L128 33L217 57L214 75L129 98L46 75Z"/><path d="M119 89H139V115H119Z" class="ta08-bag-clasp"/></template>
     <template v-else><path d="M88 39Q65 67 62 111Q65 145 129 146Q196 144 198 110Q194 66 174 39Z" class="ta08-bag-shell"/><path d="M88 40Q127 54 174 40M91 60L80 117M171 61L182 118M99 136Q128 142 161 136"/><path class="ta08-bag-lid" d="M85 21L174 21L181 45Q130 63 80 45Z"/><path d="M83 44Q69 37 64 49Q67 61 83 47Q84 67 71 76M173 44Q195 36 199 50Q192 65 175 47Q177 65 191 75" class="ta08-bag-cord"/></template>
     <path v-if="commission" d="M129 86L215 63V120L129 144Z" fill="#0c2d25" fill-opacity=".3" stroke-opacity=".25"/>
     <path v-else d="M163 63Q182 99 173 132M158 67Q174 97 164 136M90 69L84 109" stroke="#c1cf9666" stroke-width="1"/>
     <g v-if="opened" class="ta08-bag-lining"><path d="M86 79Q127 64 176 79L169 111Q129 126 93 111Z"/><path v-if="rows.some(r=>r.quantity>0)" d="M105 98L113 83L124 101L137 86L150 102L160 90"/></g>
    </svg>
    <span>{{opened?'合上':'检视'}}{{commission?'承办匣':'采集袋'}}<small>当前库存</small></span>
   </button>
   <div class="ta08-held-rows"><div v-for="row in rows" :key="row.id" class="ta08-stock-row" :data-item="row.id"><span>{{row.name}}</span><b>{{row.quantity}}</b><SourceStockGoal :game="game" :source-id="sourceId" :row-id="row.id" :activity="activity"/><small><template v-if="totals&&totals.cycles>0">本段收获 +{{count(row.id)}}</template><template v-else>{{totals?'首轮尚无成果':'本次尚未安排'}}</template></small></div></div>
   <p v-if="totals" class="ta08-period-facts">本段 {{totals.cycles}} 轮 · 已用 {{totals.months}} 游戏月<template v-if="totals.xp"> · 实得修为 +{{totals.xp}}</template></p>
   <p v-if="saved" :key="sequence" class="ta08-satchel-result" data-testid="source-arrival" :data-sequence="sequence" role="status"><span data-testid="source-satchel-arrival" :data-sequence="sequence"><strong>本轮所得已入囊</strong><span>{{saved.items.map(row=>row.name+' +'+row.quantity).join(' · ')}}<template v-if="saved.xp>0"> · 修为 +{{saved.xp}}</template></span></span></p>
  </div>
  <div v-if="saved" :key="'transfer-'+sequence" class="ta08-saved-route" :data-sequence="sequence" aria-hidden="true">
   <span v-for="(row,index) in saved.items" :key="row.id" class="ta08-saved-transfer" :data-item="row.id" :style="{'--transfer-index':index}"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2">
    <path v-if="row.id==='stones'" d="M9 14L20 5L32 15L26 33L12 31ZM9 14L22 19L20 5M22 19L26 33"/>
    <path v-else-if="row.id==='herb'" d="M19 35L22 8M21 22Q6 24 6 10Q19 9 21 22ZM20 28Q35 28 34 15Q23 15 20 28Z"/>
    <path v-else-if="row.id==='dew'" d="M20 4C12 15 6 22 10 30Q20 41 30 30C35 21 27 12 20 4Z"/>
    <path v-else-if="row.id==='lotus'" d="M20 28Q3 24 6 11Q17 11 20 28ZM20 28Q38 23 34 11Q24 12 20 28ZM20 28Q10 12 20 3Q31 12 20 28ZM6 32Q20 26 35 32"/>
    <path v-else-if="row.id==='dao'" d="M7 30L12 22L17 30ZM18 26L24 12L30 26ZM28 33L33 25L38 33M2 35H38"/>
    <path v-else d="M9 30L12 13L20 4L30 15L31 31L20 37ZM12 13L20 20L20 4M20 20L20 37L30 15"/>
   </svg></span>
  </div>
 </aside>
</template>
