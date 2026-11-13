<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from './GameIcon.vue';
const props = defineProps<{
  title: string;
  kind: 'item' | 'skill' | 'relic' | 'event' | 'breakthrough' | 'stones';
  id?: string;
  detail?: string;
  state?: string;
  ready?: boolean;
  titleTestId?: string;
  inspectId?: string;
  inspectLabel?: string;
}>();
const emit = defineEmits<{ inspect: [] }>();
const icon = computed(() =>
  props.kind === 'breakthrough' && props.id
    ? { kind: 'item' as const, id: props.id }
    : props.kind === 'item' || props.kind === 'skill' || props.kind === 'relic'
      ? { kind: props.kind, id: props.id ?? '' }
      : {
          kind: 'nav' as const,
          id: props.kind === 'event' ? 'karma' : 'cultivate',
        },
);
</script>
<template>
  <div
    class="goal-board"
    data-testid="goal-object-board"
    :data-kind="kind"
    :data-object-id="id"
    :data-ready="!!ready"
  >
    <div class="goal-board-object">
      <small class="goal-board-caption">{{
        kind === 'stones'
          ? '筹石'
          : kind === 'breakthrough'
            ? id
              ? '突破物'
              : '修行所向'
            : '目标物件'
      }}</small>
      <component
        :is="inspectId ? 'button' : 'div'"
        class="goal-board-vessel"
        :class="{
          interactive: inspectId,
          'goal-board-pill': id?.endsWith('_pill'),
        }"
        :data-testid="inspectId"
        :type="inspectId ? 'button' : undefined"
        :aria-label="inspectId ? inspectLabel : undefined"
        @click="inspectId && emit('inspect')"
      >
        <i class="goal-board-stand" aria-hidden="true" />
        <slot name="artifact">
          <svg
            v-if="kind === 'stones'"
            class="goal-board-currency"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <path
              d="m49 13 19 26-9 44H35L24 39Z M49 13v70 M24 39h44 M49 13 35 39l14 44 10-44Z"
            />
          </svg>
          <GameIcon v-else :kind="icon.kind" :id="icon.id" />
        </slot>
        <span v-if="inspectId" class="goal-board-inspect"
          >{{ inspectLabel ?? '查看来源' }} ›</span
        >
      </component>
      <h3 :data-testid="titleTestId">{{ title }}</h3>
      <strong v-if="state" class="goal-board-state">{{ state }}</strong>
      <p v-if="detail" class="goal-board-detail">{{ detail }}</p>
      <div v-if="$slots.context" class="goal-board-context"
        ><slot name="context"
      /></div>
    </div>
    <div class="goal-board-work">
      <div v-if="$slots.conditions" class="goal-board-conditions"
        ><slot name="conditions"
      /></div>
      <div v-if="$slots.routes" class="goal-board-routes"
        ><slot name="routes"
      /></div>
      <div v-if="$slots.decision" class="goal-board-decision"
        ><slot name="decision"
      /></div>
    </div>
  </div>
