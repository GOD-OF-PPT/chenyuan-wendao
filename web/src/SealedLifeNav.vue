<script setup lang="ts">
import {onMounted,onUnmounted,ref} from 'vue';
import GameIcon from './GameIcon.vue';
defineProps<{view:string;demo?:boolean;normalHref?:string}>();
const emit=defineEmits<{open:[string,MouseEvent];settings:[MouseEvent];height:[number]}>(),root=ref<HTMLElement>();let observer:ResizeObserver|undefined;
onMounted(()=>{observer=new ResizeObserver(()=>emit('height',root.value?.getBoundingClientRect().height??0));if(root.value)observer.observe(root.value);});onUnmounted(()=>{observer?.disconnect();emit('height',0);});
const entries=[{id:'home',label:'卷终',icon:'cultivate',kind:'nav'},{id:'life',label:'生平',icon:'export',kind:'action'},{id:'character',label:'人物',icon:'karma',kind:'nav'}] as const;
</script>
<template>
 <nav ref="root" id="primary-navigation" tabindex="-1" class="bottom-nav stage-nav sealed-nav" :class="{'with-demo':demo}" aria-label="封卷页面"><div v-if="demo" class="demo-nav-label" data-testid="demo-persistent-label"><strong>演示存档</strong><a :href="normalHref" data-testid="demo-normal">返回正常游戏</a></div><button v-for="entry in entries" :key="entry.id" :data-testid="'sealed-'+entry.id" :class="{active:view===entry.id}" :aria-current="view===entry.id?'page':undefined" @click="emit('open',entry.id,$event)"><GameIcon class="nav-icon" :kind="entry.kind" :id="entry.icon"/><span>{{entry.label}}</span></button><button data-testid="sealed-storage" @click="emit('settings',$event)"><GameIcon class="nav-icon" kind="action" id="save"/><span>存档</span></button><small class="prototype-label">数值未平衡</small></nav>
</template>
