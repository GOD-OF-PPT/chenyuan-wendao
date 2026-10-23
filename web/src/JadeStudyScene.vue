<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import * as C from '../../src/full/content';
import {useEquipmentCycle,useConfigurationEcho} from './equipment-effects';
import GameIcon from './GameIcon.vue';
import CatalogueArt from './CatalogueArt.vue';
const props=defineProps<{game:Game;skillId:string;manual:boolean}>();
const emit=defineEmits<{inspect:[string]}>();
const skill=computed(()=>C.skills[props.skillId]);
const id=()=>props.manual?'jinghong':props.skillId;
const kind=computed(()=>props.manual?'study':'learn');
// The planner remounts this small scene on the kind boundary; drafts remain in its parent.
const cycle=useEquipmentCycle(kind.value,id),echo=useConfigurationEcho(()=>props.game.core.runId+':'+kind.value+':'+id());
const {store,activity,runtime,progress,engaged,effect}=cycle;
const working=computed(()=>engaged.value&&runtime.value?.phase==='running');
const mastered=computed(()=>props.manual?props.game.core.learnedSkills.includes(C.swordManual.id):props.game.learned.includes(props.skillId));
const equipped=computed(()=>!props.manual&&!!skill.value&&props.game.loadout[skill.value.slot]===props.skillId);
const attuned=computed(()=>echo.effect.value&&skill.value&&echo.effect.value.slots.includes(skill.value.slot)&&equipped.value);
const state=computed(()=>!store?.available||store.error?'failed':store.activityPausing&&activity.value?'stopping':effect.value?'learned':attuned.value?'equipped':runtime.value?.phase==='saving'&&engaged.value?'saving':engaged.value?'reading':activity.value?.status==='paused'?'paused':mastered.value?'mastered':'idle');
const status=computed(()=>({failed:store?.syncIssue?'存档待核对 · 已停卷':'保存待核对 · 请查看上方提示',stopping:'正在停手，保存后暂停',learned:props.manual?'剑简已悟 · 已保存':'此卷已掌握 · 已保存',equipped:'此法已装配 · 已保存',saving:'铭记所得 · 保存后才算掌握',reading:props.manual?'循剑意参悟':'展卷研读',paused:'此段研习已暂停',mastered:equipped.value?'此法已装配':'已经掌握 · 无需重复研习',idle:activity.value?.status==='running'?'当前研习其他经卷，或本页尚未接管':'择卷入席 · 安排后自动逐卷研习'})[state.value]);
const labels={mind:'心法',builder:'起手',finisher:'终结'} as const;
</script>
<template>
 <div class="jade-study-scene" data-testid="jade-study-scene" :data-state="state" :data-engaged="engaged" :data-working="working" :data-school="manual?'sword':skill?.school" :style="{'--study-progress':(working?progress:0)*360+'deg'}">
  <nav v-if="!manual" class="jade-slots" aria-label="当前三槽功法"><button v-for="(label,slot) in labels" :key="slot" :data-testid="'jade-slot-'+slot" :disabled="!game.loadout[slot]" :aria-label="'查看当前'+label+'，不更换配装'" @click="game.loadout[slot]&&emit('inspect',game.loadout[slot]!)"><small>{{label}}</small><strong>{{game.loadout[slot]?C.skills[game.loadout[slot]!].name:'尚未装备'}}</strong><span aria-hidden="true">◇</span></button></nav>
  <div class="jade-reading-place">
   <div v-if="!manual&&!skill" class="jade-empty-art"><CatalogueArt kind="study"/><small>藏经图鉴 · 当前无所选经卷</small></div><div v-else class="jade-manuscript" aria-hidden="true"><div class="jade-rune-orbit"/><div class="jade-tablet"><i v-for="n in 5" :key="n"/><GameIcon v-if="manual||skill" kind="skill" :id="manual?'sword_release':skillId||'sword_mind'"/><b>{{manual?'剑简':skill?labels[skill.slot]:'待择'}}</b></div><div class="jade-stone-rest"/></div>
   <div class="jade-readable"><slot name="description"/></div>
  </div>
  <div class="jade-cycle-status" role="status" data-testid="jade-study-status"><strong>{{status}}</strong><small v-if="runtime&&engaged">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</small><small v-else>{{manual?'一次60秒':'逐卷30秒'}} · 实际成果自动保存</small></div>
  <div v-if="effect||attuned" class="jade-saved-seal" data-testid="jade-arrival" :data-sequence="effect?.sequence??echo.effect.value?.sequence" aria-hidden="true">{{attuned?'已配':'已悟'}}</div>
  <div class="jade-object-action"><slot name="action"/></div>
 </div>
</template>
