<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import LoadoutConstellation from './LoadoutConstellation.vue';
import ProductionPlanner from './ProductionPlanner.vue';
import LearningPlanner from './LearningPlanner.vue';
import type {Activity,CraftPlan,ForgePlan,PreparationPlan} from '../../src/full/activity.ts';
import type {useGame} from './store';
import * as C from '../../src/full/content.ts';
import type {Action,Game} from '../../src/full/types.ts';
import type {TrackingTarget} from '../../src/full/goals.ts';
import type {NavigationRequest} from './navigation';
const props=defineProps<{game:Game;enabled:boolean;busy:boolean;highlight:string;catalogue?:'skills'|'relics';running:boolean;activity:Activity|null;runtime:ReturnType<typeof useGame>['activityRuntime'];savedProduction:CraftPlan|ForgePlan|null;savedPreparationPlan:PreparationPlan|null;preparationSaved:boolean;consumption:(action:Action)=>string}>();
const emit=defineEmits<{act:[Action];track:[TrackingTarget];navigate:[NavigationRequest];start:[CraftPlan|ForgePlan|PreparationPlan];move:[CraftPlan|ForgePlan];travelPlan:[PreparationPlan]}>();
const section=ref(props.catalogue==='relics'?'relics':props.game.school?'skills':'school'),learningFocus=ref(''),relicInspection=ref<{runId:string;id:string}|null>(null);
const savedLearning=computed(()=>props.savedPreparationPlan?.kind==='learn'||props.savedPreparationPlan?.kind==='study'?props.savedPreparationPlan:null);
function inspectRelic(){section.value='relics';const id=props.game.loadout.relic;relicInspection.value=id?{runId:props.game.core.runId,id}:null;}
function inspectSlot(id:string|null){section.value=id?'skills':'school';learningFocus.value=id?'equip-'+id:'';}
watch(()=>props.catalogue,value=>{section.value=value==='relics'?'relics':props.game.school?'skills':'school';learningFocus.value='';relicInspection.value=null;});
watch(()=>props.game.core.runId,()=>{section.value=props.catalogue==='relics'?'relics':props.game.school?'skills':'school';learningFocus.value='';relicInspection.value=null;});
watch(()=>props.highlight,id=>{learningFocus.value='';relicInspection.value=null;if(/^(learn-|equip-)/.test(id)&&Object.hasOwn(C.skills,id.replace(/^(learn-|equip-)/,'')))section.value='skills';if(/^(forge-|equip-relic-)/.test(id)&&Object.hasOwn(C.relics,id.replace(/^(forge-|equip-relic-)/,'')))section.value='relics';if(id==='study-manual')section.value='manual';},{immediate:true});
watch(savedLearning,p=>{if(p)section.value=p.kind==='study'?'manual':'skills';});
</script>
<template>
 <section class="paper equipment-panel play-catalogue equipment-catalogue equipment-objects art10-equipment" :class="{'catalogue-gallery':section==='school'||section==='summary'}" :data-section="section" data-testid="equipment-panel" tabindex="-1" aria-label="功法与法宝">
  <nav class="catalogue-tabs" aria-label="功法法宝分类"><button v-for="[id,label] in [['school','修法'],['skills','功法'],['relics','法宝'],['manual','剑简'],['summary','配装']]" :key="id" :aria-pressed="section===id" @click="section=id;learningFocus='';relicInspection=null" :data-testid="'equipment-mode-'+id">{{label}}</button></nav>
  <LoadoutConstellation v-if="section==='school'||section==='summary'" :game="game" :mode="section" :enabled="enabled" :busy="busy" :running="running" @school="emit('act',{type:'SCHOOL',school:$event})" @slot="$event==='relic'?inspectRelic():inspectSlot(game.loadout[$event])"/>
  <KeepAlive :max="2"><LearningPlanner :key="game.core.runId+'learning'" v-if="section==='skills'||section==='manual'" embedded :mode="section==='manual'?'manual':'skills'" :game="game" :busy="busy" :available="enabled" :running="running" :highlight="learningFocus||highlight" :saved-plan="savedLearning" :plan-saved="preparationSaved" @start="emit('start',$event)" @act="emit('act',$event)" @track="emit('track',$event)" @travel="emit('travelPlan',$event)" @browse="section='skills'"/>
  <ProductionPlanner :key="game.core.runId+'relics'" v-else-if="section==='relics'" embedded mode="forge" :game="game" :busy="busy" :available="enabled" :running="running" :highlight="highlight" :relic-inspection="relicInspection" :saved-plan="savedProduction" :consumption="consumption" :activity="activity" :runtime="runtime" @start="emit('start',$event)" @track="emit('track',$event)" @act="emit('act',$event)" @travel="emit('move',$event)" @navigate="emit('navigate',$event)"/></KeepAlive>
 </section>
</template>
