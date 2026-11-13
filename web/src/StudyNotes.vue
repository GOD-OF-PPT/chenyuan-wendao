<script setup lang="ts">
import CultivationNotes from './CultivationNotes.vue';
defineProps<{ identity: string }>();
const selection =
  '[data-testid^="queue-entry-"],[data-testid^="jade-slot-"],[data-testid="learning-plan-open"]';
</script>
<template>
  <CultivationNotes
    :identity="identity"
    context="翻阅卷串，核对当前三槽。"
    label="研习手记"
    prefix="study"
    purpose="卷串 · 原安排 · 三槽"
    :selection="selection"
    rich
    ><slot
  /></CultivationNotes>
</template>
