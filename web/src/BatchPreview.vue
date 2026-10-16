<script setup lang="ts">
import type { ActionPreview } from '../../src/full/queries.ts';
import { formatCosts, formatDelta } from './presentation';
defineProps<{ label: string; preview: ActionPreview | null }>();
</script>
<template>
  <div class="batch-preview" :data-testid="`preview-${label}`">
    <strong>{{label}}预览</strong>
    <template v-if="preview">
      <small>计划最多 {{preview.requestedSteps}} 次 · 预算上限：{{formatCosts(preview.maximumCosts)}}</small>
      <small v-if="preview.allowed">当前可执行 {{preview.executedSteps}} 次 · 预计扣费：{{formatCosts(preview.actualCosts)}}</small>
      <small v-if="preview.delta">预计净变化：{{formatDelta(preview.delta)}}</small>
      <small v-if="preview.stopReason">预计停止：{{preview.stopReason.message}}</small>
      <small v-if="preview.failure">{{preview.failure.message}}；不会提交或扣费。</small>
    </template>
    <small v-else>先从目标来源选取所需物资，再使用达到目标模式。</small>
  </div>
</template>
