<script setup lang="ts">
defineProps<{selected:string}>();
const emit=defineEmits<{select:[page:string]}>();
const entries=[{label:'修行',mark:'◈',caption:'凝神养道'},{label:'历练',mark:'山',caption:'行过山海'},{label:'行囊',mark:'囊',caption:'一物一缘'},{label:'仙缘',mark:'缘',caption:'来路犹存'}];
</script>
<template><nav class="bottom-nav" aria-label="主要页面"><button v-for="(entry,index) in entries" :key="entry.label" :data-testid="`tab-${index}`" :class="{active:selected===entry.label}" :aria-current="selected===entry.label?'page':undefined" @click="emit('select',entry.label)"><span class="nav-icon" aria-hidden="true">{{entry.mark}}</span><span>{{entry.label}}<small>{{entry.caption}}</small></span></button></nav></template>
