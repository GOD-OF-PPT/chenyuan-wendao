<script setup lang="ts">
import {useRuleContent} from './rule-content';

import {useLocalActivityControls} from './activity-controls';
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import * as C from '../../src/full/content';
import {stats} from '../../src/full/engine';
import {previewAction} from '../../src/full/queries';
import {useSupplyCycle} from './supply-effects';
import GameIcon from './GameIcon.vue';
import AssetImage from './AssetImage.vue';
import './art35-study-rest.css';
import ItemArtifact from './ItemArtifact.vue';
const ruleContent=useRuleContent(()=>props.game);
const props=defineProps<{game:Game;kind:'use'|'rest';itemId:string}>();
const emit=defineEmits<{source:[]}>();
const {store,activity,runtime,phase,progress,engaged,effect}=useSupplyCycle(()=>props.kind,()=>props.itemId);
const body=computed(()=>stats(props.game)),item=computed(()=>ruleContent.value.items[props.itemId]);
const one=computed(()=>previewAction(props.game,props.kind==='rest'?{type:'REST'}:{type:'USE',item:props.itemId}));
const state=computed(()=>store?.error||!store?.available?'failed':store.activityPausing&&activity.value?'pausing':engaged.value?phase.value==='saving'?'saving':phase.value==='running'?'running':'idle':activity.value?.status==='paused'?'paused':'idle');
const working=computed(()=>state.value==='running');
const status=computed(()=>({failed:store?.syncIssue?'进度待核对':'查看上方提示',pausing:'正在停手，保存后暂停',saving:'调息已毕 · 保存后回元',running:props.kind==='rest'?'静坐养息':'服丹调息',paused:'此段已暂停 · 药匣保留',idle:activity.value?.status==='stopped'?'本段安排已停止':'先择恢复方式，再确认安排'})[state.value]);
const saved=computed(()=>{const a=activity.value;return a?.version===5&&a.completedCycles?`本段已恢复：气血 +${a.restoredHp} · 灵力 +${a.restoredMp}`:'';});
const stock=computed(()=>props.game.core.inventory[props.itemId]??0);
const localControls=useLocalActivityControls();
</script>
<template>
 <div class="recovery-ritual art11-recovery" data-testid="recovery-ritual" data-copy30="recovery-object" :data-kind="kind" :data-state="phase" :data-status="state" :data-working="working" :data-engaged="engaged" :data-item="kind==='use'?itemId:'rest'">
  <nav class="recovery-methods" aria-label="药盏与静坐"><slot name="options"/></nav>
  <div class="recovery-body" aria-label="当前体魄">
   <div class="recovery-stat recovery-hp" :data-restored="!!effect&&effect.result.delta.hp>0"><span>气血</span><strong>{{game.core.player.hp}} / {{body.maxHp}}</strong><progress :value="game.core.player.hp" :max="body.maxHp" aria-label="当前气血"/></div>
   <div class="recovery-stat recovery-mp" :data-restored="!!effect&&effect.result.delta.mp>0"><span>灵力</span><strong>{{game.core.player.mp}} / {{body.maxMp}}</strong><progress :value="game.core.player.mp" :max="body.maxMp" aria-label="当前灵力"/></div>
  </div>
  <section class="recovery-object recovery-cabinet" aria-label="当前恢复对象">
   <div class="recovery-object-heading"><div class="recovery-vessel" :data-saved="!!effect" :style="{'--recovery-turn':(working?progress:0)*360+'deg'}" aria-hidden="true"><i class="recovery-breath"/><i class="recovery-platform"/><template v-if="kind==='use'"><div class="recovery-medicine"><ItemArtifact :item-id="itemId" :owned="stock>0"/></div><div class="recovery-jade-bowl"><i v-if="stock>0" class="recovery-pill"/></div></template><div v-else class="recovery-sitting"><AssetImage path="art/v2/characters/player-seated-cold.webp" asset-id="resting-self" fit="contain" eager><GameIcon kind="nav" id="cultivate"/></AssetImage></div></div><div><small>{{kind==='rest'?'听雨洞府 · 静坐一回':'随身药盏 · 实存 '+stock+' 丹'}}</small><h3>{{kind==='rest'?'洞府休养':item.name}}</h3></div></div>
   <details><summary style="min-height:44px">调息须知</summary><p class="recovery-description">{{kind==='rest'?'以一个游戏月换取气血灵力恢复圆满；不消耗丹药。':item.description}}</p></details>
   <strong v-if="one.allowed" class="recovery-unit" data-testid="recovery-per-cycle">{{one.allowed?'预计单次气血 +'+(one.delta?.hp??0)+' · 灵力 +'+(one.delta?.mp??0):one.failure?.message}}</strong>
   <div v-if="state!=='idle'||activity" class="recovery-cycle" role="status"><strong data-testid="recovery-local-status">{{status}}</strong><span v-if="(engaged&&runtime&&phase==='running')&&localControls" data-testid="recovery-cycle-clock">{{Math.ceil(runtime.remainingMs/1000)}} / {{runtime.totalMs/1000}} 秒</span><small v-else-if="!engaged&&activity?.status==='running'&&!store?.error&&!store?.activityPausing">已保存安排，接续范围见当前活动。</small></div>
   <p v-if="effect" class="recovery-arrival" data-testid="recovery-result" :data-sequence="effect.sequence" role="status">本次已保存 · {{effect.notice.delta}}</p><small v-else-if="saved" class="recovery-saved" data-testid="recovery-saved">{{saved}}</small>
   <button v-if="kind==='use'" class="recovery-source" @click="emit('source')">查看补给来源 ›</button>
  </section>
  <aside class="recovery-decision preparation-decision"><slot name="decision"/></aside>
 </div>
