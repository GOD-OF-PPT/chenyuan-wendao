<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import type {SkillSlot} from '../../src/full/content';
import * as C from '../../src/full/content';
import {stats} from '../../src/full/engine';
import {previewAction} from '../../src/full/queries';
import {useConfigurationEcho} from './equipment-effects';
import {PORTRAIT_ASSETS} from './assets';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
const props=defineProps<{game:Game;mode:'school'|'summary';enabled:boolean;busy:boolean;running:boolean}>();
const emit=defineEmits<{school:['sword'|'talisman'];slot:[SkillSlot|'relic']}>();
const {store,effect}=useConfigurationEcho(()=>props.game.core.runId+':'+props.mode);
const labels={mind:'心法',builder:'起手术法',finisher:'终结术法',relic:'本命法宝'} as const;
const actual=computed(()=>stats(props.game));
const reason=computed(()=>store?.error&&(store.canRetry||store.syncIssue)?'存档状态待核对，请先恢复或重试':!props.enabled?'存档未就绪':props.busy?'当前确认保存中':props.running?'当前活动进行中，请先暂停后更换':'');
const schoolReason=(school:'sword'|'talisman')=>reason.value||previewAction(props.game,{type:'SCHOOL',school}).failure?.message||'';
const name=(slot:SkillSlot|'relic')=>{const id=props.game.loadout[slot];return id?(slot==='relic'?C.relics[id].name:C.skills[id].name):'尚未装备';};
</script>
<template>
 <div class="loadout-constellation" data-testid="loadout-constellation" :data-mode="mode" :data-school="game.school??'none'">
  <template v-if="mode==='school'"><div class="school-picker art16-school-picker"><AssetImage class="school-sanctum" path="art/v2/schools/sanctum-v1.webp" asset-id="school-sanctum" eager aria-hidden="true"><span class="school-sanctum-fallback"/></AssetImage><h3>择定修法 <small>道器仅作修法比照；三基础槽一起更换，研习与本命保留，先比较再确认。</small></h3><div class="school-altars" aria-label="两种修法道器"><button class="school-station" v-for="school in ['sword','talisman'] as const" :key="school" :data-testid="'school-'+school" :data-school="school" :aria-pressed="game.school===school" :data-saved="!!effect&&effect.result.type==='SCHOOL'&&game.school===school" :disabled="!!schoolReason(school)" @click="emit('school',school)"><span class="school-station-object" data-testid="school-station-object"><AssetImage :path="'art/v2/schools/'+school+'-station-v1.webp'" :asset-id="'school-station-'+school" fit="contain" eager><GameIcon kind="skill" :id="C.startingLoadouts[school].builder"/></AssetImage><i class="school-station-ground" aria-hidden="true"/></span><strong>{{school==='sword'?'剑修 · 青锋剑诀':'符修 · 镇灵符诀'}}</strong><span class="school-style">{{school==='sword'?'蓄剑意 · 连招破敌':'布符印 · 延续攻势'}}</span><div class="school-starting-scrolls" aria-label="基础三法"><small v-for="id in Object.values(C.startingLoadouts[school])" :key="id">{{C.skills[id].name}}</small></div><b>{{game.school===school?'当前道途':school==='sword'?'执剑 · 比较修法 ›':'执符 · 比较修法 ›'}}</b><small class="school-reason">{{schoolReason(school)||'查看完整变化后，再确认修法'}}</small></button></div></div></template>
  <template v-else><div class="loadout-spirit-stage"><div class="loadout-body" aria-hidden="true"><AssetImage :path="PORTRAIT_ASSETS.player" asset-id="equipment-player-impression" fit="contain" eager><span>{{game.core.player.name}}</span></AssetImage><i class="loadout-meridian"/></div><div class="loadout-stage-caption"><strong>{{game.core.player.name}}</strong><small>三法护身 · 一器相随</small></div><div class="loadout-nodes"><button v-for="(label,slot) in labels" :key="slot" :class="['loadout-node','loadout-node-'+slot,{'loadout-node-saved':effect?.slots.includes(slot)}]" :data-testid="'loadout-node-'+slot" :aria-label="slot==='relic'?'查看已炼器物':game.loadout[slot]?'比较此槽功法':'先择修法'" @click="emit('slot',slot)"><GameIcon :kind="slot==='relic'?'relic':'skill'" :id="game.loadout[slot]??(slot==='relic'?'cloud_mirror':'sword_mind')"/><small>{{label}} · 1槽</small><strong :data-testid="'loadout-'+slot">{{name(slot)}}</strong><span>{{slot==='relic'?'查看已炼器物':game.loadout[slot]?'比较此槽功法':'先择修法'}} ›</span><b v-if="effect?.slots.includes(slot)">已保存</b></button></div></div><p class="loadout-actual-stats small" data-testid="build-stats">静修加成 {{actual.cultivationBonus}}% · 护体基础减伤 {{actual.guard}}{{game.school==='talisman'?' · 每回合符印伤害 '+actual.markDamage:''}}</p><p class="loadout-view-note" role="status" :data-testid="effect?'configuration-arrival':undefined" :data-sequence="effect?.sequence">{{effect?'实际配装已保存 · ':''}}点击槽位只查看；比较后确认才会更换，不自动研习、炼器或接续活动。</p></template>
  <p v-if="mode==='school'" class="loadout-view-note" role="status" :data-testid="effect?'configuration-arrival':undefined" :data-sequence="effect?.sequence">{{effect?'实际配装已保存；':''}}{{game.school?'道途已定；比较后可确认切换。':'先择修法：比较基础组合，再确认修法。'}}</p>
  <p v-if="reason" class="equipment-local-reason" role="status">{{reason}}</p>
 </div>
</template>
