<script setup lang="ts">
import type {AwaySummary} from './away-summary.ts';
import {formatCosts,formatDelta} from './presentation';
import {playerMessage} from './player-copy';
defineProps<{summary:AwaySummary}>();
</script>
<template>
 <section class="away-summary" data-testid="away-summary" aria-label="最近一次累计成果">
  <strong>最近累计 {{summary.cycles}} 轮 · 已保存</strong>
  <p data-testid="away-summary-change">净变化：{{formatDelta({...summary.delta,months:0})}}</p>
  <small data-testid="away-summary-costs">实际消耗：{{formatCosts(summary.costs)}}</small>
  <small v-if="summary.more">已保存以上成果，剩余周期仍在核对。</small>
  <small v-else-if="summary.stopReason">{{playerMessage(summary.stopReason.message)}}</small>
  <small v-if="summary.discardedMs">超过 8 小时的离开时段未计入，仍按原预算与停手条件执行。</small>
 </section>
</template>
<style scoped>
@layer game{
.away-summary{padding-block:10px;border-top:1px solid var(--line);text-align:left}
.away-summary strong{font-size:18px;color:var(--game-jade,var(--teal))}
.away-summary p{margin:6px 0;font-size:18px;line-height:1.5}
.away-summary small{display:block;font-size:14px;line-height:1.5}}
</style>
