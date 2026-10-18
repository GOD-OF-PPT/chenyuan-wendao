<script setup lang="ts">
import GameIcon from './GameIcon.vue';
import {onMounted,onUnmounted,ref} from 'vue';
defineProps<{selected:string;demo?:boolean;normalHref?:string;sealed?:boolean}>();
const emit=defineEmits<{select:[page:string];height:[number]}>();
const root=ref<HTMLElement>();let observer:ResizeObserver|undefined,lastHeight=0;
onMounted(()=>{observer=new ResizeObserver(entries=>{const entry=entries.find(value=>value.target===root.value),height=entry?.borderBoxSize[0]?.blockSize;if(height!==undefined&&height!==lastHeight){lastHeight=height;emit('height',height);}});if(root.value)observer.observe(root.value,{box:'border-box'});});onUnmounted(()=>{observer?.disconnect();emit('height',0);});
const entries=[{label:'修行',icon:'cultivate',caption:'吐纳 · 突破'},{label:'历练',icon:'explore',caption:'探索 · 取材'},{label:'行囊',icon:'inventory',caption:'物资 · 炼丹'},{label:'仙缘',icon:'karma',caption:'人物 · 生平'}];
</script>
<template><nav ref="root" id="primary-navigation" tabindex="-1" class="bottom-nav" :class="{'with-demo':demo}" aria-label="主要页面"><div v-if="demo" class="demo-nav-label" data-testid="demo-persistent-label"><strong>演示存档</strong><a :href="normalHref" data-testid="demo-normal">返回正常游戏</a></div><button v-for="(entry,index) in sealed?[]:entries" :key="entry.label" :data-testid="`tab-${index}`" :class="{active:selected===entry.label}" :aria-current="selected===entry.label?'page':undefined" @click="emit('select',entry.label)"><GameIcon class="nav-icon" kind="nav" :id="entry.icon"/><span>{{entry.label}}<small>{{entry.caption}}</small></span></button><small class="prototype-label">数值未平衡</small></nav></template>
