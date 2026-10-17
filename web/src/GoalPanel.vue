<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import GameIcon from './GameIcon.vue';
import * as C from '../../src/full/content.ts';
import { availableEvents } from '../../src/full/engine.ts';
import { stories } from '../../src/full/events.ts';
import { getTrackedGoal, parseTrackingTarget, type TrackingTarget, type CollectionTarget } from '../../src/full/goals.ts';
import { getActionResources, getCurrencySources, previewAction, type ItemSource, type ResourceDeficit } from '../../src/full/queries.ts';
import type { Action, Game } from '../../src/full/types.ts';
import type { NavigationRequest } from './navigation';
import { formatCosts, resourceName } from './presentation';

const helpOpen=ref(false);
const props = defineProps<{ game: Game; target: TrackingTarget; enabled: boolean; notice: string }>();
const emit = defineEmits<{ select: [TrackingTarget]; navigate: [NavigationRequest]; preparation: [Action | null] }>();
type Focus = { kind: 'item'; id: string; quantity: number } | { kind: 'currency'; quantity: number } | { kind: 'action'; action: Action; title: string };
const stack = shallowRef<Focus[]>([]), focus = computed(() => stack.value.at(-1));
const preparation = computed(() => [...stack.value].reverse().find(entry => entry.kind === 'action')?.action ?? null);
watch(preparation, action => emit('preparation', action));
const goal = computed(() => getTrackedGoal(props.game, props.target));
watch([() => props.target, () => props.game.core.runId], () => { stack.value = []; });
watch(() => props.game.core.player.realm, () => { if (props.target.kind === 'breakthrough') stack.value = []; });
const selected = computed(() => props.target.kind === 'breakthrough' ? 'breakthrough' : `${props.target.kind}:${props.target.id}`);
function select(event: Event) {
  const [kind, id] = (event.target as HTMLSelectElement).value.split(':');
  emit('select', kind === 'breakthrough' ? { kind } : kind === 'item' ? { kind, id, quantity: 1 } : { kind: kind as 'skill' | 'relic' | 'event', id });
}
function quantityChange(event: Event) {
  if (props.target.kind !== 'item') return;
  const input = event.target as HTMLInputElement, target = { ...props.target, quantity: Number(input.value) };
  try { parseTrackingTarget(target); }
  catch { input.value = String(props.target.quantity); }
  emit('select', target);
}
const locationPreview = computed(() => {
  const location = (actionView.value?.preview ?? goal.value.preview)?.requirements.location;
  return location && location !== props.game.core.world.location ? previewAction(props.game, { type: 'TRAVEL', location }) : null;
});
const knownEvents = computed(() => [...new Set([...availableEvents(props.game).map(event => event.id),
  ...Object.keys(props.game.choices), ...(props.target.kind === 'event' ? [props.target.id] : []),
  ...(props.game.core.activeEvent && stories[props.game.core.activeEvent.id] ? [props.game.core.activeEvent.id] : [])])]);
