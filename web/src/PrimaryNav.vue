<script setup lang="ts">
import GameIcon from './GameIcon.vue';
import type {Game} from '../../src/full/types';
import {navigationGate} from './navigation-gates';
import {onMounted,onUnmounted,ref,computed} from 'vue';
const props=defineProps<{game:Game;selected:string;demo?:boolean;normalHref?:string;sealed?:boolean;expanded?:boolean;view?:string}>();
const emit=defineEmits<{select:[page:string];height:[number];open:[view:string,event:MouseEvent]}>();
const root=ref<HTMLElement>();let observer:ResizeObserver|undefined,lastHeight=0;
onMounted(()=>{observer=new ResizeObserver(entries=>{const entry=entries.find(value=>value.target===root.value),height=entry?.borderBoxSize[0]?.blockSize;if(height!==undefined&&height!==lastHeight){lastHeight=height;emit('height',height);}});if(root.value)observer.observe(root.value,{box:'border-box'});});onUnmounted(()=>{observer?.disconnect();emit('height',0);});
const legacyEntries=[{label:'修行',icon:'cultivate',caption:'吐纳 · 突破'},{label:'历练',icon:'explore',caption:'探索 · 取材'},{label:'行囊',icon:'inventory',caption:'物资 · 炼丹'},{label:'仙缘',icon:'karma',caption:'人物 · 生平'}];
const expandedEntries=[
 {label:'修行',icon:'cultivate',kind:'nav',view:'home',tab:'修行',testid:'tab-0'},
 {label:'历练',icon:'explore',kind:'nav',view:'explore',tab:'历练',testid:'tab-1'},
 {label:'丹炉',icon:'healing_pill',kind:'item',view:'forge',tab:null,testid:'hub-forge'},
 {label:'功法',icon:'sword_mind',kind:'skill',view:'skills',tab:null,testid:'hub-skills'},
 {label:'法宝',icon:'cloud_mirror',kind:'relic',view:'relics',tab:null,testid:'hub-relics'},
 {label:'行囊',icon:'inventory',kind:'nav',view:'inventory',tab:'行囊',testid:'tab-2'},
 {label:'仙缘',icon:'karma',kind:'nav',view:'fate',tab:'仙缘',testid:'tab-3'},
 {label:'生平',icon:'export',kind:'action',view:'life',tab:null,testid:'hub-life'},
] as const;
const entries=computed(()=>props.expanded?expandedEntries:legacyEntries.map((e,i)=>({...e,kind:'nav' as const,view:'',tab:e.label,testid:'tab-'+i})));
const current=computed(()=>props.view&&['home','explore','forge','skills','relics','inventory','fate','life'].includes(props.view)?props.view:({'修行':'home','历练':'explore','行囊':'inventory','仙缘':'fate'} as Record<string,string>)[props.selected]);
</script>
<template><nav ref="root" id="primary-navigation" tabindex="-1" class="bottom-nav" :class="{'with-demo':demo,'stage-nav':expanded}" aria-label="主要页面"><div v-if="demo" class="demo-nav-label" data-testid="demo-persistent-label"><strong>演示存档</strong><a :href="normalHref" data-testid="demo-normal">返回正常游戏</a></div><button v-for="(entry,index) in sealed?[]:entries" :key="entry.label" :data-testid="entry.testid" :disabled="navigationGate(game,entry.view).locked" :title="navigationGate(game,entry.view).reason||undefined" :class="{active:expanded?current===entry.view:selected===entry.label}" :aria-current="(expanded?current===entry.view:selected===entry.label)?'page':undefined" @click="entry.tab?emit('select',entry.tab):emit('open',entry.view,$event)"><GameIcon class="nav-icon" :kind="entry.kind" :id="entry.icon"/><span class="nav-name">{{entry.label}}<small v-if="navigationGate(game,entry.view).locked" class="nav-gate">{{navigationGate(game,entry.view).reason}}</small><small v-else-if="'caption' in entry">{{entry.caption}}</small></span></button><small class="prototype-label">数值未平衡</small></nav></template>

<style scoped>
.bottom-nav.stage-nav .nav-name{display:flex;align-items:baseline;justify-content:center;gap:4px}
.bottom-nav.stage-nav .nav-gate{font-size:14px;line-height:1.4;color:var(--game-muted,var(--teal))}
.bottom-nav button:disabled{opacity:1;color:var(--game-muted,var(--teal));cursor:default}
</style>
