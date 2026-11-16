<script setup lang="ts">
import { useLocalActivityControls } from './activity-controls';
import { computed, inject, useId } from 'vue';
import type { Game } from '../../src/full/types';
import type { Activity } from '../../src/full/activity';
import type { useGame } from './store';
import { milestonePresentation } from './milestone-view';
import './opening-response.css';
const props = defineProps<{ game: Game; activity: Activity | null }>();
const emit = defineEmits<{ inspect: [Event] }>(),
  scene = inject<ReturnType<typeof useGame>>('game-scene'),
  heading = useId();
const selected = computed(() => {
  const a = props.activity;
  return a?.version === 7 &&
    a.plan.action.type === 'CHOOSE' &&
    a.status !== 'stopped' &&
    a.runId === props.game.core.runId &&
    a.gameRevision === props.game.core.revision
    ? { activity: a, action: a.plan.action }
    : null;
});
const view = computed(() =>
  selected.value
    ? milestonePresentation(
        selected.value.activity.originGame,
        selected.value.action,
      )
    : null,
);
const gestures = {
  help: { seal: '赠', intent: '将一枚回春丹赠与沈清禾', verb: '递丹' },
  trade: { seal: '换', intent: '以回春丹换取剑简', verb: '换简' },
  leave: { seal: '留', intent: '将丹药留在身边，独自离庙', verb: '收丹' },
};
const gesture = computed(() =>
  selected.value ? gestures[selected.value.action.choice] : null,
);
const timing = computed(() => {
  const a = selected.value?.activity,
    r = scene?.activityRuntime;
  return a &&
    scene?.activityLocal &&
    scene.activity?.id === a.id &&
    scene.activity.generation === a.generation &&
    r?.id === a.id &&
    r.generation === a.generation
    ? r
    : null;
});
const state = computed(() =>
  scene?.error || scene?.syncIssue
    ? 'failed'
    : selected.value?.activity.status === 'paused'
      ? 'paused'
      : scene?.activityPausing
        ? 'pausing'
        : timing.value?.phase === 'saving'
          ? 'saving'
          : timing.value?.phase === 'running'
            ? 'running'
            : scene?.activityOwned
              ? 'ready'
              : 'elsewhere',
);
const progress = computed(() =>
  timing.value
    ? Math.max(
        0,
        Math.min(1, 1 - timing.value.remainingMs / timing.value.totalMs),
      )
    : 0,
);
const label = computed(() =>
  state.value === 'running'
    ? gesture.value?.verb + '中'
    : {
        saving: '正在记下此念',
        failed: '此念尚未落定',
        paused: '已停下此念',
        pausing: '正在停手',
        ready: '等待接续',
        elsewhere: '此念已在另一处安排',
      }[state.value],
);
const hint = computed(() =>
  state.value === 'saving'
    ? '保存后，此念才落定'
    : state.value === 'failed'
      ? '请按上方提示重试原操作'
      : state.value === 'paused'
        ? '继续后，按原安排重新计时'
        : state.value === 'elsewhere' || state.value === 'ready'
          ? '查看不执行；接续在上方'
          : selected.value?.action.choice === 'leave'
            ? '丹药仍保留，此念仅回应一次'
            : '丹药仍在匣中，保存后才交出',
);
const localControls = useLocalActivityControls();
</script>
<template>
  <article
    v-if="selected && view && gesture"
    class="opening-response"
    data-testid="opening-response"
    :data-choice="selected.action.choice"
    :data-state="state"
    :data-progress="progress.toFixed(3)"
    :aria-labelledby="heading"
    :style="{ '--response-progress': progress * 360 + 'deg' }"
  >
    <header
      ><p>雨夜初遇 · 已选此念</p><h2 :id="heading">{{ view.title }}</h2></header
    >
    <div class="opening-response-moment"
      ><span class="opening-response-seal" aria-hidden="true"
        ><i>{{ gesture.seal }}</i></span
      ><p>{{ gesture.intent }}</p></div
    >
    <div class="opening-response-time"
      ><strong>{{ label }}</strong
      ><span
        v-if="state === 'running' && localControls"
        role="timer"
        data-testid="milestone-cycle-clock"
        >{{ (timing!.remainingMs / 1000).toFixed(1) }} 秒</span
      ></div
    >
    <p class="opening-response-hint">{{ hint }}</p>
    <button
      type="button"
      class="text-button"
      data-testid="opening-response-review"
      @click="emit('inspect', $event)"
      >回看此念<span aria-hidden="true"> ›</span></button
    >
  </article>
</template>