</template>
<style>
@layer game{.recovery-planner:has(>.recovery-ritual){gap:8px}.recovery-planner>.recovery-ritual{flex:1;min-height:0}
.recovery-ritual .recovery-body>.recovery-stat{display:grid;grid-template-columns:1fr auto;gap:5px 8px;padding:8px 0;background:none;border:0;border-bottom:1px solid color-mix(in srgb, var(--palette-line) 33.33333333%, transparent);border-radius:0;min-width:0}
.recovery-ritual .recovery-body span,.recovery-ritual .recovery-body strong{font-size:18px;line-height:1.5}.recovery-ritual .recovery-body progress{width:100%;height:8px;grid-column:1/-1;accent-color:var(--palette-danger)}.recovery-ritual .recovery-mp progress{accent-color:var(--palette-jade)}.recovery-ritual .recovery-stat[data-restored=true]{animation:recovery-saved 1.4s ease-out}
.recovery-ritual .recovery-object-heading{display:flex;align-items:center;gap:12px;min-width:0}.recovery-ritual .recovery-object-heading>div:last-child{min-width:0}.recovery-ritual h3{font-size:23px;line-height:1.4;margin:2px 0 0}.recovery-ritual p{font-size:18px;line-height:1.5;margin:0}.recovery-ritual small{font-size:14px;line-height:1.5}.recovery-ritual .recovery-unit{font-size:18px;line-height:1.5;color:var(--palette-jade)}
.recovery-ritual .recovery-vessel{position:relative;flex:none;width:160px;height:170px;isolation:isolate}.recovery-vessel i{display:block;position:absolute;pointer-events:none}.recovery-platform{left:5px;right:2px;bottom:14px;height:36px;border-radius:50%;border:1px solid color-mix(in srgb, var(--palette-line) 53.33333333%, transparent);background:radial-gradient(ellipse at 40% 25%,var(--palette-line),var(--palette-panel) 65%);box-shadow:0 9px 0 var(--palette-night),0 17px 12px color-mix(in srgb, var(--palette-shadow) 60%, transparent)}
.recovery-jade-bowl{position:absolute;right:3px;bottom:29px;width:84px;height:38px;border:1px solid var(--palette-muted);border-radius:20% 20% 48% 48%;background:linear-gradient(100deg,var(--palette-raised),var(--palette-line) 45%,var(--palette-raised));box-shadow:inset 0 -7px 6px var(--palette-panel),0 8px 6px color-mix(in srgb, var(--palette-shadow) 46.66666667%, transparent)}.recovery-jade-bowl:before{content:'';position:absolute;inset:-9px -1px auto;height:22px;border:2px solid var(--palette-muted);border-radius:50%;background:radial-gradient(ellipse,var(--palette-panel),var(--palette-raised) 65%,var(--palette-muted))}.recovery-jade-bowl .recovery-pill{width:15px;height:15px;top:-5px;left:34px;border:1px solid var(--palette-muted);border-radius:50%;background:radial-gradient(circle at 30% 25%,var(--palette-ink),var(--palette-gold) 60%,var(--palette-line));box-shadow:2px 4px 3px var(--palette-shadow)}
.recovery-sitting{position:absolute;inset:13px 24px 42px;display:grid;place-items:center}#app .recovery-sitting>.game-icon{width:100px;height:100px;margin:0;color:var(--palette-muted);filter:drop-shadow(0 6px 3px var(--palette-night))}.recovery-ritual .recovery-breath{inset:0 0 2px;border-radius:50%;background:conic-gradient(var(--palette-jade) var(--recovery-turn),transparent 0);mask:radial-gradient(transparent 66%,var(--palette-shadow) 68%);opacity:.3;z-index:-1}.recovery-ritual[data-working=true] .recovery-breath{opacity:1;animation:recovery-breathe 2.4s ease-in-out infinite}.recovery-ritual .recovery-vessel[data-saved=true]{animation:recovery-saved 1.4s ease-out}.recovery-ritual[data-status=failed] .recovery-vessel{width:160px;height:130px}.recovery-ritual[data-status=failed] .recovery-platform{bottom:6px}.recovery-ritual[data-status=failed] .recovery-jade-bowl{bottom:18px}
.recovery-ritual .recovery-cycle{display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px;padding-top:6px;border-top:1px solid color-mix(in srgb, var(--palette-line) 33.33333333%, transparent)}.recovery-ritual .recovery-cycle>strong{font-size:18px;line-height:1.5;margin:0}.recovery-ritual .recovery-cycle>span{font-size:18px;font-variant-numeric:tabular-nums;color:var(--palette-jade)}.recovery-ritual .recovery-cycle>small{width:100%;margin:0}.recovery-ritual .recovery-arrival{font-size:14px;line-height:1.5;color:var(--palette-jade);border-left:2px solid var(--palette-jade);padding-left:8px}.recovery-ritual .recovery-source{min-height:44px;font-size:18px;text-align:left;padding:7px 0;border:0;border-bottom:1px solid color-mix(in srgb, var(--palette-line) 33.33333333%, transparent);background:none;color:var(--palette-jade)}.recovery-ritual .recovery-saved{color:var(--palette-jade)}
.recovery-ritual .supply-plan-open{font-size:18px;min-height:66px;padding:8px 10px;gap:3px;line-height:1.5}.recovery-ritual .preparation-estimate{gap:4px;padding-top:6px}.recovery-ritual .preparation-reason{min-height:0}.recovery-ritual .recovery-decision>.primary{min-height:48px;font-size:18px;line-height:1.5}
@keyframes recovery-breathe{50%{transform:scale(.96);filter:drop-shadow(0 0 5px color-mix(in srgb, var(--palette-jade) 40%, transparent))}}@keyframes recovery-saved{0%{background-color:color-mix(in srgb, var(--palette-jade) 20%, transparent)}100%{background-color:transparent}}
.hub-reduced .recovery-ritual *{animation:none!important;transition:none!important}
@media(prefers-reduced-motion:reduce){.recovery-ritual *{animation:none!important;transition:none!important}}}
</style>
