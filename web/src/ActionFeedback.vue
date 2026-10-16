<script setup lang="ts">
import type { ActionResult } from '../../src/full/contracts.ts';
import { formatCosts, formatDelta } from './presentation';
defineProps<{ result: ActionResult; replayed: boolean }>();
</script>
<template>
  <div class="action-receipt" data-testid="action-receipt">
    <strong>{{replayed?'原操作回执 · 未重复结算':'本次结算'}}</strong>
    <small data-testid="executed-steps">实际执行 {{result.executedSteps}} / {{result.requestedSteps}} 次</small>
    <small data-testid="actual-cost">实际扣费：{{formatCosts(result.costs)}}</small>
    <small data-testid="actual-delta">净变化：{{formatDelta(result.delta)}}</small>
    <small data-testid="actual-stop">{{result.stopReason?'停止原因：'+result.stopReason.message:'本批已完成'}}</small>
  </div>
</template>
