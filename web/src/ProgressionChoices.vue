<script setup lang="ts">
import { useRuleContent } from './rule-content';

import { computed, ref, watch } from 'vue';
import type { Game } from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {
  progressionOptions,
  projectProgression,
  type ProgressionKind,
  type ProgressionVariant,
  type ProjectedStep,
} from '../../src/full/progression.ts';
import type { NavigationRequest } from './navigation';
import { formatCosts } from './presentation';
import { readingPages, type Reading } from './story-pages';
import CatalogueArt from './CatalogueArt.vue';
import CataloguePager from './CataloguePager.vue';
const ruleContent = useRuleContent(() => props.game);
const props = defineProps<{
  game: Game;
  kind: ProgressionKind;
  seed: ProgressionVariant;
  entry: number;
  busy: boolean;
  available: boolean;
}>();
const emit = defineEmits<{
  navigate: [NavigationRequest];
  inspect: [string];
}>();
const selected = ref<ProgressionVariant>(props.seed),
  page = ref(0);
const options = computed(() => progressionOptions(props.game, props.kind));
const labels: Record<ProgressionVariant, string> = {
  natural: '自然潜修',
  assisted: '灵石辅助',
  mind: '心法投资',
  gather: '自采炼制',
  commission: '委托筹材',
  purchase: '直接购丹',
};
watch(
  () => [
    props.kind,
    props.seed,
    props.entry,
    props.game.core.runId,
    props.game.core.player.realm,
  ],
  () => {
    selected.value = options.value.includes(props.seed)
      ? props.seed
      : (options.value[0] ?? props.seed);
    page.value = 0;
  },
  { immediate: true },
);
const model = computed(() => projectProgression(props.game, selected.value));
const seconds = (ms: number) => {
  const n = Math.ceil(ms / 1000),
    h = Math.floor(n / 3600),
    m = Math.floor((n % 3600) / 60),
    s = n % 60;
  return (
    (h ? h + '小时' : '') + (m ? m + '分' : '') + (s || !n ? s + '秒' : '')
  );
};
const items = (rows: Record<string, number>) =>
  Object.entries(rows)
    .map(([id, n]) => (ruleContent.value.items[id]?.name ?? id) + ' ×' + n)
    .join('、') || '无';
const rows = computed<Reading[]>(() => {
  const m = model.value,
    a = m.initial,
    b = m.closing;
  return [
    {
      key: 'scope',
      title: m.complete ? '本次筹备可达' : '本次推演未完成',
      text: `${m.name}；目标：${m.target}。预计在线周期合计${seconds(m.onlineMs)}，需分段安排${m.arrangements}段。只比较当前准备，不突破、不入劫；分段数不是点击次数。${m.failure ? '停止：' + m.failure.message : ''}`,
    },
    {
      key: 'costs',
      title: '完整投入与获得',
      text: `毛投入：${formatCosts(m.totals.costs)}。毛收入：灵石${m.totals.received.stones}、灵力${m.totals.received.mp}、${items(m.totals.received.items)}。新增修为${m.totals.xpGained}，境界重置${m.totals.xpReset}；收入不抵消累计预算。`,
    },
    {
      key: 'closing',
      title: '当前 → 预计期末',
      text: `灵石${a.stones} → ${b.stones}；修为${a.xp} → ${b.xp}；气血${a.hp} → ${b.hp}；灵力${a.mp} → ${b.mp}。游戏年月${a.months} → ${b.months}，地点${C.locations[b.location].name}。已有库存也会消耗，不是免费永续。`,
    },
    {
      key: 'inventory',
      title: '行囊与余料',
      text:
        Object.keys(ruleContent.value.items)
          .filter((id) => a.inventory[id] || b.inventory[id])
          .map(
            (id) =>
              `${ruleContent.value.items[id].name} ${a.inventory[id]} → ${b.inventory[id]}`,
          )
          .join('；') || '当前与预计期末均无物资。',
    },
    ...m.steps.map((s, i) => ({
      key: 'step-' + i,
      title: `第${i + 1}段 · ${s.label}`,
      text: `${C.locations[s.location].name}；${s.kind === 'configuration' ? '比较后即时确认，不设假等待' : `${s.cycles}周期，每周期${seconds(s.cycleMs)}，合计${seconds(s.onlineMs)}`}。投入：${formatCosts(s.costs)}。新增修为${s.gainedXp}；获得灵石${s.gainedStones}、${items(s.gainedItems)}。仅为准备推演，查看本段不会执行。`,
    })),
    ...m.notes.map((text, i) => ({
      key: 'note-' + i,
      title: '路线说明',
      text,
    })),
  ];
});
const pages = computed(() => readingPages(rows.value)),
  current = computed(
    () => pages.value[Math.min(page.value, pages.value.length - 1)],
  );
