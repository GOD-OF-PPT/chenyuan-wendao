<script setup lang="ts">
import { useRuleContent } from './rule-content';

import { computed, ref, watch, onDeactivated } from 'vue';
import type { Game, Action } from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import type {
  Activity,
  CraftPlan,
  ForgePlan,
  ForgeActivity,
} from '../../src/full/activity.ts';
import type { TrackingTarget } from '../../src/full/goals.ts';
import type { NavigationRequest } from './navigation';
import { canonicalFingerprint as proof } from '../../src/full/receipts.ts';
import { REPEAT_CYCLE_LIMIT } from '../../src/full/repetition';
import { continuingCraft } from './default-plans';
import CataloguePager from './CataloguePager.vue';
import { pageSlice } from './play-flow';
import AssetImage from './AssetImage.vue';
import AlchemyWorkshop from './AlchemyWorkshop.vue';
import RelicAtelier from './RelicAtelier.vue';
type Limits = {
  stoneBudget: number;
  stoneReserve: number;
  monthBudget: number;
  remainingMonthsReserve: number;
  itemReserves: Record<string, number>;
};
const ruleContent = useRuleContent(() => props.game);
const props = defineProps<{
  game: Game;
  mode: 'craft' | 'forge';
  busy: boolean;
  available: boolean;
  running: boolean;
  highlight: string;
  relicInspection?: { runId: string; id: string } | null;
  savedPlan: CraftPlan | ForgePlan | null;
  activity: Activity | null;
  runtime: {
    id: string;
    generation: number;
    totalMs: number;
    remainingMs: number;
    phase: string;
  } | null;
  embedded?: boolean;
  minimal?: boolean;
  consumption: (action: Action) => string;
}>();
const emit = defineEmits<{
  start: [CraftPlan | ForgePlan];
  track: [TrackingTarget];
  act: [Action];
  travel: [CraftPlan | ForgePlan];
  navigate: [NavigationRequest];
}>();
const limitsEdited = ref(false),
  workshop = ref<InstanceType<typeof AlchemyWorkshop>>();
let back = false;
const targetRepeats = ref(true);
const selected = ref(''),
  page = ref(0),
  future = ref(false),
  cycles = ref<number | 'target' | 'continuous'>('continuous'),
  targetQuantity = ref(1),
  targetCycles = ref(50),
  dialog = ref<HTMLDialogElement>();
const copy = (l: Limits): Limits => ({
  stoneBudget: l.stoneBudget,
  stoneReserve: l.stoneReserve,
  monthBudget: l.monthBudget,
  remainingMonthsReserve: l.remainingMonthsReserve,
  itemReserves: { ...l.itemReserves },
});
const limits = ref<Limits>({
    stoneBudget: 0,
    stoneReserve: 0,
    monthBudget: 0,
    remainingMonthsReserve: 1,
    itemReserves: {},
  }),
  draft = ref<Limits>(copy(limits.value));
const rows = computed(() =>
  props.mode === 'craft'
    ? Object.entries(ruleContent.value.recipes)
        .filter(
          ([, r]) =>
            future.value ||
            C.rank(r.min) <= C.rank(props.game.core.player.realm),
        )
        .map(([id, r]) => ({ id, name: r.name, icon: r.output, min: r.min }))
    : Object.entries(ruleContent.value.relics)
        .filter(
          ([id]) =>
            future.value ||
            props.game.ownedRelics.includes(id) ||
            C.rank(props.game.core.player.realm) >= C.rank('golden'),
        )
        .map(([id, r]) => ({
          id,
          name: r.name,
          icon: id,
          min: 'golden' as C.RealmId,
        })),
);
const paged = computed(() => pageSlice(rows.value, page.value, 4));
const recipe = computed(() =>
    props.mode === 'craft' ? ruleContent.value.recipes[selected.value] : null,
  ),
  relic = computed(() =>
    props.mode === 'forge' ? ruleContent.value.relics[selected.value] : null,
  );
const unit = computed(() =>
  recipe.value
    ? {
        stones: recipe.value.stones,
        months: recipe.value.months,
        items: recipe.value.inputs,
      }
    : relic.value
      ? {
          stones: relic.value.stones,
          months: ruleContent.value.actionDurations.forge,
          items: relic.value.inputs,
        }
      : null,
);
const output = computed(() =>
    recipe.value ? ruleContent.value.items[recipe.value.output] : null,
  ),
  owned = computed(
    () =>
      props.mode === 'forge' && props.game.ownedRelics.includes(selected.value),
  );
