<script setup lang="ts">
import type {Guide} from './guidance';
defineProps<{guide:Guide}>();
defineEmits<{skip:[];help:[]}>();
</script>
<template>
  <aside class="gameplay-guidance" aria-label="行道提示" data-testid="gameplay-guide" :data-guide="guide.id">
    <h3>{{guide.title}}</h3><p>{{guide.hint}}</p>
    <div class="guide-actions"><button type="button" class="text-button" data-testid="guide-skip" aria-label="跳过此类提示" @click="$emit('skip')">跳过提示</button><button type="button" class="text-button" data-testid="guide-help" aria-label="玩法帮助与重看" @click="$emit('help')">玩法帮助</button></div>
  </aside>
</template>
<style scoped>
.gameplay-guidance{border-inline-start:3px solid #8b692f;background:#eee5cf;padding:12px 16px;margin-bottom:20px;overflow-wrap:anywhere}
.gameplay-guidance h3{margin:0}.gameplay-guidance p{margin:8px 0}.guide-actions{display:flex;gap:12px;flex-wrap:wrap}
</style>
