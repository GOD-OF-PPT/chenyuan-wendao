<script setup lang="ts">
import GameIcon from './GameIcon.vue';
import {onMounted,onUnmounted,ref} from 'vue';
defineProps<{selected:string;demo?:boolean;normalHref?:string;sealed?:boolean}>();
const emit=defineEmits<{select:[page:string];height:[number]}>();
const root=ref<HTMLElement>();let observer:ResizeObserver|undefined,lastHeight=0;
onMounted(()=>{observer=new ResizeObserver(entries=>{const entry=entries.find(value=>value.target===root.value),height=entry?.borderBoxSize[0]?.blockSize;if(height!==undefined&&height!==lastHeight){lastHeight=height;emit('height',height);}});if(root.value)observer.observe(root.value,{box:'border-box'});});onUnmounted(()=>{observer?.disconnect();emit('height',0);});
const entries=[{label:'修行',icon:'cultivate',caption:'凝神养道'},{label:'历练',icon:'explore',caption:'行过山海'},{label:'行囊',icon:'inventory',caption:'一物一缘'},{label:'仙缘',icon:'karma',caption:'来路犹存'}];
</script>
<template><nav ref="root" id="primary-navigation" tabindex="-1" class="bottom-nav" :class="{'with-demo':demo}" aria-label="主要页面"><div v-if="demo" class="demo-nav-label" data-testid="demo-persistent-label"><strong>演示存档</strong><a :href="normalHref" data-testid="demo-normal">返回正常游戏</a></div><button v-for="(entry,index) in sealed?[]:entries" :key="entry.label" :data-testid="`tab-${index}`" :class="{active:selected===entry.label}" :aria-current="selected===entry.label?'page':undefined" @click="emit('select',entry.label)"><GameIcon class="nav-icon" kind="nav" :id="entry.icon"/><span>{{entry.label}}<small>{{entry.caption}}</small></span></button></nav></template>
