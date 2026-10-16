<script setup lang="ts">
import { computed } from 'vue';
import * as C from '../../src/full/content.ts';
import { getGrowthStage } from '../../src/full/growth.ts';
import type { Game } from '../../src/full/types.ts';
import type { ItemSource } from '../../src/full/queries.ts';
import type { TrackingTarget } from '../../src/full/goals.ts';
import type { NavigationRequest } from './navigation';
import { formatCosts } from './presentation';

const props = defineProps<{ game: Game; enabled: boolean }>();
const emit = defineEmits<{ navigate: [NavigationRequest]; track: [TrackingTarget] }>();
const stage = computed(() => getGrowthStage(props.game));
const canGo = (source: ItemSource) => props.enabled && (!source.navigation || !!source.previews[0]?.allowed);
function go(source: ItemSource, item: string, quantity: number) {
  emit('navigate', { location: source.location, tab: '历练', focusId: `${source.kind === 'purchase' ? 'buy' : 'source'}-${source.id}`,
    ...(source.kind === 'purchase' ? { quantity: source.rewardCount } : { collection: { kind: 'item', id: item, quantity } }) });
}
</script>

<template>
  <section class="paper growth-panel" data-testid="growth-panel">
    <div class="section-label">本境筹备 <span>只查看不会推进年月</span></div>
    <h3 data-testid="growth-title">{{stage.title}} · {{stage.goal.title}}</h3>
    <p class="small muted"><span v-if="stage.reachedAt!==null" data-testid="realm-milestone">本境记录：第 {{stage.reachedAt}} 游戏月。</span> 剩余寿元 {{stage.remainingMonths}} 游戏月，只有行动才推进。</p>
    <p v-if="stage.locations.length" class="small">本境可进入：{{stage.locations.map(location=>location.name).join('、')}}。前往仍须由你选择。</p>
    <template v-if="stage.pill">
      <p class="small" data-testid="growth-pill">突破物 · {{C.items[stage.pill].name}} {{stage.pillHave}} / {{stage.quantity}}</p>
      <p v-if="stage.pillReady" class="small" data-testid="growth-pill-ready">突破物已备齐，无需为它重复取材；修为、地点和其他条件仍按实际状态确认。</p>
      <template v-for="recipe in stage.recipes" :key="recipe.id">
        <div class="growth-recipe"><strong>{{recipe.label}}</strong><small>完整成本：{{formatCosts(recipe.preview.costs)}}</small></div>
        <article v-for="material in recipe.materials" :key="material.id" class="growth-material" :data-testid="`growth-material-${material.id}`">
          <h4>{{C.items[material.id].name}} · 本配方最高阶材料</h4><p class="small">{{material.have}} / {{material.required}} · {{material.missing ? `尚缺 ${material.missing}` : '已备齐'}}；其余材料与灵石见完整筹备。</p>
          <div v-if="material.missing" class="growth-routes">
            <div v-for="source in material.sources" :key="source.kind+source.id" :data-testid="`growth-route-${source.kind}-${source.id}`">
              <strong>{{source.label}}</strong><small>{{source.kind==='source'?'确定来源':'采购替代'}} · {{C.locations[source.location].name}} · 每次获得 {{source.rewardCount}}</small>
              <small>准备与行动成本：{{formatCosts(source.costs)}}</small><small v-if="source.failure">{{source.failure.message}}</small>
              <button :data-testid="`growth-go-${source.kind}-${source.id}`" :disabled="!canGo(source)" @click="go(source,material.id,material.required)">{{source.navigation?'前往':'查看此地行动'}}</button>
            </div>
          </div>
        </article>
      </template>
      <button class="text-button" data-testid="growth-track-breakthrough" @click="emit('track',{kind:'breakthrough'})">查看并追踪完整突破筹备 →</button>
    </template>
    <p v-else class="small">{{stage.goal.title}}。境界由修为、物品与实际行动决定。</p>
  </section>
</template>
