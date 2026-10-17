<script setup lang="ts">
import GameIcon from './GameIcon.vue';
import {onMounted,onUnmounted,ref} from 'vue';
defineProps<{selected:string}>();
const emit=defineEmits<{select:[page:string];height:[number]}>();
const root=ref<HTMLElement>();let observer:ResizeObserver|undefined;function measure(){emit('height',root.value?.getBoundingClientRect().height??0);}
onMounted(()=>{measure();observer=new ResizeObserver(measure);if(root.value)observer.observe(root.value);});onUnmounted(()=>{observer?.disconnect();emit('height',0);});
const entries=[{label:'修行',icon:'cultivate',caption:'凝神养道'},{label:'历练',icon:'explore',caption:'行过山海'},{label:'行囊',icon:'inventory',caption:'一物一缘'},{label:'仙缘',icon:'karma',caption:'来路犹存'}];
</script>
<template><nav ref="root" id="primary-navigation" tabindex="-1" class="bottom-nav" aria-label="主要页面"><button v-for="(entry,index) in entries" :key="entry.label" :data-testid="`tab-${index}`" :class="{active:selected===entry.label}" :aria-current="selected===entry.label?'page':undefined" @click="emit('select',entry.label)"><GameIcon class="nav-icon" kind="nav" :id="entry.icon"/><span>{{entry.label}}<small>{{entry.caption}}</small></span></button></nav></template>
