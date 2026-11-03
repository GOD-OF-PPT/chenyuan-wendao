<script setup lang="ts">
import {computed} from 'vue';
import AssetImage from './AssetImage.vue';
import type {Game} from '../../src/full/types';
import * as C from '../../src/full/content';
import {useEquipmentCycle,useConfigurationEcho} from './equipment-effects';
import JadeEngraving from './JadeEngraving.vue';
import StudyQueueRail from './StudyQueueRail.vue';
import type {QueueView} from './equipment-choreography';
import CatalogueArt from './CatalogueArt.vue';
const props=defineProps<{game:Game;skillId:string;manual:boolean;queue:string[];queueView:QueueView|null}>();
const emit=defineEmits<{inspect:[string];plan:[];remember:[QueueView]}>();
const skill=computed(()=>C.skills[props.skillId]);
const id=()=>props.manual?'jinghong':props.skillId;
const kind=computed(()=>props.manual?'study':'learn');
// The planner remounts this small scene on the kind boundary; drafts remain in its parent.
const cycle=useEquipmentCycle(kind.value,id),echo=useConfigurationEcho(()=>props.game.core.runId+':'+kind.value+':'+id());
const {store,activity,runtime,progress,engaged,effect,command}=cycle;
const working=computed(()=>engaged.value&&runtime.value?.phase==='running');
const mastered=computed(()=>props.manual?props.game.core.learnedSkills.includes(C.swordManual.id):props.game.learned.includes(props.skillId));
const equipped=computed(()=>!props.manual&&!!skill.value&&props.game.loadout[skill.value.slot]===props.skillId);
const attuned=computed(()=>echo.effect.value&&skill.value&&echo.effect.value.slots.includes(skill.value.slot)&&equipped.value);
const state=computed(()=>!store?.available||store.error?'failed':store.activityPausing&&activity.value?'stopping':effect.value?'learned':attuned.value?'equipped':runtime.value?.phase==='saving'&&engaged.value?'saving':engaged.value?'reading':activity.value?.status==='paused'?'paused':mastered.value?'mastered':'idle');
const status=computed(()=>({failed:store?.syncIssue?'存档待核对 · 已停卷':'保存待核对 · 请查看上方提示',stopping:'正在停手，保存后暂停',learned:props.manual?'剑简已悟 · 已保存':'此卷已掌握 · 已保存',equipped:'此法已装配 · 已保存',saving:'铭记所得 · 保存后才算掌握',reading:props.manual?'循剑意参悟':'展卷研读',paused:'此段研习已暂停',mastered:props.manual?'剑简已悟 · 当前作用见经文':equipped.value?'此法已装配':'已经掌握 · 无需重复研习',idle:runtime.value&&command.value?.type==='LEARN'?(runtime.value.phase==='saving'?'正在保存':'本轮研习')+' '+C.skills[command.value.skill].name+' · 此卷仅查看':store?.activity?.version===5&&store.activity.status==='running'?'此卷仅供查看 · 原安排见当前活动':'择卷入席 · 安排后自动逐卷研习'})[state.value]);
const labels={mind:'心法',builder:'起手',finisher:'终结'} as const;
</script>
<template>
 <div class="jade-study-scene art10-study-scene" data-testid="jade-study-scene" :data-manual="manual" :data-state="state" :data-engaged="engaged" :data-working="working" :data-school="manual?'sword':skill?.school">
  <AssetImage class="study-sanctum" path="art/v2/schools/sanctum-v1.webp" asset-id="study-sanctum" eager aria-hidden="true"><span class="study-sanctum-fallback"/></AssetImage>
  <div class="jade-reading-place">
   <div v-if="!manual&&!skill" class="jade-empty-art"><CatalogueArt kind="study"/><small>藏经图鉴 · 当前无所选经卷</small></div><JadeEngraving v-else :skill-id="skillId" :manual="manual" :state="state" :progress="progress" :mastered="mastered" :equipped="equipped" :sequence="effect?.sequence??echo.effect.value?.sequence??0"><template #result><span v-if="effect||attuned" class="jade-saved-seal" data-testid="jade-arrival" :data-sequence="effect?.sequence??echo.effect.value?.sequence" aria-hidden="true">{{attuned?'已配':'已悟'}}</span></template></JadeEngraving>
   <div class="jade-readable"><slot name="description"/><div v-if="!manual" class="jade-object-action"><slot name="action"/></div></div>
  </div>
  <div class="jade-cycle-status" role="status" data-testid="jade-study-status"><strong>{{status}}</strong><small v-if="runtime&&engaged">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</small><small v-else-if="!manual||!mastered">{{manual?'一次60秒':'逐卷30秒'}} · 实际成果自动保存</small></div>
  <StudyQueueRail class="art10-scroll-rail" v-if="!manual" :game="game" :draft="queue" :activity="store?.activity??null" :command="command" :viewed="skillId" :view="queueView" @remember="emit('remember',$event)" @inspect="emit('inspect',$event)" @limits="emit('plan')"><template #slots><nav class="jade-slots" aria-label="当前三槽功法"><button v-for="(label,slot) in labels" :key="slot" :data-testid="'jade-slot-'+slot" :disabled="!game.loadout[slot]" :aria-label="'查看当前'+label+'，不更换配装'" @click="game.loadout[slot]&&emit('inspect',game.loadout[slot]!)"><small>{{label}}</small><strong>{{game.loadout[slot]?C.skills[game.loadout[slot]!].name:'尚未装备'}}</strong><span aria-hidden="true">◇</span></button></nav></template></StudyQueueRail>
  <div v-if="$slots.authorization" class="jade-authorization"><slot name="authorization"/></div>
 </div>
</template>
