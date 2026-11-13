<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import type { useGame } from './store';
import { formatCosts, formatDelta } from './presentation';
import CataloguePager from './CataloguePager.vue';
import { activityView } from './activity-view';
import { playerCopy } from './player-copy';
const props = defineProps<{ store: ReturnType<typeof useGame> }>();
const history = shallowRef<Awaited<
    ReturnType<ReturnType<typeof useGame>['loadActivityHistory']>
  > | null>(null),
  error = ref(''),
  loading = ref(false);
const totals = computed(() => {
  const a = props.store.activity;
  return a?.version === 6
    ? [
        `入场 ${a.encountersStarted} · 完成 ${a.completedCycles} 次动作 · 耗时 ${a.spentMonths} 游戏月`,
        ...activityView(a, props.store.game).summary,
      ]
    : [];
});
let token = 0,
  requestedPage = 0;
async function load(page = requestedPage) {
  requestedPage = page;
  const id = props.store.activity?.id,
    run = props.store.game?.core.runId,
    owner = ++token;
  error.value = '';
  if (!id) {
    history.value = null;
    return;
  }
  loading.value = true;
  try {
    const result = await props.store.loadActivityHistory(id, page);
    if (owner === token && run === props.store.game?.core.runId) {
      history.value = result;
      requestedPage = result.page;
    }
  } catch (value) {
    if (owner === token)
      error.value = value instanceof Error ? value.message : String(value);
  } finally {
    if (owner === token) loading.value = false;
  }
}
watch(
  [
    () => props.store.activity?.id,
    () => props.store.activity?.completedCycles,
    () => props.store.game?.core.runId,
  ],
  ([id, , run], before) => {
    const replaced = !before || before[0] !== id || before[2] !== run;
    if (replaced) {
      history.value = null;
      requestedPage = 0;
    }
    void load();
  },
  { immediate: true },
);
const moveName: Record<string, string> = {
  attack: '普通攻击',
  guard: '凝神护体',
  technique: '起手术法',
  release: '终结术法',
  heal: '回春丹',
  restore: '回灵丹',
  flee: '撤退',
};
</script>
<template>
  <section
    class="adventure-history"
    :class="{ 'history-folded': !!history?.folded }"
    data-testid="adventure-history"
    aria-label="本安排逐次记录"
  >
    <h2
      >{{ playerCopy.battleHistory }}
      <span v-if="loading" class="small" role="status">读取记录…</span></h2
    ><p class="small">每次交锋的投入与所得都记在这里。</p>
    <p class="history-totals small" data-testid="adventure-history-totals"
      ><strong>本段累计</strong
      ><span v-for="row in totals" :key="row">{{ row }}</span></p
    >
    <p v-if="error" role="alert"
      >{{ error }} <button @click="load()">重新读取</button></p
    >
    <template v-if="history"
      ><p
        v-if="history.folded"
        class="small"
        data-testid="adventure-history-folded"
        >较早 {{ history.folded }} 次明细已归入累计；可翻阅最近
        {{ history.retained }} 次，本段共完成 {{ history.total }} 次。</p
      >
      <div class="adventure-history-grid"
        ><article v-for="row in history.rows" :key="row.command.commandId"
          ><strong
            >第 {{ row.activity.completedCycles }} 次 ·
            {{
              row.command.type === 'BATTLE'
                ? moveName[row.command.move]
                : row.command.type === 'TRAVEL'
                  ? '抵达目的地'
                  : '遭遇入场'
            }}</strong
          ><p>{{ formatDelta(row.result.delta) }}</p
          ><small>实际投入：{{ formatCosts(row.result.costs) }}</small
          ><p
            v-if="row.activity.version === 6 && row.command.type === 'BATTLE'"
            class="small"
            >{{
              row.activity.decisionGame.battle
                ? '敌方气血 ' +
                  row.activity.decisionGame.battle.hp +
                  ' · 已交锋 ' +
                  row.activity.decisionGame.battle.round +
                  ' 回合'
                : '此场交锋已结束'
            }}
            · {{ row.activity.stopReason?.message ?? '按已定战策继续' }}</p
          ></article
        ></div
      ><p v-if="!history.total">尚无已保存周期。</p
      ><CataloguePager
        :page="history.page"
        :pages="history.pages"
        :total="history.retained"
        label="逐次记录"
        @change="load($event)"
    /></template>
  </section>
</template>
<style scoped>
@layer game {
  .adventure-history {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    font-size: 18px;
    line-height: 1.5;
  }
  .adventure-history h2 {
    font-size: var(--ui20);
    margin: 0;
  }
  .adventure-history-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    align-content: start;
  }
  .adventure-history article {
    min-width: 0;
    padding: 10px 12px;
    border-inline-start: 2px solid var(--palette-jade);
    background: var(--palette-panel);
    color: var(--palette-ink);
    overflow-wrap: anywhere;
  }
  .adventure-history p {
    margin: 5px 0;
  }
  .adventure-history small,
  .adventure-history .small {
    font-size: var(--ui14);
    line-height: 1.5;
  }
  .adventure-history > .catalogue-pager {
    margin-top: auto;
    flex: none;
  }
  .adventure-history button {
    min-height: 44px;
  }
  .history-totals {
    display: flex;
    flex-wrap: wrap;
    gap: 3px 16px;
    padding: 5px 10px;
    background: var(--palette-panel);
    border-left: 2px solid var(--palette-jade);
  }
  .history-totals strong {
    font-size: 18px;
  }
  .adventure-history.history-folded {
    gap: 6px;
  }
  .adventure-history.history-folded .adventure-history-grid {
    gap: 8px;
  }
  .adventure-history.history-folded article {
    padding: 8px 12px;
  }
  .adventure-history.history-folded p {
    margin: 4px 0;
  }
}
</style>