watch(selected, () => (page.value = 0));
watch(
  () => pages.value.length,
  () => {
    page.value = Math.min(page.value, pages.value.length - 1);
  },
);
const next = computed(() => model.value.steps[0] ?? null);
function request(s: ProjectedStep): NavigationRequest | null {
  const p = s.plan;
  if (s.action)
    return {
      location: props.game.core.world.location,
      tab: '修行',
      focusId:
        s.action.type === 'EQUIP'
          ? 'equip-' + s.action.skill
          : s.action.type === 'EQUIP_RELIC'
            ? 'equip-relic-' + s.action.relic
            : 'equipment-panel',
    };
  if (!p) return null;
  if (p.kind === 'travel')
    return {
      location: p.location,
      tab: '历练',
      focusId: 'travel-' + p.location,
    };
  if (p.kind === 'source')
    return {
      location: s.location,
      tab: '历练',
      focusId: 'source-' + p.sourceId,
    };
  if (p.kind === 'craft')
    return { location: 'cave', tab: '行囊', focusId: 'craft-' + p.recipeId };
  if (p.kind === 'forge')
    return { location: 'cave', tab: '修行', focusId: 'forge-' + p.relicId };
  if (p.kind === 'buy')
    return { location: 'market', tab: '历练', focusId: 'buy-' + p.item };
  if (p.kind === 'learn' || p.kind === 'study')
    return {
      location: 'sect',
      tab: '修行',
      focusId: p.kind === 'learn' ? 'learn-' + p.skills[0] : 'study-manual',
    };
  return null;
}
function inspectNext() {
  const s = next.value;
  if (!s) return;
  if (s.plan?.kind === 'cultivation') {
    emit('inspect', 'cultivation');
    return;
  }
  const r = request(s);
  if (r) emit('navigate', r);
}
</script>
<template>
  <section
    class="paper play-catalogue catalogue-gallery tradeoffs-catalogue"
    data-testid="progression-choices"
    :data-kind="kind"
    :data-variant="selected"
    tabindex="-1"
  >
    <CatalogueArt :kind="kind === 'cultivation' ? 'study' : 'alchemy'" />
    <header
      ><div
        ><small>行前取舍 · 只读推演</small><h2>{{ model.target }}</h2></div
      ><small>当前库存与正式规则推演；尚未安排</small></header
    >
    <nav class="catalogue-tabs" aria-label="筹备取舍路线"
      ><button
        v-for="v in options"
        :key="v"
        :data-testid="'tradeoff-' + v"
        :aria-pressed="selected === v"
        @click="selected = v"
        >{{ labels[v] }}</button
      ></nav
    >
    <div class="tradeoff-body"
      ><div class="tradeoff-object"
        ><small>当前比较</small><h3>{{ labels[selected] }}</h3
        ><p>{{ model.complete ? '准备可以完成' : '路线尚未完成' }}</p
        ><small
          >预计 {{ seconds(model.onlineMs) }} ·
          {{ model.arrangements }} 段</small
        ><small v-if="model.failure" role="status">{{
          model.failure.message
        }}</small></div
      >
      <article
        v-if="current"
        class="tradeoff-reading reading-text"
        :data-page-key="current.key"
        :data-page-part="current.part"
        ><small
          >{{ current.title
          }}<span v-if="current.parts > 1">
            · {{ current.part }}/{{ current.parts }}</span
          ></small
        ><p data-testid="tradeoff-reading">{{ current.text }}</p></article
      >
    </div>
    <CataloguePager
      :page="Math.min(page, pages.length - 1)"
      :pages="pages.length"
      :total="rows.length"
      label="完整取舍"
      @change="page = $event"
    />
    <footer class="catalogue-confirm"
      ><small>查看不旅行、不投入；原玩法中仍须核对预算并确认。</small
      ><button
        v-if="next"
        class="primary"
        data-testid="tradeoff-next"
        :disabled="busy || !available"
        @click="inspectNext"
        >查看下一段 · {{ next.label }} →</button
      ><small v-else>{{
        model.complete
          ? '当前准备已满足，无需重复投入。'
          : '暂无可查看的下一段，请核对停止原因。'
      }}</small></footer
    >
  </section>
</template>
