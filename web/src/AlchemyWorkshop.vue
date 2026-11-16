<script setup lang="ts">
import { recipePeriodMs } from '../../src/full/online-periods';
import { useRuleContent } from './rule-content';

import { useLocalActivityControls } from './activity-controls';
import { stopMessage } from './activity-view';
import {
  computed,
  inject,
  ref,
  watch,
  onActivated,
  onDeactivated,
  onScopeDispose,
} from 'vue';
import type { Game } from '../../src/full/types';
import {
  previewActivity,
  type Activity,
  type CraftPlan,
} from '../../src/full/activity';
import * as C from '../../src/full/content';
import { useActivityPresentation } from './use-activity-effect';
import { pausedPlanView } from './preparation-view.ts';
import { gameFocusKey } from './focus';
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
import CataloguePager from './CataloguePager.vue';
import ItemArtifact from './ItemArtifact.vue';
const ruleContent = useRuleContent(() => props.game);
const props = defineProps<{
  game: Game;
  plan: CraftPlan;
  activity: Activity | null;
  runtime: {
    id: string;
    generation: number;
    totalMs: number;
    remainingMs: number;
    phase: string;
  } | null;
  busy: boolean;
  available: boolean;
  running: boolean;
  rows: { id: string; name: string; icon: string; min: C.RealmId }[];
  catalogue: { page: number; pages: number; total: number };
  future: boolean;
  consumptionWarning: string;
}>();
const emit = defineEmits<{
  start: [];
  travel: [];
  source: [];
  limits: [boolean];
  select: [string];
  page: [number];
  future: [boolean];
  material: [string];
}>();
const settingsOpen = ref(false),
  settings = ref<HTMLDialogElement>(),
  visible = ref(true);
const library = ref<HTMLDialogElement>(),
  focus = inject(gameFocusKey);
const recipe = computed(() => ruleContent.value.recipes[props.plan.recipeId]),
  item = computed(
    () => recipe.value && ruleContent.value.items[recipe.value.output],
  );
