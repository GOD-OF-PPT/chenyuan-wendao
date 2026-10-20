<script setup lang="ts">
import {computed,inject,onMounted,onScopeDispose,ref} from 'vue';
import type {Game} from '../../src/full/types.ts';
import type {ConfigurationIntent} from '../../src/full/configuration.ts';
import {configurationPreview} from '../../src/full/configuration.ts';
import * as C from '../../src/full/content.ts';
import {gameFocusKey} from './focus';
import GameIcon from './GameIcon.vue';
const props=defineProps<{intent:ConfigurationIntent;snapshot:Game;stale:boolean;busy:boolean;error:string;retry:boolean;available:boolean}>();
const emit=defineEmits<{confirm:[];retry:[];refresh:[];close:[]}>();
const dialog=ref<HTMLDialogElement>(),focus=inject(gameFocusKey),quote=computed(()=>configurationPreview(props.snapshot,props.intent.command));
const title=computed(()=>({SCHOOL:'择定修法',EQUIP:'更换功法',EQUIP_RELIC:'祭炼本命'}[props.intent.command.type]));
const school=(id:Game['school'])=>id==='sword'?'剑修':id==='talisman'?'符修':'尚未择法';
const skill=(id:string|null)=>id?C.skills[id]?.name??id:'未装备';
const relic=(id:string|null)=>id?C.relics[id]?.name??id:'未装备';
const slots=['mind','builder','finisher','relic'] as const;
const labels={mind:'修炼心法',builder:'常用术法',finisher:'终结招式',relic:'本命法宝'};
const change=(slot:typeof slots[number])=>quote.value.before.loadout[slot]!==quote.value.after.loadout[slot];
const comparedSlot=computed(()=>props.intent.command.type==='EQUIP'?C.skills[props.intent.command.skill].slot:props.intent.command.type==='SCHOOL'?'mind':null);
onMounted(()=>focus?.open(dialog.value));onScopeDispose(()=>focus?.release(dialog.value));
</script>
<template>
 <dialog ref="dialog" class="configuration-dialog paper" data-testid="configuration-dialog" aria-labelledby="configuration-title" @cancel.prevent="!busy&&emit('close')" @close="emit('close')">
  <span class="eyebrow">器随道转 · 确认后保存</span><h2 id="configuration-title" data-dialog-initial tabindex="-1">{{title}}</h2>
  <p v-if="intent.command.type==='SCHOOL'">择法将更换下列三项功法。已掌握的功法和本命法宝保留。</p>
  <p v-else>此处只更换已掌握或已持有的配装，不研习、不炼制、不旅行。</p>
  <div class="configuration-schools"><span>{{school(quote.before.school)}}</span><span aria-hidden="true">→</span><strong>{{school(quote.after.school)}}</strong></div>
  <div class="configuration-slots">
   <article v-for="slot in slots" :key="slot" :class="{changed:change(slot)}"><GameIcon :kind="slot==='relic'?'relic':'skill'" :id="quote.after.loadout[slot]??(slot==='relic'?'cloud_mirror':'sword_mind')"/><div><span>{{labels[slot]}}</span><p>{{slot==='relic'?relic(quote.before.loadout[slot]):skill(quote.before.loadout[slot])}} <b>→ {{slot==='relic'?relic(quote.after.loadout[slot]):skill(quote.after.loadout[slot])}}</b></p></div></article>
  </div>
  <div v-if="intent.command.type==='EQUIP_RELIC'" class="configuration-relic-effects" data-testid="configuration-relic-effects"><p>原器：{{quote.before.loadout.relic?C.relics[quote.before.loadout.relic].description:'未装备，无器物加成'}}</p><p>拟换：{{quote.after.loadout.relic?C.relics[quote.after.loadout.relic].description:'未装备，无器物加成'}}</p></div>
  <div v-else-if="comparedSlot" data-testid="configuration-skill-effects"><p>原法：{{quote.before.loadout[comparedSlot]?C.skills[quote.before.loadout[comparedSlot]!].description:'尚未择法，无功法效果'}}</p><p>拟换：{{quote.after.loadout[comparedSlot]?C.skills[quote.after.loadout[comparedSlot]!].description:'尚未择法，无功法效果'}}</p></div>
  <p class="configuration-effects" data-testid="configuration-effects">修炼加成 {{quote.before.cultivationBonus}} → {{quote.after.cultivationBonus}} · 护御 {{quote.before.guard}} → {{quote.after.guard}}<br>符印伤害 {{quote.before.markDamage}} → {{quote.after.markDamage}} · 剑简加成 {{quote.before.manualDamageBonus}} → {{quote.after.manualDamageBonus}}</p>
  <p>无需灵石、丹药或游戏岁月。确认即原子保存；原安排不会自动继续。</p>
  <p v-if="stale" role="status">{{retry?'原确认的回复待核对，请重试原确认；不会重复换装。':'进度或活动已变化，请重新核对后确认。'}}</p><p v-else-if="!quote.allowed" role="status">{{quote.failure?.message}}</p><p v-if="error" role="alert">{{error}}</p>
  <footer><button @click="emit('close')" :disabled="busy" data-testid="configuration-cancel">暂不更换</button><button v-if="stale&&!retry" @click="emit('refresh')" :disabled="busy||!available" data-testid="configuration-refresh">重新核对</button><button v-else-if="retry" @click="emit('retry')" :disabled="busy||!available" data-testid="configuration-retry">重试原确认</button><button v-else class="primary" @click="emit('confirm')" :disabled="busy||!available||!quote.allowed||!!error" data-testid="configuration-confirm">{{busy?'保存中…':'确认'+title}}</button></footer>
 </dialog>
</template>
