<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import type {SourcePlan} from '../../src/full/activity';
import * as C from '../../src/full/content';
import {sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import {useActivityPresentation} from './use-activity-effect';
import AssetImage from './AssetImage.vue';
import SourceObject from './SourceObject.vue';
import SourceCommission from './SourceCommission.vue';
import SourceSatchel from './SourceSatchel.vue';
import './art02-source.css';
import './ta08-source.css';
const props=defineProps<{game:Game;plan:SourcePlan;rows:[string,C.Source][];catalogue:{page:number;pages:number;total:number};available:boolean}>();
const emit=defineEmits<{select:[string];page:[number];locations:[];home:[];arrange:[]}>();
const {store,activity,runtime,working,progress,phase,effect}=useActivityPresentation(a=>a.version===2&&a.plan.sourceId===props.plan.sourceId,()=>props.game.core.runId+':'+props.game.core.world.location+':'+props.plan.sourceId);
const source=computed(()=>C.sources[props.plan.sourceId]);
const commission=computed(()=>props.game.core.world.location==='sect');
const landscape=computed(()=>sceneAssetPath(scenePresentation(props.game)));
const name=(id:string)=>id==='stones'?'灵石':C.items[id].name;
const gains=(s:C.Source)=>Object.entries(s.items).map(([id,n])=>name(id)+' ×'+n).concat(s.stones?'灵石 +'+s.stones:[]).join(' · ');
const state=computed(()=>!props.available||store?.error?'failed':runtime.value?phase.value==='saving'?'saving':'working':activity.value?.status??'idle');
const status=computed(()=>store?.activityPausing&&state.value!=='failed'?'正在停手，保存后暂停':({failed:'存档待核对 · 已停手',saving:'本轮保存中 · 保存后入囊',paused:'此段已暂停',stopped:'此段已结束',running:'此段安排已保存',working:commission.value?'委托进行中':'取材进行中',idle:'待安排'})[state.value]);
</script>
<template>
 <div class="source-field ta08-field" :class="{'source-working':working}" :data-location="game.core.world.location" :data-kind="commission?'commission':'natural'" :data-state="state" :data-source="plan.sourceId" data-testid="source-field">
  <div class="source-field-scene">
   <AssetImage class="source-field-landscape" :path="landscape" asset-id="source-location" eager/>
   <header class="source-field-location"><span>{{C.locations[game.core.world.location].name}} · {{commission?'承办差事':'取材寻踪'}}</span><div v-if="source" class="source-chosen"><strong>{{source.name}}</strong><span>每轮 {{source.months*30}} 秒 / {{source.months}} 游戏月 · {{gains(source)}} · 需{{C.realms[source.min].name}}<template v-if="source.xp"> · 修为最多 +{{source.xp}}</template></span></div><small v-if="source" class="source-field-hint">所得自动入囊，无需逐轮领取。</small></header>
   <template v-if="source">
    <div class="source-points"><nav class="source-point-grid" :aria-label="commission?'差事木签':'场景资源点'">
     <button v-for="[id,s] in rows" :key="id" :data-testid="'source-'+id" :aria-pressed="plan.sourceId===id" :aria-label="s.name+'，选择查看，不会立即执行'" @click="emit('select',id)"><strong>{{s.name}}</strong><small>{{gains(s)}} · 需{{C.realms[s.min].name}}</small></button>
    </nav><nav class="catalogue-pager ta08-source-pager" aria-label="来源翻页"><button data-testid="catalogue-prev" aria-label="上一页" :disabled="catalogue.page<=0" @click="emit('page',catalogue.page-1)">上页</button><span>{{catalogue.page+1}} / {{catalogue.pages}} 页 · {{catalogue.total}} 项</span><button data-testid="catalogue-next" aria-label="下一页" :disabled="catalogue.page+1>=catalogue.pages" @click="emit('page',catalogue.page+1)">下页</button></nav></div>
    <div class="ta08-object-zone">
     <SourceCommission v-if="commission" :source-id="plan.sourceId" :state="state" :progress="progress" :sequence="effect?.sequence??0" @arrange="emit('arrange')"/>
     <SourceObject v-else :source-id="plan.sourceId" :state="state" :progress="progress" :sequence="effect?.sequence??0" @arrange="emit('arrange')"/>
    </div>
    <aside class="source-focus">
     <div class="source-cycle-state"><strong data-testid="source-work-state">{{status}}</strong><span v-if="runtime" data-testid="source-local-countdown">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span></div>
     <SourceSatchel :game="game" :source-id="plan.sourceId" :activity="activity" :result="effect?.result??null" :sequence="effect?.sequence??0"/>
    </aside>
   </template>
   <div v-else class="source-field-empty catalogue-empty"><strong>{{game.core.player.realm==='mortal'?'引气入体后可采集与承接委托':'此地暂无采集或委托'}}</strong><p>查看其他地点，明确启程后才会离开此地。</p><button data-testid="source-other-location" @click="emit('locations')">查看可前往的地点</button><button @click="emit('home')">返回主舞台</button></div>
  </div>
  <slot name="arrangement"/>
 </div>
</template>
