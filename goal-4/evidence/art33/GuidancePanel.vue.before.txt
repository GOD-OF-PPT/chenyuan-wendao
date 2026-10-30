<script setup lang="ts">
import {ref,watch} from 'vue';
import type {Guide} from './guidance';
const props=defineProps<{guide:Guide}>();
const expanded=ref(false);watch(()=>props.guide.id,()=>expanded.value=false);
defineEmits<{skip:[];help:[]}>();
</script>
<template>
  <aside class="gameplay-guidance" aria-label="行道提示" data-testid="gameplay-guide" :data-guide="guide.id">
    <h3><span class="guide-mark" aria-hidden="true">◇</span>{{guide.title}}</h3><p>{{guide.hint}}</p><p v-if="expanded" class="guide-detail" data-testid="guide-detail">{{guide.body}}</p>
    <div class="guide-actions"><button type="button" class="text-button" data-testid="guide-expand" :aria-expanded="expanded" @click="expanded=!expanded">{{expanded?'收起说明':'细看指引'}}</button><button type="button" class="text-button" data-testid="guide-skip" aria-label="跳过此类提示" @click="$emit('skip')">跳过提示</button><button type="button" class="text-button" data-testid="guide-help" aria-label="玩法帮助与重看" @click="$emit('help')">玩法帮助</button></div>
  </aside>
</template>
<style scoped>
.gameplay-guidance{border-inline-start:3px solid #8b692f;background:#eee5cf;padding:12px 16px;margin-bottom:20px;overflow-wrap:anywhere}
.gameplay-guidance h3{margin:0}.gameplay-guidance p{margin:8px 0}.guide-actions{display:flex;gap:12px;flex-wrap:wrap}
</style>
