<script setup lang="ts">
import { provide } from 'vue';
import { narrativeStageKey, useNarrativeStage } from './narrative-effects';
const props = defineProps<{ active: boolean }>();
// This host outlives a response page and the status-keyed final life scroll.
provide(
  narrativeStageKey,
  useNarrativeStage(() => props.active),
);
</script>
<template><slot /></template>
