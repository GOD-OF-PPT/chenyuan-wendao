<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue';
import * as C from '../../src/full/content';
import {
  cultivationStageKey,
  useCultivationStage,
} from './cultivation-effects';
const props = withDefaults(
  defineProps<{ active: boolean; handoff?: boolean }>(),
  { handoff: true },
);
// This slot-only host outlives the opening, realm-keyed planner and trial entrance.
const stage = useCultivationStage(() => props.active);
provide(cultivationStageKey, stage);
const delivered = ref<number | null>(null);
watch(
  () => stage.milestone.effect.value,
  (e) => {
    delivered.value = e && props.active && props.handoff ? e.sequence : null;
  },
  { flush: 'post' },
);
watch(
  [() => props.active, () => props.handoff],
  () => {
    if (!props.active || !props.handoff) delivered.value = null;
  },
  { flush: 'sync' },
);
const milestoneResult = computed(() => {
  const e = stage.milestone.effect.value;
  return props.active &&
    props.handoff &&
    e &&
    delivered.value === e.sequence &&
    (e.result.phaseBefore !== e.result.phaseAfter ||
      e.result.delta.realm.before !== e.result.delta.realm.after)
    ? e
    : null;
});
const milestoneText = computed(() => {
  const e = milestoneResult.value;
  if (!e) return '';
  const a = e.action;
  return (
    '本次已保存 · ' +
    (a.type === 'BREAKTHROUGH'
      ? C.realms[e.result.delta.realm.before].name +
        ' → ' +
        C.realms[e.result.delta.realm.after].name
      : a.type === 'START_TRIAL'
        ? '入场完成，问心待决定'
        : a.type === 'CHOOSE'
          ? { help: '赠丹相助', trade: '以丹换简', leave: '保留丹药' }[a.choice]
          : '')
  );
});
const milestoneDetail = computed(() => {
  const e = milestoneResult.value;
  return e
    ? e.notice.delta + ' · ' + e.notice.summary + ' · 下一步仍由你另行安排。'
    : '';
});
</script>
<template>
  <slot
    :milestoneResult="milestoneResult"
    :milestoneText="milestoneText"
    :milestoneDetail="milestoneDetail"
  />
</template>