const plan = computed<CraftPlan | ForgePlan>(() =>
  props.mode === 'craft'
    ? {
        kind: 'craft',
        recipeId: selected.value,
        maxCycles:
          cycles.value === 'continuous' ||
          (cycles.value === 'target' && targetRepeats.value)
            ? REPEAT_CYCLE_LIMIT
            : cycles.value === 'target'
              ? targetCycles.value
              : cycles.value,
        ...(cycles.value === 'continuous' ||
        (cycles.value === 'target' && targetRepeats.value)
          ? { repeat: true as const }
          : {}),
        until: cycles.value === 'target' ? 'target' : 'cycles',
        targetQuantity: cycles.value === 'target' ? targetQuantity.value : null,
        ...copy(limits.value),
      }
    : {
        kind: 'forge',
        relicId: selected.value,
        maxCycles: 1,
        ...copy(limits.value),
      },
);
function resetLimits(n: number) {
  if (!unit.value) return;
  limits.value = {
    stoneBudget: unit.value.stones * n,
    stoneReserve: 0,
    monthBudget: unit.value.months * n,
    remainingMonthsReserve: 1,
    itemReserves: {},
  };
}
function restorePlan() {
  const p = props.savedPlan;
  if (
    !p ||
    p.kind !== props.mode ||
    (p.kind === 'craft' ? p.recipeId : p.relicId) !== selected.value
  )
    return;
  limits.value = copy(p);
  limitsEdited.value = true;
  if (p.kind === 'craft') {
    targetRepeats.value = !!p.repeat;
    cycles.value =
      p.until === 'target' ? 'target' : p.repeat ? 'continuous' : p.maxCycles;
    targetCycles.value = p.repeat ? 50 : p.maxCycles;
    targetQuantity.value = p.targetQuantity ?? 1;
  }
}
function select(id: string) {
  if (id === selected.value) return;
  limitsEdited.value = false;
  selected.value = id;
  targetRepeats.value = true;
  cycles.value =
    output.value?.kind === 'breakthrough' ? 'target' : 'continuous';
  targetQuantity.value = 1;
  targetCycles.value = 50;
  if (props.mode === 'craft')
    limits.value = copy(continuingCraft(props.game, id));
  else resetLimits(1);
  restorePlan();
}
function locate() {
  const prefix =
      props.mode === 'craft'
        ? 'craft-'
        : props.highlight.startsWith('equip-relic-')
          ? 'equip-relic-'
          : 'forge-',
    id = props.highlight.startsWith(prefix)
      ? props.highlight.slice(prefix.length)
      : '';
  if (
    (props.mode === 'craft'
      ? ruleContent.value.recipes
      : ruleContent.value.relics)[id]
  ) {
    future.value = true;
    page.value = Math.max(
      0,
      Math.floor(rows.value.findIndex((r) => r.id === id) / 4),
    );
    select(id);
  } else if (
    !rows.value.some((r) => r.id === selected.value) &&
    rows.value.length
  )
    select(rows.value[0].id);
}
watch(
  [() => props.game.core.runId, () => props.mode, () => props.highlight],
  locate,
  { immediate: true },
);
watch(() => props.savedPlan, restorePlan);
function changeFuture() {
  page.value = 0;
  if (
    !rows.value.some((r) => r.id === selected.value) &&
    (props.mode === 'craft' || rows.value.length)
  ) {
    selected.value = '';
    if (rows.value.length) select(rows.value[0].id);
  }
}
watch(
  () => props.relicInspection,
  (r) => {
    if (
      props.mode !== 'forge' ||
      r?.runId !== props.game.core.runId ||
      !Object.hasOwn(ruleContent.value.relics, r.id)
    )
      return;
    future.value = true;
    page.value = Math.max(
      0,
      Math.floor(rows.value.findIndex((x) => x.id === r.id) / 4),
    );
    select(r.id);
  },
  { immediate: true },
);
function reestimate() {
  if (props.mode !== 'craft' || !recipe.value) return;
  limits.value = copy(continuingCraft(props.game, selected.value));
  limitsEdited.value = false;
}
function changeMode() {
  targetRepeats.value = true;
  changeCycles();
}
function changeCycles() {
  if (!recipe.value || limitsEdited.value) return;
  if (cycles.value === 'continuous') {
    limits.value = copy(continuingCraft(props.game, selected.value));
    return;
  }
  const n =
    cycles.value === 'target'
      ? Math.min(
          targetRepeats.value ? REPEAT_CYCLE_LIMIT : targetCycles.value,
          Math.max(
            1,
            targetQuantity.value -
              props.game.core.inventory[recipe.value.output],
          ),
        )
      : cycles.value;
  resetLimits(n);
}
function openLimits(returnView: unknown = false) {
  back = returnView === true;
  const items = Object.fromEntries(
    Object.keys(unit.value?.items ?? {}).map((id) => [
      id,
      limits.value.itemReserves[id] ?? 0,
    ]),
  );
  draft.value = {
    ...copy(limits.value),
    itemReserves:
      props.mode === 'forge'
        ? { ...limits.value.itemReserves, ...items }
        : items,
  };
  if (props.mode === 'forge') {
    const original = originalForge.value;
    forgeRead.value = !!original && proof(plan.value) === proof(original.plan);
  }
  dialog.value?.showModal();
}
function closeLimits() {
  dialog.value?.close();
  if (back) {
    back = false;
    workshop.value?.open();
  }
}
function applyLimits() {
  limits.value = copy(draft.value);
  limitsEdited.value = true;
  closeLimits();
}
function need(id: string) {
  if (!unit.value) return 1;
  const n =
    props.mode === 'forge'
      ? 1
      : cycles.value === 'continuous'
        ? Math.min(
            50,
            Math.floor(limits.value.stoneBudget / (unit.value.stones || 1)),
          )
        : cycles.value === 'target'
          ? Math.min(
              targetCycles.value,
              Math.max(
                0,
                targetQuantity.value -
                  (recipe.value
                    ? props.game.core.inventory[recipe.value.output]
                    : 0),
              ),
            )
          : cycles.value;
  return Math.min(
    C.maxQuantity,
    Math.max(
      1,
      unit.value.items[id] * n + (limits.value.itemReserves[id] ?? 0),
    ),
  );
}
const consumptionWarning = computed(() =>
  selected.value && !owned.value
    ? props.consumption(
        props.mode === 'craft'
          ? { type: 'CRAFT', recipeId: selected.value }
          : { type: 'FORGE', relic: selected.value },
      )
    : '',
);
const forgeRead = ref(false),
  originalPage = ref(0),
  reservePage = ref(0),
  forgeInspection = ref<{ run: string; id: string } | null>(null);
