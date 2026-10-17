<script setup lang="ts">
import type { getTrialJourney, getTrialRecovery } from '../../src/full/queries.ts';
import type { CheckpointSummary } from './store';
defineProps<{journey:ReturnType<typeof getTrialJourney>;recovery:ReturnType<typeof getTrialRecovery>;checkpoint:CheckpointSummary|null;enabled:boolean}>();
const emit=defineEmits<{restore:[];export:[];prepare:[]}>();
</script>
<template>
  <section class="paper trial-progress" data-testid="trial-progress">
    <template v-if="journey">
      <div class="section-label">渡劫行程 <span>随行动保存</span></div><h2>守住来路，逐关向前。</h2>
      <ol class="trial-steps" aria-label="渡劫进度"><li v-for="step in journey.steps" :key="step.id" :data-testid="`trial-step-${step.id}`" :aria-current="step.status==='current'?'step':undefined"><strong>{{step.name}}</strong><span>{{step.status==='complete'?'已完成':step.status==='current'?'当前':'尚未开始'}}</span></li></ol>
      <p data-testid="trial-stage-summary">{{journey.title}} · 已过 {{journey.completed}} / 3 关</p>
      <p v-if="journey.effect" data-testid="trial-selected-effect">{{journey.effect}} 这一选择贯穿本轮，不能在关间改选。</p>
      <p class="small">三关沿用当前配装，气血、灵力和已用丹药跨关保留；通关不会补满资源，也不领取普通战利品。</p>
      <details><summary>暂离、导出与准备恢复</summary><p>离开前请确认顶部显示“已保存”。重开继续已保存的同一回合、敌方意图和剑意/符印，不重新抽取。阅读和暂离不推进游戏年月。</p><p>导出的当前进度可继续游玩，但不包含数据库独立保存的准备检查点；导入不会补造这个检查点。</p><button data-testid="trial-export-current" @click="emit('export')" :disabled="!enabled">导出当前进度</button></details>
      <p v-if="checkpoint?.kind==='trial'" class="small" data-testid="trial-checkpoint-committed">已验证本局可用的渡劫前完整准备检查点；恢复会回退入场前的物品、配装、年月与人物记录。</p><p v-else class="small" data-testid="trial-checkpoint-unavailable">本局未找到可用的渡劫准备检查点；可先导出当前进度，不能从未记录的状态补造快照。</p>
    </template>
    <template v-else-if="recovery">
      <div class="section-label">渡劫续行</div><h2 data-testid="trial-failure-title">本轮渡劫已结束</h2>
      <p>止于第 {{recovery.stage}} 关 · {{recovery.stageName}}</p><p data-testid="trial-failure-reason">{{recovery.reason}}</p>
      <p v-if="recovery.consumptionKnown" data-testid="trial-consumed">本轮实际耗物：{{recovery.consumed.map(item=>item.name+' ×'+item.quantity).join(' · ') || '无'}}</p><p v-else data-testid="trial-consumed-unknown">缺少可核对的入场快照，不能推断本轮累计耗物；当前库存仍按实际存档保留。</p>
      <p data-testid="trial-remaining">现有：{{recovery.inventory.map(item=>item.name+' ×'+item.quantity).join(' · ')}}</p>
      <p>本轮不结算战利品。可保留现在的状态，回洞府疗养、重新备引与补给；也可恢复已有完整准备。已耗物不会单独返还，恢复会一同回退本轮的其他进展。</p>
      <button data-testid="trial-prepare-again" @click="emit('prepare')" :disabled="!enabled">保留现状，查看重新筹备</button>
      <p v-if="checkpoint?.kind!=='trial'" class="small" data-testid="trial-recovery-unavailable">本局没有已验证的渡劫准备检查点；仍可按当前境界的确定来源继续筹备。</p>
    </template>
    <button v-if="checkpoint?.kind==='trial'" class="text-button" data-testid="trial-restore-open" @click="emit('restore')" :disabled="!enabled">核对并恢复渡劫前完整准备</button>
  </section>
</template>
<style scoped>
.trial-progress{padding:24px;margin-top:16px}.trial-progress h2{font-size:calc(1.2777778rem * var(--font-scale,1))}.trial-progress p{line-height:1.85;margin:12px 0;overflow-wrap:anywhere}.trial-steps{list-style:none;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0;margin:20px 0}.trial-steps li{padding:12px 8px;border:1px solid #cfc3aa}.trial-steps strong,.trial-steps span{display:block;font-size:calc(0.72222222rem * var(--font-scale,1));overflow-wrap:anywhere}.trial-steps span{font-size:calc(0.61111111rem * var(--font-scale,1));margin-top:8px}.trial-steps [aria-current]{background:#e0e9df;border-color:#426c61}.trial-progress details{margin:16px 0}.trial-progress summary{cursor:pointer;line-height:1.8}.trial-progress button{max-width:100%;white-space:normal}@media(max-width:720px){.trial-progress{padding:18px}.trial-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
