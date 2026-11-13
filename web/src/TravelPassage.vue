<script setup lang="ts">
import { useLocalActivityControls } from './activity-controls';
import { computed, inject, useId } from 'vue';
import type { Game } from '../../src/full/types';
import * as C from '../../src/full/content';
import { previewAction } from '../../src/full/queries';
import { ADVENTURE_CYCLE_MS } from '../../src/full/adventure';
import type { useGame } from './store';
import { formatCosts } from './presentation';
import AssetImage from './AssetImage.vue';
import './travel-passage.css';
const props = defineProps<{ game: Game }>(),
  emit = defineEmits<{ inspect: [Event] }>(),
  scene = inject<ReturnType<typeof useGame>>('game-scene'),
  title = useId();
const selected = computed(() => {
  const a = scene?.activity;
  return props.game.status === 'active' &&
    a?.version === 6 &&
    a.plan.kind === 'travel' &&
    a.status !== 'stopped' &&
    a.runId === props.game.core.runId &&
    a.gameRevision === props.game.core.revision
    ? { activity: a, destination: a.plan.location }
    : null;
});
const timing = computed(() => {
  const a = selected.value?.activity,
    r = scene?.activityRuntime;
  return a &&
    scene?.activityLocal &&
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
        Math.min(0.94, 1 - timing.value.remainingMs / timing.value.totalMs),
      )
    : 0,
);
const marker = computed(() => {
  const p = progress.value,
    first = p <= 0.5,
    t = first ? p * 2 : p * 2 - 1,
    u = 1 - t,
    a = first ? [120, 116, 320, 168, 500, 112] : [500, 112, 680, 56, 880, 116];
  return {
    left: (u * u * a[0] + 2 * u * t * a[2] + t * t * a[4]) / 10 + '%',
    top: (u * u * a[1] + 2 * u * t * a[3] + t * t * a[5]) / 1.8 + '%',
  };
});
const cost = computed(() => {
  const q = selected.value
    ? previewAction(props.game, {
        type: 'TRAVEL',
        location: selected.value.destination,
      })
    : null;
  return q ? formatCosts(q.actualCosts ?? q.costs) : '';
});
const label = computed(
  () =>
    ({
      running: '行路中',
      saving: '正在落脚 · 尚未确认抵达',
      paused: '已停步 · 接续后重走本程',
      pausing: '正在停手',
      failed: '行程待核对 · 尚未确认抵达',
      ready: '等待接续行程',
      elsewhere: '此行已在另一处安排',
    })[state.value],
);
const localControls = useLocalActivityControls();
</script>
<template>
  <Teleport v-if="selected" defer to="[data-testid=hub-current]">
    <article
      class="travel-passage"
      data-testid="travel-passage"
      :data-state="state"
      :data-from="game.core.world.location"
      :data-to="selected.destination"
      :aria-labelledby="title"
      tabindex="-1"
      data-primary-region
    >
      <header
        ><small>单程 · 抵达即停</small
        ><h2 :id="title">前往{{ C.locations[selected.destination].name }}</h2
        ><p
          >出发地 · {{ C.locations[game.core.world.location].name }}</p
        ></header
      >
      <div class="travel-passage-status"
        ><strong>{{ label }}</strong
        ><span
          v-if="state === 'running' && localControls"
          role="timer"
          data-testid="travel-passage-clock"
          >{{ (timing!.remainingMs / 1000).toFixed(1) }} 秒</span
        ></div
      >
      <figure class="travel-passage-road" aria-label="本程路线示意">
        <svg
          class="travel-passage-line"
          viewBox="0 0 1000 180"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M120 116Q320 168 500 112T880 116" />
          <path
            class="travel-path-light"
            d="M120 116Q320 168 500 112T880 116"
          />
        </svg>
        <span class="travel-passage-place from"
          ><i aria-hidden="true">◇</i
          ><small>{{ C.locations[game.core.world.location].name }}</small></span
        ><span class="travel-passage-place to"
          ><i aria-hidden="true">◇</i
          ><small>{{ C.locations[selected.destination].name }}</small></span
        >
        <div
          class="travel-passage-walker"
          data-testid="travel-passage-walker"
          :style="marker"
          aria-hidden="true"
          ><AssetImage
            path="art/v2/actors/player-loadout-idle-v1.webp"
            asset-id="travel-player-cold"
            fit="contain"
            eager
            ><svg class="travel-passage-fallback" viewBox="0 0 80 120">
              <path
                class="traveller-shadow"
                d="M9 115Q36 108 70 115Q48 123 9 115Z"
              />
              <g>
                <circle cx="38" cy="19" r="10" />
                <path
                  d="M26 20Q18 2 37 3Q48 3 51 19M25 28L13 86L36 95L57 84L46 30Q36 37 25 28ZM28 35L42 48L62 43M40 48L40 89M26 89L20 113M43 91L56 113M64 29L61 114"
                />
                <path d="M27 37Q11 42 12 67L21 64M31 47L21 81M45 57L50 80" />
              </g></svg></AssetImage
        ></div>
        <figcaption>本程路线示意</figcaption>
      </figure>
      <footer
        ><div
          ><p>本程成本：{{ cost }}</p
          ><small
            >{{ ADVENTURE_CYCLE_MS.travel / 1000 }} 秒 ·
            只走本程，下一行动由你安排</small
          ></div
        ><button
          type="button"
          class="text-button"
          data-testid="travel-passage-review"
          @click="emit('inspect', $event)"
          >回看行程 ›</button
        ></footer
      >
    </article>
  </Teleport>
</template>
