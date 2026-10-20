<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import CatalogueArt from './CatalogueArt.vue';
import ProductionPlanner from './ProductionPlanner.vue';
import LearningPlanner from './LearningPlanner.vue';
import type {Activity,CraftPlan,ForgePlan,PreparationPlan} from '../../src/full/activity.ts';
import type {useGame} from './store';
import * as C from '../../src/full/content.ts';
import {stats} from '../../src/full/engine.ts';
import {previewAction,type ActionPreview} from '../../src/full/queries.ts';
import type {Action,Game} from '../../src/full/types.ts';
import type {TrackingTarget} from '../../src/full/goals.ts';
import type {NavigationRequest} from './navigation';
const props=defineProps<{game:Game;enabled:boolean;busy:boolean;highlight:string;catalogue?:'skills'|'relics';running:boolean;activity:Activity|null;runtime:ReturnType<typeof useGame>['activityRuntime'];savedProduction:CraftPlan|ForgePlan|null;savedPreparationPlan:PreparationPlan|null;preparationSaved:boolean;consumption:(action:Action)=>string}>();
const emit=defineEmits<{act:[Action];track:[TrackingTarget];navigate:[NavigationRequest];start:[CraftPlan|ForgePlan|PreparationPlan];move:[CraftPlan|ForgePlan];travelPlan:[PreparationPlan]}>();
const section=ref(props.catalogue==='relics'?'relics':props.game.school?'skills':'school'),learningFocus=ref('');
const slots={mind:'心法',builder:'起手术法',finisher:'终结术法'} as const;
const context=computed(()=>({game:props.game,cache:new Map<string,ActionPreview>()}));
function quote(action:Action){const c=context.value,key=JSON.stringify(action);if(!c.cache.has(key))c.cache.set(key,previewAction(c.game,action));return c.cache.get(key)!;}
const can=(action:Action)=>props.enabled&&!props.busy&&!props.running&&quote(action).allowed;
const why=(action:Action)=>!props.enabled?'存储尚未就绪，请先恢复存档连接':props.busy?'当前行动保存中，请稍候':props.running?'当前活动进行中，请先暂停后调整配装':quote(action).failure?.message??'';
const details=computed(()=>stats(props.game));
const savedLearning=computed(()=>props.savedPreparationPlan?.kind==='learn'||props.savedPreparationPlan?.kind==='study'?props.savedPreparationPlan:null);
function inspectSlot(id:string|null){section.value='skills';learningFocus.value=id?'equip-'+id:'';}
watch(()=>props.catalogue,value=>{section.value=value==='relics'?'relics':props.game.school?'skills':'school';learningFocus.value='';});
watch(()=>props.game.core.runId,()=>{section.value=props.catalogue==='relics'?'relics':props.game.school?'skills':'school';learningFocus.value='';});
watch(()=>props.highlight,id=>{learningFocus.value='';if(/^(learn-|equip-)/.test(id)&&Object.hasOwn(C.skills,id.replace(/^(learn-|equip-)/,'')))section.value='skills';if(/^(forge-|equip-relic-)/.test(id)&&Object.hasOwn(C.relics,id.replace(/^(forge-|equip-relic-)/,'')))section.value='relics';if(id==='study-manual')section.value='manual';},{immediate:true});
watch(savedLearning,p=>{if(p)section.value=p.kind==='study'?'manual':'skills';});
</script>
<template>
 <section class="paper equipment-panel play-catalogue equipment-catalogue" :class="{'catalogue-gallery':section==='school'||section==='summary'}" data-testid="equipment-panel" tabindex="-1" aria-label="功法与法宝">
  <CatalogueArt v-if="section==='school'||section==='summary'" kind="study"/>
  <div v-if="section==='school'||section==='summary'" class="section-label">功法与法宝 <span>预览比较后确认，不自动替换</span></div>
  <nav class="catalogue-tabs" aria-label="功法法宝分类"><button v-for="[id,label] in [['school','修法'],['skills','功法'],['relics','法宝'],['manual','剑简'],['summary','配装']]" :key="id" :aria-pressed="section===id" @click="section=id;learningFocus=''" :data-testid="'equipment-mode-'+id">{{label}}</button></nav>
  <template v-if="section==='summary'"><div class="loadout-summary"><div v-for="(label,slot) in slots" :key="slot"><small>{{label}} · 1槽</small><strong :data-testid="'loadout-'+slot">{{game.loadout[slot]?C.skills[game.loadout[slot]!].name:'尚未择法'}}</strong><button @click="inspectSlot(game.loadout[slot])">比较此槽功法</button></div><div><small>本命法宝 · 1槽</small><strong data-testid="loadout-relic">{{game.loadout.relic?C.relics[game.loadout.relic].name:'尚未装备'}}</strong><button @click="section='relics'">查看已炼器物</button></div></div><p class="small" data-testid="build-stats">静修加成 {{details.cultivationBonus}}% · 护体基础减伤 {{details.guard}}{{game.school==='talisman'?' · 每回合符印伤害 '+details.markDamage:''}}</p></template>
  <div v-if="section==='school'" class="school-picker"><h3>选择修法 <small>三基础槽会一起更换，研习记录与法宝保留；确认前可取消。</small></h3><div class="choices two"><button v-for="school in ['sword','talisman'] as const" :key="school" :data-testid="'school-'+school" :class="{selected:game.school===school}" :aria-pressed="game.school===school" @click="emit('act',{type:'SCHOOL',school})" :disabled="!can({type:'SCHOOL',school})"><strong>{{school==='sword'?'剑修 · 青锋剑诀':'符修 · 镇灵符诀'}}</strong><small>{{Object.values(C.startingLoadouts[school]).map(id=>C.skills[id].name).join(' / ')}}</small><small>{{why({type:'SCHOOL',school})||'比较基础组合后确认一次'}}</small></button></div></div>
  <LearningPlanner v-if="section==='skills'||section==='manual'" embedded :mode="section==='manual'?'manual':'skills'" :game="game" :busy="busy" :available="enabled" :running="running" :highlight="learningFocus||highlight" :saved-plan="savedLearning" :plan-saved="preparationSaved" @start="emit('start',$event)" @act="emit('act',$event)" @track="emit('track',$event)" @travel="emit('travelPlan',$event)"/>
  <ProductionPlanner v-if="section==='relics'" embedded mode="forge" :game="game" :busy="busy" :available="enabled" :running="running" :highlight="highlight" :saved-plan="savedProduction" :consumption="consumption" :activity="activity" :runtime="runtime" @start="emit('start',$event)" @track="emit('track',$event)" @act="emit('act',$event)" @travel="emit('move',$event)"/>
 </section>
</template>
