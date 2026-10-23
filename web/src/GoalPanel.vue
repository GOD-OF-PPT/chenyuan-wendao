<script setup lang="ts">
import ProgressTrack from './ProgressTrack.vue';
import CataloguePager from './CataloguePager.vue';
import {pageSlice} from './play-flow';
import { computed, ref, shallowRef, watch,onMounted,onScopeDispose } from 'vue';
import GameIcon from './GameIcon.vue';
import GoalBoard from './GoalBoard.vue';
import * as C from '../../src/full/content.ts';
import { availableEvents } from '../../src/full/engine.ts';
import { stories } from '../../src/full/events.ts';
import { getTrackedGoal, parseTrackingTarget, type TrackingTarget, type CollectionTarget } from '../../src/full/goals.ts';
import { getActionResources, getCurrencySources, previewAction, type ItemSource, type ResourceDeficit } from '../../src/full/queries.ts';
import type { Action, Game } from '../../src/full/types.ts';
import {gamePhase} from '../../src/full/contracts.ts';
import type { NavigationRequest } from './navigation';
import { formatCosts, resourceName } from './presentation';

const needIndex=ref(0),sourceIndex=ref(0),pagerMedia=window.matchMedia('(max-width:1099px)'),compact=ref(pagerMedia.matches);
function resized(){compact.value=pagerMedia.matches;sourceIndex.value=0;}onMounted(()=>pagerMedia.addEventListener('change',resized));onScopeDispose(()=>pagerMedia.removeEventListener('change',resized));
const helpOpen=ref(false),managerOpen=ref(false),moreNeedsOpen=ref(false);
const props = defineProps<{ game: Game; target: TrackingTarget; enabled: boolean; notice: string; writeBlocked?: boolean }>();
const emit = defineEmits<{ select: [TrackingTarget]; navigate: [NavigationRequest]; preparation: [Action | null] }>();
type Focus = { kind: 'item'; id: string; quantity: number } | { kind: 'currency'; quantity: number } | { kind: 'action'; action: Action; title: string };
const stack = shallowRef<Focus[]>([]), focus = computed(() => stack.value.at(-1));
const preparation = computed(() => [...stack.value].reverse().find(entry => entry.kind === 'action')?.action ?? null);
watch(preparation, action => emit('preparation', action));
const goal = computed(() => getTrackedGoal(props.game, props.target));
watch([() => props.target, () => props.game.core.runId], () => { stack.value = []; moreNeedsOpen.value=false; });
watch(()=>props.game.core.runId,()=>managerOpen.value=false);
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
const needPage=computed(()=>pageSlice(needs.value,needIndex.value,1));
const primaryNeeds=computed(()=>needPage.value.rows);
watch([()=>props.target,()=>props.game.core.runId,focus],()=>{needIndex.value=0;sourceIndex.value=0;});
const caveTravel=computed(()=>previewAction(props.game,{type:'TRAVEL',location:'cave'}));
const resourceGap=(gap:ResourceDeficit)=>gap.kind==='item'||gap.kind==='stones';
const canInspect=(gap:ResourceDeficit)=>resourceGap(gap)||props.enabled&&(props.game.core.world.location==='cave'||!props.writeBlocked&&caveTravel.value.allowed);
const inspectLabel=(gap:ResourceDeficit)=>resourceGap(gap)?'查看来源':props.game.core.world.location==='cave'?(gamePhase(props.game)==='idle'?'查看修行动作':'查看当前遭遇'):'前往洞府';
const currentAction=computed(()=>focus.value?.kind==='action'?focus.value.action:goal.value.action);
const destination=computed(()=>(actionView.value?.preview??goal.value.preview)?.requirements.location);
const showLocation=computed(()=>!!destination.value&&(!focus.value||!!actionView.value)&&!(!focus.value&&destination.value==='cave'&&needs.value.some(gap=>['xp','hp','mp'].includes(gap.kind))));
const locationLabel=computed(()=>destination.value&&destination.value!==props.game.core.world.location?`前往${C.locations[destination.value].name}`:({CRAFT:'查看炼制动作',LEARN:'查看研习动作',FORGE:'查看法宝炼制',EVENT:'查看当前仙缘',BREAKTHROUGH:'查看突破动作',START_TRIAL:'查看渡劫准备入口'}as Record<string,string>)[currentAction.value?.type??'']??'查看此地行动');
const sources = computed(() => itemView.value?.sources ?? (focus.value?.kind === 'currency' ? getCurrencySources(props.game) : []));
const sourcePage=computed(()=>pageSlice(sources.value,sourceIndex.value,compact.value?1:2));
const focusTitle = computed(() => focus.value?.kind === 'item' ? `${C.items[focus.value.id].name}来源` : focus.value?.kind === 'currency' ? '灵石来源' : focus.value?.title);
const kinds = { source: '稳定来源', recipe: '自行炼制', purchase: '坊市采购', battle: '斗法所得', event: '一次性机缘' };
function inspect(gap: ResourceDeficit) {
  if (gap.kind === 'item' && gap.id) stack.value = [...stack.value, { kind: 'item', id: gap.id, quantity: gap.required }];
  else if (gap.kind === 'stones') stack.value = [...stack.value, { kind: 'currency', quantity: gap.required }];
  else if (['xp', 'hp', 'mp'].includes(gap.kind)) emit('navigate', { location: 'cave', tab: '修行', ...(gamePhase(props.game)==='idle'?{focusId:'cultivation-actions'}:{}) });
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
const canGo = (source: ItemSource) => props.enabled && (!source.navigation || !props.writeBlocked&&previewAction(props.game, source.navigation).allowed);
const goReason = (source: ItemSource) => source.navigation ? props.writeBlocked?'先处理原安排或重新读取':previewAction(props.game, source.navigation).failure?.message : '';
function goalLocation() {
  const action = focus.value?.kind === 'action' ? focus.value.action : goal.value.action;
  const location = (action ? previewAction(props.game, action).requirements.location : null);
  if (location) emit('navigate', { location, tab: action?.type === 'CRAFT' ? '行囊' : action?.type === 'EVENT' ? '仙缘' : '修行',
    ...(action?.type === 'CRAFT' ? { focusId: `craft-${action.recipeId}` } : action?.type === 'LEARN' ? { focusId: `learn-${action.skill}` } : action?.type === 'FORGE' ? { focusId: `forge-${action.relic}` } : action?.type==='BREAKTHROUGH'||action?.type==='START_TRIAL'?{focusId:'breakthrough'}:{}) });
}
const boardObject=computed(()=>{const f=focus.value;if(f?.kind==='currency')return{kind:'stones' as const,id:'stones'};if(f?.kind==='item')return{kind:'item' as const,id:f.id};if(f?.kind==='action'){const a=f.action;return a.type==='CRAFT'?{kind:'item' as const,id:C.recipes[a.recipeId].output}:a.type==='BUY'?{kind:'item' as const,id:a.item}:{kind:'breakthrough' as const,id:''};}const t=props.target;return{kind:t.kind,id:t.kind==='breakthrough'?C.realms[props.game.core.player.realm].pill??'':t.id};});
const boardReady=computed(()=>focus.value?.kind==='item'?!!itemView.value?.completed:focus.value?.kind==='currency'?props.game.core.player.stones>=focus.value.quantity:focus.value?!!actionView.value?.preview.allowed:goal.value.completed||!!goal.value.preview?.allowed);
</script>

<template>
  <section id="goal-panel" tabindex="-1" class="goals play-catalogue" data-testid="goal-panel">
    <div v-show="!focus" class="goal-board-tools"><button class="icon-button" type="button" aria-label="目标追踪帮助" :aria-expanded="helpOpen" aria-controls="goal-help" @click="helpOpen=!helpOpen"><GameIcon kind="action" id="help"/><span>帮助</span></button></div><p v-if="helpOpen" id="goal-help" class="small">目标展示真实缺口和可达来源。前往只旅行或定位，采购、采集和炼制仍需另行确认。查看不消耗游戏月，也不预留材料。</p>
    <GoalBoard v-if="!managerOpen" :title="focus?focusTitle??'筹备来源':goal.title" :kind="boardObject.kind" :id="boardObject.id" :detail="!focus&&target.kind==='breakthrough'&&boardObject.id?C.items[boardObject.id].name+' · 实有 '+game.core.inventory[boardObject.id]:undefined" :ready="boardReady" :title-test-id="focus?'source-title':'target'" :state="boardReady?'当前条件已具备':'按所缺逐项筹备'" :inspect-id="target.kind==='item'&&!focus?'goal-item-sources':undefined" inspect-label="查看获得方式" @inspect="target.kind==='item'&&(stack=[{...target}])">
      <template #context>
        <ProgressTrack v-if="target.kind==='breakthrough'&&!focus&&game.status==='active'&&C.realms[game.core.player.realm].xpCap>0" class="goal-progress" :value="game.core.player.xp" :max="C.realms[game.core.player.realm].xpCap" label="当前目标修为" :identity="game.core.runId+game.core.player.realm" hint="修为圆满不代表准备齐全；查看目标缺口可找到当前境界的来源。"/>
        <p v-if="notice" class="small" role="status">{{notice}}</p>
        <p v-if="goal.completed" data-testid="goal-complete" class="small">目标已达成，可替换追踪目标。</p>
        <p v-else-if="goal.preview?.failure" class="small" data-testid="goal-blocker">{{goal.preview.failure.message}}</p>
      </template>
      <template v-if="focus||needs.length" #conditions>
        <div v-if="focus" class="source-details" data-testid="source-details">
          <div class="source-breadcrumb"><button data-testid="source-back" @click="stack=stack.slice(0,-1)"><GameIcon kind="action" id="back"/> 返回{{stack.length>1?'上一层':'目标'}}</button><button @click="stack=[]">回到目标</button></div>
          <p v-if="focus.kind==='item'" class="small">当前 {{game.core.inventory[focus.id]}} / {{focus.quantity}} <span v-if="itemView?.completed">· 已备齐，无需重复收集</span></p>
          <p v-if="focus.kind==='currency'" class="small">当前灵石 {{game.core.player.stones}} / {{focus.quantity}}</p>
          <p v-if="actionView" class="small" data-testid="plan-cost">每次成本：{{formatCosts(actionView.preview.costs)}}</p>
          <p v-if="actionView?.preview.failure" class="small">{{actionView.preview.failure.message}}</p>
        </div>
        <div v-for="gap in primaryNeeds" :key="gap.kind+gap.id" class="goal-line" :data-testid="`need-${gap.id??gap.kind}`"><span><GameIcon v-if="gap.kind==='item'&&gap.id" kind="item" :id="gap.id"/><GameIcon v-else kind="nav" :id="gap.kind==='stones'?'inventory':'cultivate'"/></span><div>{{resourceName(gap)}}<small>{{gap.have}} / {{gap.required}} · 尚缺 {{gap.missing}}</small>
          <button v-if="gap.kind!=='months'" class="text-button" :data-testid="`inspect-${gap.id??gap.kind}`" @click="inspect(gap)" :disabled="!canInspect(gap)">{{inspectLabel(gap)}} →</button>
          <small v-if="!resourceGap(gap)&&gap.kind!=='months'&&game.core.world.location!=='cave'">{{formatCosts(caveTravel.costs)}}</small><small v-if="!canInspect(gap)">{{!enabled?'等待存档就绪':writeBlocked&&game.core.world.location!=='cave'?'先处理原安排或重新读取':caveTravel.failure?.message}}</small>
        </div></div>
        <CataloguePager v-if="needPage.pages>1" :page="needPage.page" :pages="needPage.pages" :total="needPage.total" label="目标条件" @change="needIndex=$event"/>
      </template>
      <template v-if="sources.length" #routes>
        <div class="goal-source-grid">
          <div v-for="source in sourcePage.rows" :key="source.kind+source.id" class="source-card" :data-testid="`route-${source.kind}-${source.id}`">
            <strong>{{source.label}}</strong><small>{{kinds[source.kind]}} · {{C.locations[source.location].name}}</small>
            <small>每份{{source.conditionalOnVictory?'胜利后':''}}获得 {{source.rewardCount}} {{source.resource.kind==='item'?C.items[source.resource.id].name:'灵石'}}{{source.conditionalOnVictory?'；补给与战损另计':''}}</small>
            <small>准备与行动成本：{{formatCosts(source.costs)}}</small>
            <small v-if="source.failure" data-testid="route-blocker">{{source.failure.message}}</small>
            <button v-if="source.kind==='recipe'||source.kind==='purchase'||source.deficits.length" class="text-button" :data-testid="`plan-${source.kind}-${source.id}`" @click="ingredients(source)">查看筹备缺口 →</button>
            <button :data-testid="`go-${source.kind}-${source.id}`" @click="goSource(source)" :disabled="!canGo(source)">{{source.navigation?'前往'+C.locations[source.location].name:'查看此地行动'}}</button>
            <small v-if="goReason(source)">{{goReason(source)}}</small>
          </div>
        </div><CataloguePager :page="sourcePage.page" :pages="sourcePage.pages" :total="sourcePage.total" label="目标来源" @change="sourceIndex=$event"/>
      </template>
      <template #decision>
        <p v-if="actionView && !needs.length" class="small">物资已齐；前往对应地点后另行确认行动。</p>
        <button v-if="showLocation" class="text-button goal-location" data-testid="goal-location" :data-navigation-kind="locationPreview?'travel':'view'" @click="goalLocation" :disabled="!enabled || !!locationPreview && (writeBlocked||!locationPreview.allowed)">{{locationLabel}} →<small v-if="locationPreview">{{formatCosts(locationPreview.costs)}}</small></button>
        <small v-if="showLocation&&locationPreview&&(writeBlocked||locationPreview.failure)">{{writeBlocked?'先处理原安排或重新读取':locationPreview.failure?.message}}</small>
        <p v-if="!focus && !goal.deficits.length && !goal.completed" class="small">{{goal.preview?.allowed?'准备已齐，按当前页面确认行动。':'先处理眼前的遭遇，目标会随实际进度更新。'}}</p>
      </template>
    </GoalBoard>
    <details v-if="!focus" class="goal-management" data-testid="goal-management" :open="managerOpen" @toggle="managerOpen=($event.target as HTMLDetailsElement).open"><summary data-testid="goal-management-toggle">{{managerOpen?'完成编辑，返回目标':'更换追踪目标'}}</summary>
      <label class="goal-picker">替换追踪目标<select :value="selected" @change="select" data-testid="goal-select" aria-label="追踪目标">
        <option value="breakthrough">下一突破</option>
        <optgroup label="物资"><option v-for="(item,id) in C.items" :key="id" :value="`item:${id}`">{{item.name}} · {{C.realms[item.min].name}}</option></optgroup>
        <optgroup label="功法"><option v-for="(skill,id) in C.skills" :key="id" :value="`skill:${id}`">{{skill.name}} · {{C.realms[skill.min].name}}</option></optgroup>
        <optgroup label="法宝"><option v-for="(relic,id) in C.relics" :key="id" :value="`relic:${id}`">{{relic.name}} · 金丹</option></optgroup>
        <optgroup v-if="knownEvents.length" label="已见仙缘"><option v-for="id in knownEvents" :key="id" :value="`event:${id}`">{{stories[id].name}}</option></optgroup>
      </select></label>
      <label v-if="target.kind==='item'" class="goal-quantity">目标库存 <input aria-label="目标数量" type="number" min="1" :max="C.maxQuantity" :value="target.quantity" @change="quantityChange"></label>
      <p class="small muted">追踪不消耗游戏月，也不预留材料。</p>
    </details>
  </section>
</template>
<style scoped>
#app #goal-panel{padding:8px 16px!important;border:0!important;background:none!important;box-shadow:none!important;gap:10px}
#app #goal-panel .goal-board-tools{display:flex;justify-content:flex-end;min-height:44px}
#app #goal-panel :deep(.goal-board){flex:none}
#app #goal-panel .goal-management{margin-top:12px!important;border:0;border-top:1px solid #a7b57f55;background:none;padding:4px 0}
#app #goal-panel .goal-management>summary{min-height:44px;display:flex;align-items:center;font-size:18px}
:global(.immersive-stage.stage-details .hub-feature:has(>.right-column:not([style*="display: none"]))){background:linear-gradient(90deg,#0e2e3477,#0c2832dd 62%,#0b2630c7)!important;border-color:transparent;box-shadow:none}
</style>