const itemView = computed(() => focus.value?.kind === 'item' ? getTrackedGoal(props.game, focus.value) : null);
const actionView = computed(() => focus.value?.kind === 'action' ? getActionResources(props.game, focus.value.action) : null);
const needs = computed(() => focus.value ? actionView.value?.preview.deficits ?? [] : goal.value.deficits);
const sources = computed(() => itemView.value?.sources ?? (focus.value?.kind === 'currency' ? getCurrencySources(props.game) : []));
const focusTitle = computed(() => focus.value?.kind === 'item' ? `${C.items[focus.value.id].name}来源` : focus.value?.kind === 'currency' ? '灵石来源' : focus.value?.title);
const kinds = { source: '稳定来源', recipe: '自行炼制', purchase: '坊市采购', battle: '斗法所得', event: '一次性机缘' };
function inspect(gap: ResourceDeficit) {
  if (gap.kind === 'item' && gap.id) stack.value = [...stack.value, { kind: 'item', id: gap.id, quantity: gap.required }];
  else if (gap.kind === 'stones') stack.value = [...stack.value, { kind: 'currency', quantity: gap.required }];
  else if (['xp', 'hp', 'mp'].includes(gap.kind)) emit('navigate', { location: 'cave', tab: '修行' });
}
function ingredients(source: ItemSource) {
  const action = source.steps.at(-1)!;
  stack.value = [...stack.value, { kind: 'action', action, title: source.label }];
}
function collection(): CollectionTarget | undefined {
  const current = focus.value;
  return current?.kind === 'item' ? { kind: 'item', id: current.id, quantity: current.quantity } :
    current?.kind === 'currency' ? { kind: 'stones', quantity: current.quantity } : undefined;
}
function goSource(source: ItemSource) {
  emit('navigate', { location: source.location,
    tab: source.kind === 'recipe' ? '行囊' : source.kind === 'event' ? '仙缘' : '历练',
    focusId: `${source.kind === 'source' ? 'source' : source.kind === 'recipe' ? 'craft' : source.kind === 'purchase' ? 'buy' : source.kind === 'battle' ? 'encounter' : 'event'}-${source.kind === 'event' ? source.id.split(':')[0] : source.id}`,
    ...(source.kind === 'purchase' ? { quantity: source.rewardCount } : {}),
    ...(source.kind === 'source' ? { collection: collection() } : {}) });
}
const canGo = (source: ItemSource) => props.enabled && (!source.navigation || previewAction(props.game, source.navigation).allowed);
const goReason = (source: ItemSource) => source.navigation ? previewAction(props.game, source.navigation).failure?.message : '';
function goalLocation() {
  const action = focus.value?.kind === 'action' ? focus.value.action : goal.value.action;
  const location = (action ? previewAction(props.game, action).requirements.location : null);
  if (location) emit('navigate', { location, tab: action?.type === 'CRAFT' ? '行囊' : action?.type === 'EVENT' ? '仙缘' : '修行',
    ...(action?.type === 'CRAFT' ? { focusId: `craft-${action.recipeId}` } : action?.type === 'LEARN' ? { focusId: `learn-${action.skill}` } : action?.type === 'FORGE' ? { focusId: `forge-${action.relic}` } : {}) });
}
</script>

