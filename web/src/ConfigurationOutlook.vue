<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {Game} from '../../src/full/types.ts';
import type {ConfigurationAction} from '../../src/full/configuration.ts';
import {projectConfigurationCombat} from '../../src/full/progression.ts';
import {defaultEncounterPlan} from '../../src/full/adventure.ts';
import {previewResolution} from '../../src/full/engine.ts';
import * as C from '../../src/full/content.ts';
import {readingPages,type Reading} from './story-pages';
import CataloguePager from './CataloguePager.vue';
const props=defineProps<{snapshot:Game;action:ConfigurationAction}>();
const chosen=ref<'before'|'after'>('before'),page=ref(0);
const target=computed(()=>props.action.type==='EQUIP_RELIC'?C.relics[props.action.relic].name:props.action.type==='EQUIP'?C.skills[props.action.skill].name:props.action.school==='sword'?'剑修':'符修');
const quote=computed(()=>projectConfigurationCombat(props.snapshot,props.action));
const plans=computed(()=>{const e=quote.value.enemy,changed=previewResolution(props.snapshot,props.action);return{before:e?defaultEncounterPlan(props.snapshot,e):null,after:e&&changed.ok?defaultEncounterPlan(changed.value.nextState,e):null};});
const selected=computed(()=>chosen.value==='after'?quote.value.after:quote.value.before);
const itemText=(v:Record<string,number>)=>Object.entries(v).map(([id,n])=>(C.items[id]?.name??id)+' ×'+n).join('、')||'无';
const rows=computed<Reading[]>(()=>{const o=selected.value,p=plans.value[chosen.value],g=props.snapshot;if(!o)return[{key:'unavailable',title:'暂不能比较拟换配置',text:quote.value.failure?.message??'当前配置不能合法更换。'}];return[
 {key:'result',title:chosen.value==='before'?'原配装 · 本段结果':'拟换配装 · 本段结果',text:`预计周期合计${Math.ceil(o.onlineMs/1000)}秒；实际规则推演${o.turns}回合，胜利${o.victories}场。${o.complete?'本段已到停止边界':'未完成迎战'}；停止：${o.stopReason}。${o.failure?'原因：'+o.failure.message:''}不将这一示例称作更优或必胜。`},
 {key:'vitals',title:'真实起点与期末',text:`气血${g.core.player.hp} → ${o.hp}；灵力${g.core.player.mp} → ${o.mp}；累计毛耗灵力${o.spentMp}。消耗${itemText(o.spentItems)}；获得${itemText(o.gainedItems)}。未隐式疗养或补药。`},
 {key:'scope',title:'同一默认有限战策',text:p?`只迎战1场，最多${p.maxCycles}次动作，毛灵力预算${p.mpBudget}。招式优先级：${p.strategy.priority.map(v=>({release:'终结',technique:'起手',attack:'普通攻击',guard:'护体'}[v])).join(' → ')}；${p.strategy.respondHeavy?'应对重击':'不优先应对重击'}，释放门槛${p.strategy.releaseAt}层。`:'当前境界尚无可比较的普通敌人。'},
 {key:'medicine',title:'药匣与危险边界',text:p?`原有回春丹${g.core.inventory.healing_pill}、回灵丹${g.core.inventory.spirit_pill}。气血≤${p.strategy.healBelowPercent}%时用回春，整段最多${p.strategy.healingBudget}，保留${p.strategy.healingReserve}；灵力≤${p.strategy.restoreBelowPercent}%时用回灵，最多${p.strategy.spiritBudget}，保留${p.strategy.spiritReserve}。危险线${p.strategy.retreatBelowPercent}%，触线暂停。`:'先达到可历练境界再核对本段药匣。'}];});
const pages=computed(()=>readingPages(rows.value)),current=computed(()=>pages.value[Math.min(page.value,pages.value.length-1)]);
watch(chosen,()=>page.value=0);
</script>
<template>
 <section class="configuration-outlook" data-testid="configuration-outlook"><p class="outlook-context">拟换{{target}} · 本境示例：{{quote.enemy?C.enemies[quote.enemy].name:'尚无普通敌人'}} · 使用当前气血、灵力及药量；仅推演，不开战。</p><nav class="catalogue-tabs" aria-label="配装历练结果"><button :aria-pressed="chosen==='before'" data-testid="outlook-before" @click="chosen='before'">原配装</button><button :aria-pressed="chosen==='after'" data-testid="outlook-after" @click="chosen='after'">拟换配装</button></nav><article v-if="current" class="outlook-reading reading-text" :data-page-key="current.key" :data-page-part="current.part"><small>{{current.title}} · {{current.part}}/{{current.parts}}</small><p>{{current.text}}</p></article><CataloguePager :page="page" :pages="pages.length" :total="rows.length" label="历练预演" @change="page=$event"/></section>
</template>