const {
  store: feedbackStore,
  activity: current,
  runtime,
  effect,
} = useActivityPresentation(
  (a) => a.version === 3 && a.plan.recipeId === props.plan.recipeId,
  () => props.game.core.runId + ':' + props.plan.recipeId,
);
const arrival = computed(() => {
  const e = effect.value,
    quantity = e?.result.delta.inventory[recipe.value.output] ?? 0;
  return e?.notice.family === 'craft' && quantity > 0
    ? { item: recipe.value.output, quantity, sequence: e.sequence }
    : null;
});
const state = computed(() =>
  !props.available || feedbackStore?.error
    ? 'failed'
    : feedbackStore?.activityPausing && current.value
      ? 'pausing'
      : runtime.value
        ? runtime.value.phase === 'saving'
          ? 'saving'
          : runtime.value.remainingMs > runtime.value.totalMs * 0.8
            ? 'heating'
            : runtime.value.remainingMs > runtime.value.totalMs * 0.2
              ? 'refining'
              : 'coalescing'
        : current.value?.status === 'paused'
          ? 'paused'
          : 'idle',
);
const burning = computed(() =>
  ['heating', 'refining', 'coalescing'].includes(state.value),
);
const status = computed(
  () =>
    ({
      failed:
        !props.available || feedbackStore?.syncIssue
          ? '进度待核对'
          : feedbackStore?.unresolved
            ? '查看上方提示'
            : '上次未完成 · 可另行安排',
      saving: '封存成果 · 保存后入匣',
      paused: '炉火暂歇',
      pausing: '正在停手，保存后暂停',
      heating: '温炉',
      refining: '炼化药性',
      coalescing: '凝丹',
      idle:
        current.value?.status === 'stopped'
          ? current.value.completedCycles
            ? '成果已保存'
            : '安排已停止'
          : '待启炉',
    })[state.value],
);
const atCave = computed(() => props.game.core.world.location === 'cave');
const restart = computed(() =>
  pausedPlanView(feedbackStore?.activity, props.game.core.runId, props.plan),
);
const buttonLabel = computed(() =>
  !props.available || feedbackStore?.unresolved
    ? '先在上方核对存档'
    : !atCave.value
      ? '前往洞府 · 不自动启炉'
      : restart.value.same
        ? '原段已暂停 · 在上方继续'
        : props.running
          ? current.value
            ? '炼制中 · 可在活动条暂停'
            : '已有活动 · 请先暂停'
          : restart.value.label + '开炉 · ' + item.value.name,
);
const quote = computed(() => previewActivity(props.game, props.plan));
const finite = computed(() =>
  props.plan.repeat
    ? props.plan.until === 'target'
      ? '成品库存达到 ' + props.plan.targetQuantity + ' 即停'
      : '持续炼制 · 触线或手动停下'
    : props.plan.until === 'target'
      ? '成品库存达到 ' +
        props.plan.targetQuantity +
        ' 即停 · 最多 ' +
        props.plan.maxCycles +
        ' 炉'
      : props.plan.maxCycles + ' 炉后停',
);
const total = computed(() =>
  current.value?.version === 3
    ? (current.value.gainedItems[recipe.value.output] ?? 0)
    : 0,
);
const blocked = computed(
  () =>
    !props.available ||
    props.busy ||
    props.running ||
    feedbackStore?.unresolved ||
    (restart.value.same && atCave.value),
);
const reason = computed(() =>
  !props.available
    ? '存档未就绪'
    : feedbackStore?.unresolved
      ? feedbackStore.syncIssue
        ? '请先重新读取当前进度'
        : '请先处理上方存档提示'
      : props.busy
        ? '正在保存，请稍候'
        : props.running
          ? '已有活动进行中，请先暂停'
          : (quote.value.failure?.message ?? ''),
);
function close() {
  library.value?.close();
  settings.value?.close();
  settingsOpen.value = false;
}
function open() {
  if (!visible.value) return;
  close();
  settingsOpen.value = true;
  settings.value?.showModal();
}
function browse(event: Event) {
  close();
  if (focus) focus.open(library.value, event.currentTarget as HTMLElement);
  else library.value?.showModal();
}
function select(id: string) {
  close();
  emit('select', id);
}
function material(id: string) {
  close();
  emit('material', id);
}
function start() {
  close();
  if (props.game.core.world.location === 'cave') emit('start');
  else emit('travel');
}
const costText = (items: Record<string, number>) =>
  Object.entries(items)
    .map(([id, n]) => ruleContent.value.items[id].name + ' ×' + n)
    .join(' · ');