<template>
  <section id="goal-panel" tabindex="-1" class="paper goals" data-testid="goal-panel">
    <div class="section-label">当前目标 <button class="icon-button" type="button" aria-label="目标追踪帮助" :aria-expanded="helpOpen" aria-controls="goal-help" @click="helpOpen=!helpOpen"><GameIcon kind="action" id="help"/><span>帮助</span></button></div><p v-if="helpOpen" id="goal-help" class="small">目标展示真实缺口和可达来源。前往只旅行或定位，采购、采集和炼制仍需另行确认。查看不消耗游戏月，也不预留材料。</p><h3 data-testid="target">{{goal.title}}</h3>
    <label class="goal-picker">替换追踪目标<select :value="selected" @change="select" data-testid="goal-select" aria-label="追踪目标">
      <option value="breakthrough">下一突破</option>
      <optgroup label="物资"><option v-for="(item,id) in C.items" :key="id" :value="`item:${id}`">{{item.name}} · {{C.realms[item.min].name}}</option></optgroup>
      <optgroup label="功法"><option v-for="(skill,id) in C.skills" :key="id" :value="`skill:${id}`">{{skill.name}} · {{C.realms[skill.min].name}}</option></optgroup>
      <optgroup label="法宝"><option v-for="(relic,id) in C.relics" :key="id" :value="`relic:${id}`">{{relic.name}} · 金丹</option></optgroup>
      <optgroup v-if="knownEvents.length" label="已见仙缘"><option v-for="id in knownEvents" :key="id" :value="`event:${id}`">{{stories[id].name}}</option></optgroup>
    </select></label>
    <label v-if="target.kind==='item'" class="goal-quantity">目标库存 <input aria-label="目标数量" type="number" min="1" :max="C.maxQuantity" :value="target.quantity" @change="quantityChange"></label>
    <p class="small muted">追踪不消耗游戏月，也不预留材料。</p><p v-if="notice" class="small" role="status">{{notice}}</p>
    <p v-if="goal.completed" data-testid="goal-complete" class="small">目标已达成，可替换追踪目标。</p>
    <p v-else-if="goal.preview?.failure" class="small" data-testid="goal-blocker">{{goal.preview.failure.message}}</p>
    <button v-if="target.kind==='item'" class="text-button" data-testid="goal-item-sources" @click="stack=[{...target}]">查看获得方式 →</button>
    <div v-if="focus" class="source-details" data-testid="source-details">
      <div class="source-breadcrumb"><button data-testid="source-back" @click="stack=stack.slice(0,-1)"><GameIcon kind="action" id="back"/> 返回{{stack.length>1?'上一层':'目标'}}</button><button @click="stack=[]">回到目标</button></div>
      <h4 data-testid="source-title">{{focusTitle}}</h4>
      <p v-if="focus.kind==='item'" class="small">当前 {{game.core.inventory[focus.id]}} / {{focus.quantity}} <span v-if="itemView?.completed">· 已备齐，无需重复收集</span></p>
      <p v-if="focus.kind==='currency'" class="small">当前灵石 {{game.core.player.stones}} / {{focus.quantity}}</p>
      <p v-if="actionView" class="small" data-testid="plan-cost">每次成本：{{formatCosts(actionView.preview.costs)}}</p>
      <p v-if="actionView?.preview.failure" class="small">{{actionView.preview.failure.message}}</p>
    </div>
    <div v-for="gap in needs" :key="gap.kind+gap.id" class="goal-line" :data-testid="`need-${gap.id??gap.kind}`"><span>○</span><div>{{resourceName(gap)}}<small>{{gap.have}} / {{gap.required}} · 尚缺 {{gap.missing}}</small>
      <button v-if="gap.kind!=='months'" class="text-button" :data-testid="`inspect-${gap.id??gap.kind}`" @click="inspect(gap)">{{gap.kind==='item'||gap.kind==='stones'?'查看来源':'前往洞府'}} →</button>
    </div></div>
    <div v-for="source in sources" :key="source.kind+source.id" class="source-card" :data-testid="`route-${source.kind}-${source.id}`">
      <strong>{{source.label}}</strong><small>{{kinds[source.kind]}} · {{C.locations[source.location].name}}</small>
      <small>每份{{source.conditionalOnVictory?'胜利后':''}}获得 {{source.rewardCount}} {{source.resource.kind==='item'?C.items[source.resource.id].name:'灵石'}}{{source.conditionalOnVictory?'；补给与战损另计':''}}</small>
      <small>准备与行动成本：{{formatCosts(source.costs)}}</small>
      <small v-if="source.failure" data-testid="route-blocker">{{source.failure.message}}</small>
      <button v-if="source.kind==='recipe'||source.kind==='purchase'||source.deficits.length" class="text-button" :data-testid="`plan-${source.kind}-${source.id}`" @click="ingredients(source)">查看筹备缺口 →</button>
      <button :data-testid="`go-${source.kind}-${source.id}`" @click="goSource(source)" :disabled="!canGo(source)">{{source.navigation?'前往':'查看此地行动'}}</button>
      <small v-if="goReason(source)">{{goReason(source)}}</small>
    </div>
    <p v-if="actionView && !needs.length" class="small">物资已齐；前往对应地点后另行确认行动。</p>
    <button v-if="(actionView?.preview??goal.preview)?.requirements.location && (!focus||actionView)" class="text-button" @click="goalLocation" :disabled="!enabled || !!locationPreview && !locationPreview.allowed">前往{{C.locations[(actionView?.preview??goal.preview)!.requirements.location!].name}} →</button>
    <small v-if="(!focus||actionView) && locationPreview?.failure">{{locationPreview.failure.message}}</small>
    <p v-if="!focus && !goal.deficits.length && !goal.completed" class="small">{{goal.preview?.allowed?'准备已齐，按当前页面确认行动。':'先处理眼前的遭遇，目标会随实际进度更新。'}}</p>
  </section>
</template>