watch(
  () => props.savedPlan,
  (p) => {
    const a = props.activity;
    forgeInspection.value =
      p?.kind === 'forge' &&
      a?.version === 4 &&
      a.runId === props.game.core.runId &&
      proof(p) === proof(a.plan)
        ? { run: a.runId, id: a.id }
        : null;
    originalPage.value = 0;
  },
  { immediate: true, flush: 'sync' },
);
const originalForge = computed<ForgeActivity | null>(() => {
  const a = props.activity,
    p = props.savedPlan,
    i = forgeInspection.value;
  return props.mode === 'forge' &&
    p?.kind === 'forge' &&
    a?.version === 4 &&
    i &&
    i.id === a.id &&
    i.run === a.runId &&
    a.runId === props.game.core.runId &&
    p.relicId === selected.value &&
    proof(p) === proof(a.plan)
    ? a
    : null;
});
const originalItems = computed(() => {
  const a = originalForge.value;
  return pageSlice(
    a
      ? [
          ...new Set([
            ...Object.keys(ruleContent.value.relics[a.plan.relicId].inputs),
            ...Object.keys(a.plan.itemReserves),
            ...Object.keys(a.spentItems),
          ]),
        ]
      : [],
    originalPage.value,
    4,
  );
});
const editableReserves = computed(() =>
  pageSlice(Object.keys(draft.value.itemReserves), reservePage.value, 4),
);
onDeactivated(() => dialog.value?.close());
</script>
<template>
  <section
    class="production-planner"
    :data-mode="mode"
    :class="{
      paper: !embedded,
      'play-catalogue': !embedded,
      'production-minimal': minimal,
      'alchemy-planner': mode === 'craft' && recipe,
    }"
    :data-testid="mode === 'craft' ? 'recipe-catalogue' : 'forging-planner'"
    tabindex="-1"
  >
    <AlchemyWorkshop
      ref="workshop"
      v-if="mode === 'craft' && recipe && plan.kind === 'craft'"
      :game="game"
      :plan="plan"
      :activity="activity"
      :runtime="runtime"
      :busy="busy"
      :available="available"
      :running="running"
      :rows="paged.rows"
      :catalogue="paged"
      :future="future"
      :consumption-warning="consumptionWarning"
      @select="select"
      @page="page = $event"
      @future="
        future = $event;
        changeFuture();
      "
      @material="
        (id) => emit('track', { kind: 'item', id, quantity: need(id) })
      "
      @start="emit('start', plan)"
      @travel="emit('travel', plan)"
      @limits="openLimits"
      @source="
        emit('track', {
          kind: 'item',
          id: recipe.output,
          quantity:
            Number.isSafeInteger(targetQuantity) && targetQuantity > 0
              ? targetQuantity
              : 1,
        })
      "
    >
      <template #settings
        ><button
          v-if="!savedPlan"
          type="button"
          data-testid="production-reestimate"
          @click="reestimate"
          >按现有物资重估本次限额</button
        ><details open class="production-intent-disclosure"
          ><summary data-testid="production-intent-toggle"
            >{{
              cycles === 'continuous'
                ? '持续炼制 · 手动停下或触线即停'
                : cycles === 'target'
                  ? '目标库存 ' +
                    targetQuantity +
                    (targetRepeats ? '' : ' · 最多' + targetCycles + '炉')
                  : cycles + '炉后停'
            }}
            · 调整炉次</summary
          ><div class="production-intent"
            ><label
              >炉次
              <select
                v-model="cycles"
                @change="changeMode"
                aria-label="炼丹炉次"
                ><option value="continuous">持续到手动停下或触线</option
                ><option v-for="n in [1, 5, 20, 50]" :key="n" :value="n"
                  >{{ n }} 炉后停</option
                ><option
                  v-if="
                    typeof cycles === 'number' &&
                    ![1, 5, 20, 50].includes(cycles)
                  "
                  :value="cycles"
                  >{{ cycles }} 炉后停</option
                ><option value="target">库存达到目标即停</option></select
              ></label
            ><template v-if="cycles === 'target'"
              ><label
                >成品库存
                <input
                  v-model.number="targetQuantity"
                  @change="changeCycles"
                  type="number"
                  min="1"
                  :max="C.maxQuantity"
                  aria-label="成品目标库存" /></label
              ><label
                >限制炉次
                <input
                  type="checkbox"
                  :checked="!targetRepeats"
                  @change="
                    targetRepeats = !($event.target as HTMLInputElement).checked
                  "
                  aria-label="炼丹目标另设炉次上限" /></label
              ><label v-if="!targetRepeats"
                >最多
                <input
                  v-model.number="targetCycles"
                  @change="changeCycles"
                  type="number"
                  min="1"
                  max="50"
                  aria-label="目标最多炉次"
                />炉</label
              ></template
            ></div
          ></details
        ></template
      >
    </AlchemyWorkshop>
    <RelicAtelier
      v-else-if="mode === 'forge' && plan.kind === 'forge'"
      :game="game"
      :plan="plan"
      :saved-plan="originalForge?.plan ?? null"
      :rows="paged.rows"
      :catalogue="paged"
      :future="future"
      :busy="busy"
      :available="available"
      :running="running"
      :consumption-warning="consumptionWarning"
      @select="select"
      @page="page = $event"
      @future="
        future = $event;
        changeFuture();
      "
      @material="
        (id) => emit('track', { kind: 'item', id, quantity: need(id) })
      "
      @limits="openLimits()"
      @start="emit('start', plan)"
      @travel="emit('travel', plan)"
      @equip="emit('act', { type: 'EQUIP_RELIC', relic: selected })"
      @navigate="emit('navigate', $event)"
    />
    <div
      v-else
      class="catalogue-empty production-locked"
      data-testid="forge-locked"
      ><AssetImage
        path="art/v2/workshop/furnace-v1.webp"
        asset-id="production-furnace"
        fit="contain"
        aria-hidden="true"
      /><div
        ><small
          >当前{{ ruleContent.realms[game.core.player.realm].name }} ·
          炉火未启</small
        ><strong>引气入体后可炼丹</strong
        ><p>可先翻阅目录，查看不会启炉或消耗物资。</p
        ><button
          @click="
            future = true;
            changeFuture();
          "
          >查看完整目录</button
        ></div
      ></div
    >
    <dialog
      @close="!dialog?.open && back && ((back = false), workshop?.open())"
      ref="dialog"
      class="production-limit-dialog"
      aria-labelledby="production-limits-title"
      ><h3 id="production-limits-title"
        >这段{{ mode === 'craft' ? '炼丹' : '炼器' }}的投入限额</h3
      ><p>只调整待确认安排，点击开始后才保存；材料保留量不会被下一炉消耗。</p
      ><nav
        v-if="mode === 'forge' && originalForge"
        class="forge-plan-views"
        aria-label="铸器安排身份"
        ><button
          data-testid="forge-plan-saved"
          :aria-pressed="forgeRead"
          @click="forgeRead = true"
          >本次打算</button
        ><button
          data-testid="forge-plan-draft"
          :aria-pressed="!forgeRead"
          @click="forgeRead = false"
          >下次选择</button
        ></nav
      >
      <template v-if="mode === 'forge' && forgeRead"
        ><section
          v-if="originalForge"
          class="forge-original-plan"
          data-testid="forge-original-plan"
          :data-activity="originalForge.id"
          :data-run="originalForge.runId"
          ><h3
            >原已保存铸器 ·
            {{ ruleContent.relics[originalForge.plan.relicId].name }}</h3
          ><p
            >最多 {{ originalForge.plan.maxCycles }} 件 · 每件
            {{ originalForge.cycleMs / 1000 }} 秒 · 已完成
            {{ originalForge.completedCycles }}</p
          ><p data-testid="forge-original-budget"
            >累计上限 {{ originalForge.plan.stoneBudget }} 灵石 /
            {{ originalForge.plan.monthBudget }} 月 · 保留
            {{ originalForge.plan.stoneReserve }} 灵石 / 余寿
            {{ originalForge.plan.remainingMonthsReserve }} 月</p
          ><p data-testid="forge-original-spent"
            >实际已用 {{ originalForge.spentStones }} 灵石 /
            {{ originalForge.spentMonths }} 游戏月</p
          ><div class="forge-original-items"
            ><p
              v-for="id in originalItems.rows"
              :key="id"
              :data-testid="'forge-original-item-' + id"
              >{{ ruleContent.items[id].name }} · 单件
              {{
                ruleContent.relics[originalForge.plan.relicId].inputs[id] ?? 0
              }}
              · 原保留 {{ originalForge.plan.itemReserves[id] ?? 0 }} · 实耗
              {{ originalForge.spentItems[id] ?? 0 }}</p
            ></div
          ><CataloguePager
            v-if="originalItems.pages > 1"
            :page="originalItems.page"
            :pages="originalItems.pages"
            :total="originalItems.total"
            label="原铸器物料"
            @change="originalPage = $event"
          /><small>{{
            originalForge.stopReason?.message ??
            '仅查看本次限额，不开始、不扩额。'
          }}</small></section
        ><p v-else>原安排归属已变化，请重新核对；当前没有可确认的本次限额。</p
        ><footer
          ><button @click="closeLimits">返回器物</button
          ><button @click="forgeRead = false">查看下次选择</button></footer
        ></template
      >
      <template v-else
        ><div class="production-limit-fields"
          ><label
            >累计灵石预算<input
              v-model.number="draft.stoneBudget"
              type="number"
              min="0"
              aria-label="累计生产灵石预算" /></label
          ><label
            >灵石至少保留<input
              v-model.number="draft.stoneReserve"
              type="number"
              min="0"
              aria-label="生产灵石保留量" /></label
          ><label
            >累计游戏月预算<input
              v-model.number="draft.monthBudget"
              type="number"
              min="0"
              aria-label="累计生产游戏月预算" /></label
          ><label
            >余寿至少保留<input
              v-model.number="draft.remainingMonthsReserve"
              type="number"
              min="1"
              aria-label="生产余寿保留量" /></label
          ><label
            v-for="id in mode === 'forge'
              ? editableReserves.rows
              : Object.keys(unit?.items ?? {})"
            :key="id"
            >{{ ruleContent.items[id].name }}保留<input
              v-model.number="draft.itemReserves[id]"
              type="number"
              min="0"
              :max="C.maxQuantity"
              :aria-label="
                ruleContent.items[id].name + '保留量'
              " /></label></div
        ><CataloguePager
          v-if="mode === 'forge' && editableReserves.pages > 1"
          :page="editableReserves.page"
          :pages="editableReserves.pages"
          :total="editableReserves.total"
          label="铸器保留量"
          @change="reservePage = $event"
        /><footer
          ><button @click="closeLimits">取消调整</button
          ><button
            class="primary"
            data-testid="production-apply-limits"
            @click="applyLimits"
            >应用这些限额</button
          ></footer
        ></template
      ></dialog
    >
  </section>
</template>