</template>
<style scoped>
@layer game {
  #app .goal-board {
    display: grid;
    grid-template-columns: minmax(210px, 0.42fr) minmax(0, 1fr);
    gap: 30px;
    min-height: 0;
    min-width: 0;
    flex: 1;
    align-items: start;
    color: var(--palette-ink);
  }
  #app .goal-board-object {
    min-width: 0;
    padding: 4px 14px 12px;
    text-align: center;
    position: relative;
  }
  #app .goal-board-caption {
    display: block;
    font-size: 14px;
    letter-spacing: 0.12em;
    color: var(--palette-muted);
    margin: 0 0 6px;
  }
  #app .goal-board-vessel {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 224px;
    width: 100%;
    max-width: 244px;
    margin: 0 auto;
    padding: 18px 12px 38px;
    color: var(--palette-jade);
    border: 0 !important;
    background: radial-gradient(
      ellipse at 50% 52%,
      color-mix(in srgb, var(--palette-raised) 40%, transparent),
      transparent 66%
    ) !important;
    box-shadow: none !important;
    isolation: isolate;
  }
  #app .goal-board-vessel.interactive:active {
    transform: translateY(2px);
  }
  #app .goal-board-vessel:focus-visible {
    outline: 2px solid var(--palette-jade);
    outline-offset: 2px;
  }
  #app .goal-board-vessel > .game-icon {
    width: 138px !important;
    height: 138px !important;
    filter: drop-shadow(
      0 10px 6px
        color-mix(in srgb, var(--palette-shadow) 70.19607843%, transparent)
    );
  }
  #app .goal-board-stand {
    position: absolute;
    left: 9%;
    right: 9%;
    bottom: 24px;
    height: 30px;
    border-radius: 50%;
    border-block: 4px double var(--palette-gold);
    background: linear-gradient(var(--palette-line), var(--palette-panel) 70%);
    box-shadow:
      0 13px 0 -4px var(--palette-night),
      0 20px 16px var(--palette-shadow);
    z-index: -1;
  }
  #app .goal-board-pill::before {
    content: '';
    position: absolute;
    top: 29px;
    width: 142px;
    height: 142px;
    border-radius: 50%;
    background: radial-gradient(
      circle at 32% 24%,
      var(--palette-jade),
      var(--palette-line) 48%,
      var(--palette-panel) 75%
    );
    box-shadow:
      inset -8px -10px 18px var(--palette-night),
      inset 2px 2px 1px color-mix(in srgb, var(--palette-gold) 40%, transparent);
    z-index: -1;
  }
  #app .goal-board-currency {
    width: 130px !important;
    height: 130px !important;
    fill: color-mix(in srgb, var(--palette-line) 20%, transparent);
    stroke: currentColor;
    stroke-width: 2;
  }
  #app .goal-board-inspect {
    position: absolute;
    bottom: 4px;
    left: 0;
    right: 0;
    font-size: 18px;
    line-height: 1.4;
    color: var(--palette-jade);
  }
  #app .goal-board-object h3 {
    font-size: 24px !important;
    line-height: 1.35;
    padding-block: 3px;
    margin: 10px 0 6px;
    overflow-wrap: anywhere;
    color: var(--palette-ink);
  }
  #app .goal-board-state {
    display: block;
    font-size: 18px;
    line-height: 1.45;
    font-weight: 400;
    color: var(--palette-jade);
  }
  #app .goal-board-detail {
    font-size: 18px !important;
    line-height: 1.55;
    margin: 8px 0;
    overflow-wrap: anywhere;
  }
  #app .goal-board-context {
    display: grid;
    gap: 8px;
    margin-top: 12px;
    min-width: 0;
    text-align: left;
  }
  #app .goal-board-context :deep(p) {
    margin: 0;
  }
  #app .goal-board[data-ready='true'] .goal-board-stand {
    border-color: var(--palette-jade);
  }
  #app .goal-board-work {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    min-height: 0;
    padding: 8px 0;
    align-self: center;
  }
  #app .goal-board-conditions,
  #app .goal-board-routes {
    min-width: 0;
  }
  #app .goal-board :deep(.goal-line) {
    position: relative;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 14px;
    padding: 18px;
    border: 0;
    border-block: 1px solid
      color-mix(in srgb, var(--palette-line) 40%, transparent);
    background: linear-gradient(
      100deg,
      color-mix(in srgb, var(--palette-raised) 74.90196078%, transparent),
      color-mix(in srgb, var(--palette-night) 40%, transparent)
    );
    box-shadow: -4px 5px 0
      color-mix(in srgb, var(--palette-night) 40%, transparent);
  }
  #app .goal-board :deep(.goal-line > span) {
    color: var(--palette-jade);
    border-top: 2px solid var(--palette-gold);
    padding-top: 8px;
  }
  #app .goal-board :deep(.goal-line > span > .game-icon) {
    width: 36px !important;
    height: 36px !important;
  }
  #app .goal-board :deep(.goal-line > div) {
    font-size: 18px;
    line-height: 1.5;
    min-width: 0;
  }
  #app .goal-board :deep(.goal-line small) {
    display: block;
    font-size: 14px;
    line-height: 1.5;
    margin-top: 5px;
  }
  #app .goal-board :deep(.source-breadcrumb) {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }
  #app .goal-board :deep(.source-details) {
    margin: 0 0 10px;
    padding: 0;
    border: 0;
    background: none;
  }
  #app .goal-board :deep(.source-details p) {
    font-size: 14px;
    line-height: 1.5;
    margin: 6px 0;
  }
  #app .goal-board :deep(.goal-source-grid),
  #app .goal-board :deep(.source-catalogue) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 0;
  }
  #app .goal-board :deep(.source-card),
  #app .goal-board :deep(.source-catalogue > article) {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    padding: 14px;
    border: 0;
    border-block: 3px double
      color-mix(in srgb, var(--palette-gold) 53.33333333%, transparent);
    border-radius: 0;
    background: linear-gradient(
      100deg,
      color-mix(in srgb, var(--palette-raised) 80%, transparent),
      color-mix(in srgb, var(--palette-night) 53.33333333%, transparent)
    );
    box-shadow: 3px 7px 0 -2px
      color-mix(in srgb, var(--palette-shadow) 40%, transparent);
  }
  #app .goal-board :deep(.source-card strong),
  #app .goal-board :deep(.source-catalogue strong) {
    font-size: 18px;
    line-height: 1.5;
    font-weight: 400;
  }
  #app .goal-board :deep(.source-card small),
  #app .goal-board :deep(.source-catalogue small) {
    font-size: 14px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  #app .goal-board :deep(.catalogue-pager) {
    margin: 10px 0 0;
    flex-wrap: wrap;
  }
  #app .goal-board-decision {
    padding-top: 4px;
    min-width: 0;
  }
  #app .goal-board-decision :deep(.catalogue-confirm) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding: 0;
    border: 0;
    background: none;
  }
  #app .goal-board-decision :deep(p),
  #app .goal-board-decision :deep(small) {
    font-size: 14px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  #app .goal-board :deep(button) {
    min-height: 44px;
    font-size: 18px;
    line-height: 1.4;
    white-space: normal;
    max-width: 100%;
  }
  #app .goal-board :deep(.preparation-needs) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 12px;
  }
  #app .goal-board :deep(.preparation-needs > article) {
    position: relative;
    padding: 12px 14px 12px 18px;
    border: 0;
    border-left: 3px solid var(--palette-line);
    background: linear-gradient(
      90deg,
      var(--palette-raised),
      var(--palette-panel)
    );
    border-radius: 0;
  }
  #app .goal-board :deep(.preparation-needs strong),
  #app .goal-board :deep(.preparation-needs span) {
    font-size: 18px;
    line-height: 1.5;
  }
  #app .goal-board :deep(.preparation-needs small) {
    font-size: 14px;
    line-height: 1.5;
  }
  #app .goal-board :deep(.goal-route-choice) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 0;
  }
  #app .goal-board :deep(.goal-route-choice > button) {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr);
    align-items: center;
    gap: 6px 10px;
    padding: 12px;
    text-align: left;
    border-radius: 2px;
    border-color: color-mix(in srgb, var(--palette-line) 40%, transparent);
    background: var(--palette-panel);
  }
  #app .goal-board :deep(.goal-route-choice > button[aria-pressed='true']) {
    border-color: var(--palette-jade);
    background: var(--palette-raised);
    box-shadow: inset 0 -3px
      color-mix(in srgb, var(--palette-jade) 53.33333333%, transparent);
  }
  #app .goal-board :deep(.goal-route-mark) {
    grid-column: 1;
    grid-row: 1/3;
    display: grid;
    place-items: center;
    width: 44px;
    height: 50px;
    border: 1px solid
      color-mix(in srgb, var(--palette-gold) 53.33333333%, transparent);
    color: var(--palette-gold);
    font-size: 28px;
    line-height: 1;
  }
  #app .goal-board :deep(.goal-route-choice strong) {
    font-size: 18px;
    font-weight: 400;
  }
  #app .goal-board :deep(.goal-route-choice small) {
    grid-column: 2;
    font-size: 14px;
    line-height: 1.4;
  }
  #app .goal-board :deep(.catalogue-description) {
    font-size: 18px;
    line-height: 1.5;
    margin: 12px 0 0;
  }
  #app .goal-board :deep(.catalogue-note) {
    font-size: 14px;
    line-height: 1.5;
  }
}
</style>
