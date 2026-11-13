<script setup lang="ts">
import { computed, inject, onMounted, onScopeDispose, ref } from 'vue';
import type { Game } from '../../src/full/types.ts';
import type { ConfigurationIntent } from '../../src/full/configuration.ts';
import { configurationPreview } from '../../src/full/configuration.ts';
import * as C from '../../src/full/content.ts';
import { gameFocusKey } from './focus';
import ConfigArt from './ConfigArt.vue';
import ConfigurationOutlook from './ConfigurationOutlook.vue';
const props = defineProps<{
  intent: ConfigurationIntent;
  snapshot: Game;
  stale: boolean;
  busy: boolean;
  error: string;
  retry: boolean;
  available: boolean;
}>();
const emit = defineEmits<{ confirm: []; retry: []; refresh: []; close: [] }>();
const cmd = computed(() => props.intent.command);
const dialog = ref<HTMLDialogElement>(),
  focus = inject(gameFocusKey),
  q = computed(() => configurationPreview(props.snapshot, cmd.value));
const view = ref<'effects' | 'full' | 'combat'>('effects');
const title = computed(
  () =>
    ({ SCHOOL: '择定修法', EQUIP: '更换功法', EQUIP_RELIC: '祭炼本命' })[
      cmd.value.type
    ],
);
const school = (id: Game['school']) =>
    id === 'sword' ? '剑修' : id === 'talisman' ? '符修' : '尚未择法',
  labels = {
    mind: '修炼心法',
    builder: '常用术法',
    finisher: '终结招式',
    relic: '本命法宝',
  },
  object = (slot: string, id: string | null) =>
    id ? (slot === 'relic' ? C.relics[id] : C.skills[id]) : null,
  name = (slot: string, id: string | null) =>
    object(slot, id)?.name ?? '未装备';
const slot = computed(() =>
  cmd.value.type === 'EQUIP'
    ? C.skills[cmd.value.skill].slot
    : cmd.value.type === 'EQUIP_RELIC'
      ? 'relic'
      : 'mind',
);
const ids = computed(() => {
  const a = cmd.value;
  return a.type === 'SCHOOL'
    ? Object.values(C.startingLoadouts[a.school])
    : [a.type === 'EQUIP' ? a.skill : a.relic];
});
const effect = (state: typeof q.value.before) =>
  object(slot.value, state.loadout[slot.value])?.description ??
  (slot.value === 'relic' ? '未装备，无器物加成' : '尚未择法，无功法效果');
const metrics = [
  ['cultivationBonus', '修炼加成'],
  ['guard', '护御'],
  ['markDamage', '符印伤害'],
  ['manualDamageBonus', '剑简加成'],
] as const;
const metric = (key: string, n: number) =>
  key === 'cultivationBonus' && view.value === 'effects' ? n + '%' : n;
const effects = computed(
  () =>
    metrics
      .filter(
        ([k]) =>
          view.value === 'full' || q.value.before[k] !== q.value.after[k],
      )
      .map(
        ([k, label]) =>
          `${label} ${metric(k, q.value.before[k])} → ${metric(k, q.value.after[k])}`,
      )
      .join(' · ') || '基础指标保持原值；专属作用见上。',
);
onMounted(() => focus?.open(dialog.value));
onScopeDispose(() => focus?.release(dialog.value));
</script>
<template>
  <dialog
    ref="dialog"
    class="configuration-dialog paper"
    data-testid="configuration-dialog"
    aria-labelledby="configuration-title"
    @cancel.prevent="!busy && emit('close')"
    @close="emit('close')"
  >
    <h2 id="configuration-title" data-dialog-initial tabindex="-1"
      >{{ title }} ·
      {{ cmd.type === 'SCHOOL' ? school(cmd.school) : name(slot, ids[0]) }}</h2
    >
    <nav class="configuration-view-tabs" aria-label="配装核对分类"
      ><button
        :aria-pressed="view === 'effects'"
        data-testid="configuration-view-effects"
        @click="view = 'effects'"
        >配装效果</button
      ><button
        :aria-pressed="view === 'full'"
        data-testid="config-full"
        @click="view = 'full'"
        >完整比较</button
      ><button
        :aria-pressed="view === 'combat'"
        data-testid="configuration-view-combat"
        @click="view = 'combat'"
        >本境历练预演</button
      ></nav
    >
    <template v-if="view === 'effects'">
      <div class="configuration-slots" data-testid="config-focus"
        ><article class="changed"
          ><ConfigArt :relic="slot === 'relic'" :ids="ids" /><div
            ><p v-for="id in ids" :key="id"
              >{{ cmd.type === 'SCHOOL' ? name(slot, id) + '：' : ''
              }}{{ object(slot, id)?.description }}</p
            ></div
          ></article
        ></div
      > </template
    ><template v-else-if="view === 'full'">
      <p>{{
        cmd.type === 'SCHOOL'
          ? '择法将更换下列三项功法。已掌握的功法和本命法宝保留。'
          : '此处只更换已掌握或已持有的配装，不研习、不炼制、不旅行。'
      }}</p>
      <p class="configuration-schools"
        >{{ school(q.before.school) }} → {{ school(q.after.school) }}</p
      >
      <div class="configuration-slots">
        <article
          v-for="(label, slot) in labels"
          :key="slot"
          :class="{ changed: q.before.loadout[slot] !== q.after.loadout[slot] }"
          ><p
            >{{ label }}：{{ name(slot, q.before.loadout[slot]) }}
            <b>→ {{ name(slot, q.after.loadout[slot]) }}</b></p
          ></article
        >
      </div>
      <div
        :data-testid="
          'configuration-' + (slot === 'relic' ? 'relic' : 'skill') + '-effects'
        "
        ><p v-for="(state, i) in [q.before, q.after]" :key="i"
          >{{ i ? '拟换' : slot === 'relic' ? '原器' : '原法' }}：{{
            effect(state)
          }}</p
        ></div
      > </template
    ><ConfigurationOutlook v-else :snapshot="snapshot" :action="cmd" />
    <p
      v-if="view === 'full' || (view === 'effects' && q.allowed)"
      class="configuration-effects"
      :data-testid="
        view === 'full' ? 'configuration-effects' : 'config-changes'
      "
      >{{ effects }}</p
    >
    <p>无需灵石、丹药或游戏岁月。保存后才生效；原安排不会自动继续。</p>
    <p v-if="stale" role="status">{{
      retry
        ? '原确认的回复待核对，请重试原确认；不会重复换装。'
        : '进度或活动已变化，请重新核对后确认。'
    }}</p
    ><p v-else-if="!q.allowed" role="status">{{ q.failure?.message }}</p
    ><p v-if="error" role="alert">{{ error }}</p>
    <footer
      ><button
        @click="emit('close')"
        :disabled="busy"
        data-testid="configuration-cancel"
        >暂不更换</button
      ><button
        v-if="stale && !retry"
        @click="emit('refresh')"
        :disabled="busy || !available"
        data-testid="configuration-refresh"
        >重新核对</button
      ><button
        v-else-if="retry"
        @click="emit('retry')"
        :disabled="busy || !available"
        data-testid="configuration-retry"
        >重试原确认</button
      ><button
        v-else
        class="primary"
        @click="emit('confirm')"
        :disabled="busy || !available || !q.allowed || !!error"
        data-testid="configuration-confirm"
        >{{ busy ? '保存中…' : '确认' + title }}</button
      ></footer
    >
  </dialog>
</template>
