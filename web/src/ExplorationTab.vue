<script setup lang="ts">
import { computed, inject } from 'vue';
import type { Action } from '../../src/full/types.ts';
import type { useGame } from './store';
import * as C from '../../src/full/content.ts';
import { contentForGame } from '../../src/full/rule-content.ts';
import { useActionView } from './use-action-view';
const store = inject<ReturnType<typeof useGame>>('game-scene')!;
const game = computed(() => store.game!),
  core = computed(() => game.value.core),
  ruleContent = computed(() => contentForGame(game.value));
const { quote, can, why, cost } = useActionView(store);
import BatchPreview from './BatchPreview.vue';
import { planCollection, type CollectionTarget } from '../../src/full/goals.ts';
const props = defineProps<{
  collection: CollectionTarget | null;
  highlight: string;
}>();
const batch = defineModel<number | 'target'>('batch', { required: true }),
  quantity = defineModel<number>('quantity', { required: true });
const emit = defineEmits<{
  act: [action: Action];
  travel: [location: C.LocationId];
}>();
const location = computed(() => C.locations[core.value.world.location]);
const localSources = computed(() =>
  Object.entries(ruleContent.value.sources).filter(
    ([, s]) => s.location === core.value.world.location,
  ),
);
const activeEnemies = computed(() =>
  Object.entries(ruleContent.value.enemies).filter(
    ([, e]) => !e.trial && e.location === core.value.world.location,
  ),
);
const knownItems = computed(() =>
  Object.entries(ruleContent.value.items).filter(
    ([id, item]) =>
      C.rank(item.min) <= C.rank(core.value.player.realm) ||
      core.value.inventory[id] > 0,
  ),
);
const collectionLabel = computed(() =>
  props.collection
    ? (props.collection.kind === 'item'
        ? ruleContent.value.items[props.collection.id].name
        : '灵石') +
      '库存达到 ' +
      props.collection.quantity
    : '从目标来源选取所需物资',
);
const sourceActions = computed<Record<string, Action | null>>(() =>
  Object.fromEntries(
    localSources.value.map(([id]) => [
      id,
      batch.value === 'target'
        ? props.collection
          ? planCollection(game.value, id, props.collection)
          : null
        : ({ type: 'SOURCE', sourceId: id, count: batch.value } as Action),
    ]),
  ),
);
function sourceReason(id: string) {
  const action = sourceActions.value[id];
  if (action) return why(action);
  if (!props.collection)
    return '先从目标来源选取所需物资，或选择固定次数行动。';
  return props.collection.kind === 'stones' &&
    ruleContent.value.sources[id].stones > 0
    ? '灵石目标已经备齐，无需重复委托；可替换目标或选择固定次数。'
    : '此处不产当前目标物资，可切换来源或选择固定次数。';
}
const act = (action: Action) => emit('act', action),
  travel = (location: C.LocationId) => emit('travel', location);
</script>
<template>
  <div class="section-label">历练</div
  ><p class="story">{{ location.description }}</p>
  <div class="locations" tabindex="-1" data-primary-region
    ><button
      v-for="(place, id) in C.locations"
      :key="id"
      :data-testid="`travel-${id}`"
      :class="{ selected: core.world.location === id }"
      :aria-current="core.world.location === id ? 'location' : undefined"
      @click="travel(id)"
      :disabled="!can({ type: 'TRAVEL', location: id })"
      >{{ place.name
      }}<small v-if="core.world.location !== id">{{
        cost({ type: 'TRAVEL', location: id })
      }}</small
      ><small>{{ why({ type: 'TRAVEL', location: id }) }}</small></button
    ></div
  >
  <div class="action-options"
    ><label
      >连续采集/委托
      <select v-model="batch" aria-label="取材次数"
        ><option :value="1">1 次</option
        ><option :value="5">5 次</option
        ><option :value="20">20 次</option
        ><option :value="50">50 次</option
        ><option value="target">达到目标</option></select
      ></label
    ><small v-if="batch === 'target'" data-testid="collection-target">{{
      collectionLabel
    }}</small></div
  >
  <div class="source-grid"
    ><div v-for="[id, source] in localSources" :key="id"
      ><button
        :data-testid="`source-${id}`"
        :class="{ highlight: highlight === `source-${id}` }"
        @click="sourceActions[id] && act(sourceActions[id]!)"
        :disabled="!sourceActions[id] || !can(sourceActions[id]!)"
        ><strong>{{ source.name }}</strong
        ><small>{{
          sourceActions[id] ? cost(sourceActions[id]!) : '本批不会执行'
        }}</small
        ><small v-if="source.stones">灵石 +{{ source.stones }}</small
        ><small v-for="(n, item) in source.items" :key="item"
          >{{ ruleContent.items[item].name }} +{{ n }}</small
        ><small>{{ sourceReason(id) }}</small></button
      ><BatchPreview
        :label="source.name"
        :preview="sourceActions[id] ? quote(sourceActions[id]!) : null"
        :reason="sourceReason(id)" /></div
  ></div>
  <div v-if="activeEnemies.length" class="encounters"
    ><h3>此地挑战</h3
    ><div class="choices two"
      ><button
        v-for="[id, enemy] in activeEnemies"
        :key="id"
        :data-testid="`encounter-${id}`"
        :class="{ highlight: highlight === `encounter-${id}` }"
        @click="act({ type: 'ENCOUNTER', enemy: id })"
        :disabled="!can({ type: 'ENCOUNTER', enemy: id })"
        ><strong>{{ enemy.name }}</strong
        ><small>气血 {{ enemy.hp }} · 胜利后取得奖励</small
        ><small>{{ why({ type: 'ENCOUNTER', enemy: id }) }}</small></button
      ></div
    ></div
  >
  <div v-if="core.world.location === 'market'" class="market"
    ><label
      >每次采购数量
      <input
        type="number"
        min="1"
        :max="C.maxQuantity"
        v-model.number="quantity"
        aria-label="采购数量" /></label
    ><div class="market-row" v-for="[id, item] in knownItems" :key="id"
      ><div
        ><strong>{{ item.name }}</strong
        ><small>{{ item.description }}</small></div
      ><button
        :data-testid="`buy-${id}`"
        :class="{ highlight: highlight === `buy-${id}` }"
        @click="act({ type: 'BUY', item: id, quantity })"
        :disabled="!can({ type: 'BUY', item: id, quantity })"
        >购入 · {{ cost({ type: 'BUY', item: id, quantity })
        }}<small>{{ why({ type: 'BUY', item: id, quantity }) }}</small></button
      ></div
    ></div
  >
</template>