function limits() {
  const back = settingsOpen.value;
  close();
  emit('limits', back);
}
defineExpose({ open });
watch([() => props.game.core.runId, () => props.plan.recipeId], close, {
  flush: 'sync',
});
onActivated(() => (visible.value = true));
onDeactivated(() => {
  visible.value = false;
  close();
});
onScopeDispose(() => focus?.release(library.value));
const localControls = useLocalActivityControls();
</script>
<template>
  <div
    class="alchemy-workshop"
    data-testid="alchemy-workshop"
    data-copy30="alchemy"
    :data-state="state"
    :data-recipe="plan.recipeId"
  >
    <AssetImage
      class="study-sanctum"
      style="inset: 0"
      path="art/v2/workshops/alchemy-v1.webp"
      asset-id="alchemy-chamber"
      eager
      aria-hidden="true"
      ><span class="study-sanctum-fallback"
    /></AssetImage>
    <header class="alchemy-heading"
      ><div
        ><h3>{{ recipe.name }}</h3
        ><small
          >丹方 · 需{{ ruleContent.realms[recipe.min].name }} · 每炉
          {{ recipe.stones }} 灵石，固定成丹 1 枚</small
        ></div
      ><button data-testid="alchemy-library-open" @click="browse"
        >翻看丹方册</button
      ></header
    >
    <div class="alchemy-scene">
      <div class="alchemy-reference">
        <aside class="alchemy-product-tray" data-testid="alchemy-product-tray"
          ><div class="alchemy-pill-rest"
            ><ItemArtifact
              :item-id="recipe.output"
              :owned="game.core.inventory[recipe.output] > 0"
            /><strong data-testid="alchemy-product-stock"
              >持有 {{ game.core.inventory[recipe.output] }} 枚</strong
            ><span data-testid="alchemy-product-total"
              >本段成丹 {{ total }} 枚</span
            ></div
          ><button
            data-testid="alchemy-product-source"
            :aria-label="item.name + '来源与坊市替代'"
            @click="emit('source')"
            >来源与坊市替代 ›</button
          ><p v-if="arrival" class="alchemy-saved" role="status"
            >丹成入匣 · 实际 +{{ arrival.quantity }}，已保存</p
          ></aside
        >
        <div class="alchemy-materials"
          ><small>单炉药材 · 点选找来源</small
          ><div class="production-materials" aria-label="单炉材料药匣"
            ><button
              v-for="(n, id) in recipe.inputs"
              :key="id"
              :data-testid="'production-source-' + id"
              @click="material(String(id))"
              ><ItemArtifact
                :item-id="String(id)"
                :owned="game.core.inventory[id] > 0"
              /><strong>{{ ruleContent.items[id].name }}</strong
              ><span>每炉 {{ n }} · 持有 {{ game.core.inventory[id] }}</span
              ><small
                >保留 {{ plan.itemReserves[id] ?? 0 }} ·
                {{
                  game.core.inventory[id] < n + (plan.itemReserves[id] ?? 0)
                    ? '缺 ' +
                      (n +
                        (plan.itemReserves[id] ?? 0) -
                        game.core.inventory[id]) +
                      ' · '
                    : ''
                }}<span style="white-space: nowrap">查看来源 ›</span></small
              ></button
            ></div
          ></div
        >
      </div>
      <div
        class="alchemy-furnace"
        data-testid="alchemy-furnace"
        :data-burning="burning"
      >
        <button
          class="alchemy-inspect"
          data-testid="alchemy-inspect"
          aria-label="查看丹炉安排，不开炉"
          @click="open"
          ><span>查看安排 ›</span></button
        >
        <div class="alchemy-rune" aria-hidden="true" /><AssetImage
          path="art/v2/workshop/furnace-v1.webp"
          asset-id="alchemy-cold-furnace"
          fit="contain"
          eager
          ><span class="alchemy-art-fallback">听雨丹炉</span></AssetImage
        >
        <div class="alchemy-flame" aria-hidden="true"><i /><i /><i /></div
        ><div class="alchemy-smoke" aria-hidden="true"><i /><i /><i /></div>
        <div
          v-if="arrival"
          class="alchemy-arrival"
          data-testid="alchemy-arrival"
          :data-sequence="arrival.sequence"
          aria-hidden="true"
          ><GameIcon kind="item" :id="arrival.item" /><b
            >+{{ arrival.quantity }}</b
          ></div
        >
      </div>

      <div class="alchemy-cycle"
        ><strong data-testid="production-fire">{{ status }}</strong
        ><span v-if="runtime && localControls"
          >{{ Math.ceil(runtime.remainingMs / 1000) }} 秒 /
          {{ runtime.totalMs / 1000 }} 秒</span
        ><span
          v-else-if="
            !runtime &&
            current?.status === 'running' &&
            !feedbackStore?.activityPausing &&
            !feedbackStore?.error
          "
          >已保存安排，接续范围见当前活动。</span
        ><span v-else
          >每炉 {{ recipePeriodMs(game, plan.recipeId) / 1000 }} 秒 ·
          {{ recipe.months }} 游戏月</span
        ></div
      >
      <button
        class="primary production-start"
        :data-testid="
          settingsOpen
            ? undefined
            : atCave
              ? 'production-start'
              : 'production-return-cave'
        "
        :disabled="blocked || (atCave && !quote.allowed)"
        @click="start"
        >{{ buttonLabel }}</button
      >
    </div>
    <footer class="alchemy-authorization"
      ><div
        ><strong
          >{{ restart.same ? restart.summary + ' 炉' : finite
          }}<small>
            ·
            {{
              restart.same
                ? '沿用原预算'
                : current?.status === 'running'
                  ? '下次选择 · 当前活动不变'
                  : '开炉才执行'
            }}</small
          ></strong
        ><span
          >投入上限 {{ plan.stoneBudget }} 灵石 /
          {{ plan.monthBudget }} 月</span
        ><small
          >保留 {{ plan.stoneReserve }} 灵石 / 余寿
          {{ plan.remainingMonthsReserve }} 月 ·
          {{
            reason || current?.stopReason?.message || '达标或触线即停'
          }}</small
        ></div
      ><div class="alchemy-arrange-buttons"
        ><button data-testid="alchemy-settings-open" @click="open">安排</button
        ><button
          class="production-budget"
          :data-testid="settingsOpen ? undefined : 'production-limits'"
          @click="limits"
          >限额</button
        ></div
      ></footer
    >
    <dialog
      ref="library"
      class="alchemy-library"
      data-testid="alchemy-library-dialog"
      aria-labelledby="alchemy-library-title"
      ><header
        ><h3 id="alchemy-library-title" tabindex="-1" data-dialog-initial
          >丹方册 · 选方只查看</h3
        ><button data-testid="alchemy-library-close" @click="close"
          >回到当前丹炉</button
        ></header
      ><p>{{ item.name }} · {{ item.description }}</p
      ><aside class="alchemy-recipe-book"
        ><label class="alchemy-future"
          ><input
            :checked="future"
            @change="
              emit('future', ($event.target as HTMLInputElement).checked)
            "
            type="checkbox"
            aria-label="显示后续生产目录"
          />
          后续境界</label
        ><nav class="production-choices" aria-label="配方选择"
          ><button
            v-for="row in rows"
            :key="row.id"
            :data-testid="'craft-' + row.id"
            :aria-pressed="plan.recipeId === row.id"
            :aria-label="row.name"
            @click="select(row.id)"
            ><GameIcon kind="item" :id="row.icon" /><strong>{{
              ruleContent.items[row.icon].name
            }}</strong
            ><small>需{{ ruleContent.realms[row.min].name }}</small></button
          ></nav
        ><CataloguePager
          :page="catalogue.page"
          :pages="catalogue.pages"
          :total="catalogue.total"
          label="配方"
          @change="emit('page', $event)" /></aside
    ></dialog>
    <dialog
      @close="settingsOpen = !!settings?.open"
      ref="settings"
      class="alchemy-settings"
      data-testid="alchemy-settings"
      aria-labelledby="alchemy-settings-title"
      ><header
        ><h3 id="alchemy-settings-title"
          >{{ recipe.name }} · 每炉
          {{ recipePeriodMs(game, plan.recipeId) / 1000 }} 秒</h3
        ><button data-testid="alchemy-settings-close" @click="close"
          >返回丹炉</button
        ></header
      ><p>待确认选择 · 每炉 {{ recipe.stones }} 灵石，成丹1枚</p
      ><slot name="settings" /><div
        class="production-estimate"
        data-testid="production-estimate"
        ><strong v-if="quote.failure"
          >暂不可开炉：{{ quote.failure.message }}</strong
        ><strong v-else
          >{{ quote.truncated ? '前50炉预估 · 后续未计算：' : '预计 '
          }}{{ quote.cycles }} 炉 · 灵石消耗 {{ quote.stones }} ·
          {{ quote.months }} 游戏月</strong
        ><small v-if="!quote.failure"
          >耗材：{{ costText(quote.spentItems) || '暂无' }}；成品
          {{ costText(quote.items) || '暂无' }}</small
        ><small v-if="consumptionWarning" data-testid="production-consumption"
          >单炉：{{ consumptionWarning }}</small
        ><small v-if="!quote.failure && quote.stopReason"
          >预计停止：{{ stopMessage(plan, quote.stopReason, true) }}</small
        ></div
      ><details class="alchemy-rules"
        ><summary>停炉与续接规则</summary
        ><p
          >只调整待确认安排，开炉后才执行。在线逐炉保存，刷新后主动继续；不自动采购、取材或突破。成品自动入匣，无需领取。材料不足、达到目标或触及保留量时自动停炉。</p
        ></details
      ><footer
        ><button
          :data-testid="settingsOpen ? 'production-limits' : undefined"
          @click="limits"
          >调整完整预算与保留量</button
        ><button
          v-if="settingsOpen"
          class="primary"
          :data-testid="atCave ? 'production-start' : 'production-return-cave'"
          :disabled="blocked || (atCave && !quote.allowed)"
          @click="start"
          >{{ buttonLabel }}</button
        ></footer
      ></dialog
    >
  </div>
</template>
