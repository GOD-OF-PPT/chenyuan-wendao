<script setup lang="ts">
import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import {MILESTONE_CYCLE_MS} from '../../src/full/milestones';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
import './opening-offering.css';
const props=withDefaults(defineProps<{game:Game;phase:string;engaged:boolean;remaining:number;seconds:number;viewTitle?:string;status?:'idle'|'running'|'paused'|'stopped';failed:boolean;reading?:boolean}>(),{status:'idle',viewTitle:'',reading:false});
const emit=defineEmits<{inspect:[Event]}>();
const total=computed(()=>props.engaged?props.seconds:MILESTONE_CYCLE_MS.CHOOSE/1000);
const arranged=computed(()=>props.status==='running'||props.status==='paused');
const state=computed(()=>props.failed?'存档待核对 · 请沿原操作核对':props.status==='paused'?'此念已安排 · 已暂停':props.phase==='saving'?'正在记下此念 · 尚未落定':props.engaged?'所选回应进行中':arranged.value?'此念已保存 · 继续见上方':'药匣在侧 · 先看三种选择');
</script>
<template>
 <div class="milestone-object art33-offering" data-testid="opening-offering" :data-phase="phase" :data-failed="failed" :data-arranged="arranged">
  <figure class="art33-person"><AssetImage path="art/v2/opening/shen-offering-v1.webp" asset-id="portrait-shen" class="art33-portrait" fit="contain" position="0% 100%" eager aria-hidden="true"><span class="art33-person-fallback">沈</span></AssetImage><figcaption><strong>沈清禾</strong><small v-if="!reading">破庙求药 · 静候你的抉择</small></figcaption></figure>
  <button type="button" class="gate-medicine-case art33-case" data-testid="opening-case-inspect" :aria-label="reading?'返回破庙主舞台':arranged?'查看此念已保存原安排':'翻看雨夜药匣与三种选择'" @click="emit('inspect',$event)">
   <AssetImage path="art/v2/opening/medicine-case-v1.webp" asset-id="opening-medicine-case" class="art33-case-paint" fit="contain" eager aria-hidden="true"><span class="art33-case-fallback"/></AssetImage>
   <AssetImage v-if="game.core.inventory.healing_pill>0" path="art/v2/items/healing_pill-v1.webp" asset-id="opening-owned-medicine" class="art33-medicine" fit="contain" aria-hidden="true"><GameIcon kind="item" id="healing_pill"/></AssetImage>
   <span class="art33-case-label"><strong>{{reading?'回到破庙主舞台':arranged?'重读此念安排':'翻看雨夜药匣'}}</strong><small data-testid="milestone-material">回春丹 · 实有 {{game.core.inventory.healing_pill}}</small></span>
  </button>
  <div class="art33-state" role="status"><strong>{{state}}</strong><span v-if="engaged&&phase==='running'" data-testid="milestone-cycle-clock">{{remaining}} / {{seconds}} 秒</span><small v-else>{{arranged?viewTitle:'选择只核对 · 确认后回应'}} · 每次 {{total}} 秒 · 仅一次</small></div>
 </div>
</template>
