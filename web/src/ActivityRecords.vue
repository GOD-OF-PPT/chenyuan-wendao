<script setup lang="ts">
import { computed, inject } from 'vue';
import type { useGame } from './store';
import { useRuleContent } from './rule-content';
import { repeats } from '../../src/full/repetition';
import type { Reading } from './story-pages';
import ReviewPages from './ReviewPages.vue';
import TrainingActivity from './TrainingActivity.vue';
import AdventureHistory from './AdventureHistory.vue';
import ActivityHistory from './ActivityHistory.vue';
import ActionFeedback from './ActionFeedback.vue';
const props = defineProps<{
  view: string;
  singleScreen: boolean;
  immersive: boolean;
}>();
const emit = defineEmits<{ settings: []; details: [] }>();
const activityPlanVisible = defineModel<boolean>('originalPlan', {
    required: true,
  }),
  receiptAll = defineModel<boolean>('allReceipts', { required: true });
const store = inject<ReturnType<typeof useGame>>('game-scene')!,
  ruleContent = useRuleContent(() => store.game),
  hubView = computed(() => props.view);
const viewActivityPlan = () => emit('settings'),
  viewReceipt = () => emit('details');
const originalAdventureReadings = computed<Reading[]>(() => {
  const a = store.activity;
  if (a?.version !== 6 || a.plan.kind === 'travel') return [];
  const p = a.plan,
    label = (move: string) =>
      (
        ({
          attack: '普通攻击',
          guard: '凝神护体',
          technique: '起手术法',
          release: '终结术法',
          heal: '服回春丹',
          restore: '服回灵丹',
          flee: '撤回洞府',
        }) as Record<string, string>
      )[move];
  const rows: Reading[] = [
    {
      key: 'identity',
      title: '查看本次打算',
      text:
        ruleContent.value.enemies[p.enemy].name +
        (p.kind === 'battle' && p.trialStage !== null
          ? ' · 天劫第' + p.trialStage + '关'
          : '') +
        (repeats(p)
          ? '；持续当前对手，达标、触线或手动停下。'
          : '；最多 ' + p.maxCycles + ' 次动作。') +
        '只看本次打算，不改变战局。',
    },
  ];
  if (p.kind === 'battle' && p.mode === 'single') {
    rows.push({
      key: 'single',
      title: '原手动单步',
      text: label(p.move) + '；仅1回合 / 3秒。',
    });
    return rows;
  }
  const strategy = p.strategy;
  rows.push(
    {
      key: 'scope',
      title: '本次限额',
      text:
        '累计灵力上限 ' +
        p.mpBudget +
        '。' +
        (p.kind === 'encounter'
          ? (repeats(p)
              ? '持续历练；游戏月预算 '
              : '最多 ' + p.maxEncounters + ' 场；游戏月预算 ') +
            p.monthBudget +
            '；余寿保留 ' +
            p.remainingMonthsReserve +
            ' 月；' +
            (p.target
              ? ruleContent.value.items[p.target.item].name +
                '目标库存 ' +
                p.target.quantity
              : '无掉落库存目标')
          : '本关自动战策，只限原敌人与关卡'),
    },
    {
      key: 'priority',
      title: '招式顺序与重击',
      text:
        strategy.priority.map(label).join(' → ') +
        '。应对重击：' +
        (strategy.respondHeavy ? '是' : '否') +
        '；释放层数门槛 ' +
        strategy.releaseAt +
        ' 层。',
    },
    {
      key: 'medicine',
      title: '用药上限',
      text:
        '气血低于 ' +
        strategy.healBelowPercent +
        '% 用回春，整段最多 ' +
        strategy.healingBudget +
        ' 丹，库存保留 ' +
        strategy.healingReserve +
        '；灵力低于 ' +
        strategy.restoreBelowPercent +
        '% 用回灵，整段最多 ' +
        strategy.spiritBudget +
        ' 丹，库存保留 ' +
        strategy.spiritReserve +
        '。用药占正式回合，不自动补货。',
    },
    {
      key: 'risk',
      title: '危险线与停止',
      text:
        '气血危险线 ' +
        strategy.retreatBelowPercent +
        '%；' +
        (strategy.riskMode === 'pause'
          ? '触线暂停，不离场。'
          : '触线撤回洞府，气血-8且最低1，' +
            (p.kind === 'encounter'
              ? '结束本段历练。'
              : p.trialStage === null
                ? '结束本次交锋。'
                : '结束本轮天劫。')) +
        '此处不是当前战策的新确认。',
    },
  );
  return rows;
});
</script>
<template>
  <section
    v-if="immersive && hubView === 'activity'"
    class="paper activity-detail-surface play-catalogue"
    data-testid="activity-details"
    ><nav
      v-if="originalAdventureReadings.length"
      class="catalogue-tabs"
      aria-label="本段活动分类"
      ><button
        :aria-pressed="!activityPlanVisible"
        @click="activityPlanVisible = false"
        >成果与停止</button
      ><button
        data-testid="activity-original-plan"
        :aria-pressed="activityPlanVisible"
        @click="activityPlanVisible = true"
        >原战策 · 只读</button
      ></nav
    ><div
      v-if="activityPlanVisible && originalAdventureReadings.length"
      data-testid="activity-plan-review"
      ><ReviewPages
        :rows="originalAdventureReadings"
        :identity="store.activity!.runId + store.activity!.id" /></div
    ><TrainingActivity
      v-else
      :store="store"
      @settings="viewActivityPlan"
      @details="viewReceipt"
  /></section>
  <AdventureHistory
    v-if="
      singleScreen && hubView === 'receipt' && store.activity?.version === 6
    "
    :store="store"
  />
  <nav
    v-if="
      singleScreen &&
      hubView === 'receipt' &&
      store.activity &&
      store.activity.version <= 5 &&
      store.activity.completedCycles > 0
    "
    class="catalogue-tabs"
    aria-label="收获记录范围"
    ><button
      v-if="store.lastResult"
      :aria-pressed="!receiptAll"
      @click="receiptAll = false"
      >本次结算</button
    ><button
      data-testid="activity-history-open"
      :aria-pressed="receiptAll"
      @click="receiptAll = true"
      >本段全部周期</button
    ></nav
  >
  <ActivityHistory
    v-if="
      singleScreen &&
      hubView === 'receipt' &&
      store.activity &&
      store.activity.version <= 5 &&
      receiptAll
    "
    :store="store"
  />
  <ActionFeedback
    v-if="
      singleScreen &&
      hubView === 'receipt' &&
      store.activity?.version !== 6 &&
      !receiptAll &&
      store.lastResult
    "
    :result="store.lastResult"
    :replayed="store.lastReplayed"
  />
</template>
