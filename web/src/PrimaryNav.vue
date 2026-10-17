<script setup lang="ts">
import GameIcon from './GameIcon.vue';
defineProps<{selected:string}>();
const emit=defineEmits<{select:[page:string]}>();
const entries=[{label:'修行',icon:'cultivate',caption:'凝神养道'},{label:'历练',icon:'explore',caption:'行过山海'},{label:'行囊',icon:'inventory',caption:'一物一缘'},{label:'仙缘',icon:'karma',caption:'来路犹存'}];
</script>
<template><nav class="bottom-nav" aria-label="主要页面"><button v-for="(entry,index) in entries" :key="entry.label" :data-testid="`tab-${index}`" :class="{active:selected===entry.label}" :aria-current="selected===entry.label?'page':undefined" @click="emit('select',entry.label)"><GameIcon class="nav-icon" kind="nav" :id="entry.icon"/><span>{{entry.label}}<small>{{entry.caption}}</small></span></button></nav></template>
