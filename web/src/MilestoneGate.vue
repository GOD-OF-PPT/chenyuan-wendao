<script setup lang="ts">
import { useRuleContent } from './rule-content';

import { useLocalActivityControls } from './activity-controls';
import { computed } from 'vue';
import type { Action, Game } from '../../src/full/types';
import type { MilestoneAction } from '../../src/full/milestones';
import * as C from '../../src/full/content';
import { milestonePresentation } from './milestone-view';
import {
  useCultivationMilestone,
  type CultivationMilestoneKind,
} from './cultivation-effects';
import GameIcon from './GameIcon.vue';
import './milestone-objects.css';
const ruleContent = useRuleContent(() => props.game);
const props = withDefaults(
  defineProps<{
    game: Game;
    kind: CultivationMilestoneKind;
    action?: Action | null;
    active?: boolean;
  }>(),
  { active: true },
);
const selected = computed<Action | null>(
  () =>
    props.action ??
    (props.kind === 'breakthrough'
      ? { type: 'BREAKTHROUGH' }
      : props.kind === 'trial'
        ? { type: 'START_TRIAL' }
        : null),
);
const {
  store,
  phase,
  working,
  progress,
  engaged,
  effect,
  origin,
  action: actual,
  seconds,
  remaining,
} = useCultivationMilestone(
  () => props.kind,
  () => selected.value,
  () => props.active,
);
const source = computed(() => origin.value?.game ?? props.game),
  realm = computed(
    () => ruleContent.value.realms[source.value.core.player.realm],
  );
const current = computed(() => actual.value ?? selected.value),
  view = computed(() =>
    current.value &&
    !(current.value.type === 'BREAKTHROUGH' && !realm.value.next)
      ? milestonePresentation(source.value, current.value as MilestoneAction)
      : null,
  );
const pill = computed(() =>
  props.kind === 'opening'
    ? 'healing_pill'
    : props.kind === 'trial'
      ? 'ascension_seal'
      : realm.value.pill,
);
const title = computed(() =>
  props.kind === 'opening'
    ? '雨夜药匣'
    : props.kind === 'trial'
      ? '登仙台 · 入劫之门'
      : realm.value.next
        ? ruleContent.value.realms[realm.value.next].name + '境门'
        : '道途已至',
);
const resultText = computed(() => {
  const e = effect.value;
  if (!e) return '';
  if (e.action.type === 'BREAKTHROUGH')
    return (
      ruleContent.value.realms[e.result.delta.realm.before].name +
      ' → ' +
      ruleContent.value.realms[e.result.delta.realm.after].name
    );
  return e.action.type === 'START_TRIAL'
    ? '入场已保存 · 问心待决定'
    : '开场抉择已保存 · 未自动修行';
});
const localControls = useLocalActivityControls();
</script>
<template>
  <section
    class="milestone-gate"
    data-testid="milestone-gate"
    :data-kind="kind"
    :data-action="current?.type"
    :data-state="phase"
    :data-status="store?.error ? 'failed' : phase"
    :data-working="working"
    :data-engaged="engaged"
    :data-progress="progress"
    :data-saved="!!effect"
    :style="{ '--gate-progress': progress * 100 + '%' }"
  >
    <slot
      name="object"
      :source="source"
      :phase="phase"
      :engaged="engaged"
      :remaining="remaining"
      :seconds="seconds"
      :view="view"
    >
      <div
        class="milestone-object"
        :class="{ 'milestone-object-arrived': !!effect }"
        :aria-label="title"
      >
        <div
          v-if="kind === 'opening'"
          class="gate-medicine-case"
          aria-hidden="true"
          ><i class="gate-case-lid" /><i class="gate-case-tray" /><GameIcon
            kind="item"
            id="healing_pill"
        /></div>
        <div v-else class="gate-threshold" aria-hidden="true"
          ><i class="gate-lintel" /><i class="gate-pillar gate-pillar-left" /><i
            class="gate-pillar gate-pillar-right"
          /><i class="gate-veil" /><GameIcon
            v-if="pill"
            kind="item"
            :id="pill"
          /><span>{{
            kind === 'trial'
              ? '问心'
              : realm.next
                ? ruleContent.realms[realm.next].name
                : '道'
          }}</span></div
        >
        <div class="gate-object-caption"
          ><strong>{{ title }}</strong
          ><small v-if="pill" data-testid="milestone-material"
            >{{ ruleContent.items[pill].name }} · 实有
            {{ source.core.inventory[pill] }}</small
          ><small v-else>本次引气不消耗突破丹</small></div
        >
        <div class="gate-cycle" role="status"
          ><template v-if="engaged"
            ><strong>{{
              phase === 'saving'
                ? '保存本次成果中 · 尚未落定'
                : kind === 'opening'
                  ? '所选抉择进行中'
                  : kind === 'trial'
                    ? '入场进行中'
                    : '凝神破境中'
            }}</strong
            ><span
              v-if="phase === 'running' && localControls"
              data-testid="milestone-cycle-clock"
              >{{ remaining }} / {{ seconds }} 秒</span
            ></template
          ><small v-else>{{
            store?.error
              ? '存档待核对 · 短效已停'
              : kind === 'opening'
                ? '先读三种选择 · 查看不消耗'
                : '先核对准备 · 确认后才安排'
          }}</small></div
        >
      </div>
    </slot>
    <div class="milestone-object-content">
      <slot />
      <div v-if="$slots.requirements || view" class="gate-requirements"
        ><slot name="requirements" :view="view"
          ><p data-testid="milestone-object-cost">本次成本：{{ view?.cost }}</p
          ><small
            >{{ view?.seconds }} 秒 · 仅一次 · {{ view?.next }}</small
          ></slot
        ></div
      >
      <p
        v-if="effect"
        class="gate-saved-result"
        data-testid="milestone-result"
        :data-sequence="effect.sequence"
        ><strong>{{ resultText }}</strong
        ><small
          >{{ effect.notice.delta }} · {{ effect.notice.summary }}</small
        ></p
      >
      <slot name="decision" />
    </div>
  </section>
</template>
