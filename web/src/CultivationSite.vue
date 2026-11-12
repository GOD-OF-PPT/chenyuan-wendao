<script setup lang="ts">
import {useRuleContent} from './rule-content';

import {useLocalActivityControls} from './activity-controls';
import {computed} from 'vue';
import type {Game} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
import {useCultivationObject} from './cultivation-effects';
import './cultivation-objects.css';
const ruleContent=useRuleContent(()=>props.game);
const props=withDefaults(defineProps<{game:Game;method:'natural'|'assisted';active?:boolean;compact?:boolean}>(),{active:true,compact:false});
const emit=defineEmits<{method:['natural'|'assisted'];settings:[]}>();
const p=useCultivationObject(()=>props.method,()=>props.active);
const realm=computed(()=>ruleContent.value.realms[props.game.core.player.realm]);
const actual=computed(()=>{const a=p.store?.activity;return a?.version===1&&a.runId===props.game.core.runId&&a.status!=='stopped'?a.plan.method:null;});
const state=computed(()=>p.store?.error?'needs-attention':p.phase.value);
const name=(m:string)=>m==='assisted'?'灵石辅助':'自然吐纳';
const stageLabel=computed(()=>p.phase.value==='saving'?'凝神 · 保存中':p.working.value?'入定 · '+name(props.method):p.store?.error?p.store.unresolved?'停功 · 请先核对进度':'上次未完成 · 新安排需确认':actual.value?`当前${name(actual.value)}；此处预选${name(props.method)}`:'静息 · 选择潜修方式');
const localControls=useLocalActivityControls();
</script>
<template>
 <section class="art06-site" :class="{'art06-site-compact':compact}" data-testid="cultivation-site" data-copy30="cultivation" :data-method="method" :data-state="state" :data-working="p.working.value" :data-engaged="p.engaged.value" :style="{'--cultivation-progress':p.progress.value}">
  <div class="art06-sanctum">
   <div class="art06-spirit-stream" aria-hidden="true"><i/><i/><i/></div>
   <div class="art06-cushion" aria-hidden="true"/>
   <AssetImage class="art06-meditator" path="art/v2/characters/player-seated-cold.webp" asset-id="player-seated-cold" fit="contain" eager aria-hidden="true"><GameIcon kind="nav" id="cultivate"/></AssetImage>
   <div class="art06-breath" aria-hidden="true"/>
   <div class="art06-status"><small v-if="!$slots.activity">{{p.phase.value==='idle'&&!actual&&!p.store?.error?'静候入定':stageLabel}}</small><output v-if="(p.runtime.value)&&localControls" data-testid="cultivation-cycle-clock">{{p.phase.value==='saving'?'保存中':p.remaining.value+' 秒'}}<span> / 本轮 {{p.seconds.value}} 秒</span></output><small v-if="p.phase.value==='saving'">先核对本轮，保存后才计入修为。</small></div>
   <div v-if="$slots.note" class="art06-note"><slot name="note"/></div>

  </div>
  <div class="art06-practice">

   <div class="art06-progress" data-testid="cultivation-progress"><span>实际修为</span><strong>{{game.core.player.xp}} / {{realm.xpCap}}</strong><progress :value="game.core.player.xp" :max="realm.xpCap||1" aria-label="已保存修为"/><div v-if="p.effect.value" :key="p.effect.value.sequence" class="art06-harvest" data-testid="cultivation-result" :data-sequence="p.effect.value.sequence" role="status"><strong>修为 +{{p.effect.value.result.delta.xp}} 已存</strong><small>{{p.effect.value.result.costs.stones?'灵石 -'+p.effect.value.result.costs.stones:'未耗灵石'}} · {{p.effect.value.result.costs.months}} 游戏月</small></div></div>
   <nav v-if="!$slots.activity" class="art06-methods" aria-label="选择潜修方式，只改变待确认安排">
    <button type="button" data-testid="cultivation-method-natural" :aria-pressed="method==='natural'" @click="emit('method','natural')"><span class="art06-mat-token" data-testid="cultivation-mat"><GameIcon kind="nav" id="cultivate"/></span><span><strong>自然吐纳</strong><small>引山间灵气 · 不耗灵石</small></span></button>
    <button type="button" data-testid="cultivation-method-assisted" :aria-pressed="method==='assisted'" @click="emit('method','assisted')"><span class="art06-stone-token" data-testid="cultivation-stone-seat"><GameIcon kind="item" id="core"/></span><span><strong>灵石辅助</strong><small>现有 {{game.core.player.stones}} 灵石 · 炼气始可用</small></span></button>
   </nav>
   <slot name="activity"/><div v-if="!$slots.activity" class="art06-main-decision"><slot name="decision"/></div>
   <slot/>
  </div>
  <div v-if="$slots.parameters" class="art06-parameters"><slot name="parameters"/></div>
 </section>
</template>
