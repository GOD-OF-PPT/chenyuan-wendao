<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { useGame } from './store';
import type { Action, Move } from '../../src/full/types.ts';
import type { AdventurePlan } from '../../src/full/adventure.ts';
import type { CultivationPlan } from '../../src/full/activity.ts';
import type { TrackingTarget } from '../../src/full/goals.ts';
import type { NavigationRequest } from './navigation';
import { getTrackedGoal } from '../../src/full/goals.ts';
import {
  getLifeOverview,
  getStoryContext,
  getTrialJourney,
} from '../../src/full/queries.ts';
import { stories } from '../../src/full/events.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import { ADVENTURE_CYCLE_MS } from '../../src/full/adventure.ts';
import * as C from '../../src/full/content.ts';
import { useRuleContent } from './rule-content';
import { useActionView } from './use-action-view';
import { formatCosts, formatDelta } from './presentation';
import { nextStep } from './play-flow';
import { trialGuidance } from './trial-goal';
import { trialReturnView } from './trial-return';
import { PANEL_MATERIAL_ASSETS } from './assets';
import CharacterPanel from './CharacterPanel.vue';
import ScenePanel from './ScenePanel.vue';
import SealedLifeStage from './SealedLifeStage.vue';
import MilestoneGate from './MilestoneGate.vue';
import CaveThresholdObject from './CaveThresholdObject.vue';
import OpeningOffering from './OpeningOffering.vue';
import OpeningResponse from './OpeningResponse.vue';
import TrainingActivity from './TrainingActivity.vue';
import ChoiceCard from './ChoiceCard.vue';
import BattlePanel from './BattlePanel.vue';
import CultivationHome from './CultivationHome.vue';
import AssetImage from './AssetImage.vue';
import ProgressTrack from './ProgressTrack.vue';
import GameIcon from './GameIcon.vue';
import StageOutcome from './StageOutcome.vue';
const props = defineProps<{
  hubMain: boolean;
  immersive: boolean;
  cultivationHome: boolean;
  resumeVisible: boolean;
  demoNode: boolean;
  target: TrackingTarget;
  goalHint: string;
  adventureInspectionPlan: AdventurePlan | null;
  adventureInspectionSaved: boolean;
  milestoneSequence: number | null;
  milestoneText: string;
  milestoneDetail: string;
}>();
const hubTrainingMethod = defineModel<'natural' | 'assisted'>('method', {
  required: true,
});
const emit = defineEmits<{
  open: [view: string, event?: Event, mode?: 'required' | 'checkpoint'];
  prepare: [event?: Event];
  destination: [request: NavigationRequest];
  act: [action: Action];
  battle: [move: Move];
  travel: [location: C.LocationId];
  start: [plan: CultivationPlan | AdventurePlan];
  school: [event?: Event];
  life: [event?: Event];
  manageLife: [event: Event];
  settings: [event?: Event];
  plan: [];
  receipt: [];
  compare: [method: 'natural' | 'assisted'];
  trial: [];
  tab: [name: string];
  next: [];
  export: [];
  demos: [event?: Event];
}>();
const store = inject<ReturnType<typeof useGame>>('game-scene')!;
const game = computed(() => store.game!),
  core = computed(() => game.value.core),
  ruleContent = useRuleContent(() => store.game),
  phase = computed(() => gamePhase(game.value)),
  realm = computed(() => ruleContent.value.realms[core.value.player.realm]),
  location = computed(() => C.locations[core.value.world.location]);
const hubMain = computed(() => props.hubMain),
  immersive = computed(() => props.immersive),
  cultivationHome = computed(() => props.cultivationHome),
  hubGoalHint = computed(() => props.goalHint),
  tracking = { target: computed(() => props.target) };
const { quote, can, why, cost } = useActionView(store);
const step = computed(() => nextStep(game.value)),
  needsPreparation = computed(() => step.value?.kind === 'prepare'),
  overview = computed(() => getLifeOverview(game.value)),
  journey = computed(() => getTrialJourney(game.value)),
  trialView = computed(() => trialGuidance(game.value));
const hubGoal = computed(() => getTrackedGoal(game.value, props.target)),
  activeStory = computed(() =>
    core.value.activeEvent && stories[core.value.activeEvent.id]
      ? getStoryContext(game.value, core.value.activeEvent.id)
      : null,
  );
const producing = computed(
  () =>
    !!store.activity &&
    store.activity.status !== 'stopped' &&
    (store.activity.plan.kind === 'craft' ||
      store.activity.plan.kind === 'forge'),
);
const trialReturn = computed(() =>
  trialReturnView(
    game.value,
    store.hasCheckpoint ? store.checkpointSummary : null,
    store.trialRecovery,
    store.ready &&
      store.available &&
      !store.busy &&
      !store.syncIssue &&
      !(store.warning && !store.hasCheckpoint),
  ),
);
const primaryBreakthrough = computed(
    () =>
      cultivationHome.value &&
      (core.value.player.realm === 'spirit'
        ? core.value.player.xp >= realm.value.xpCap
        : !!quote({ type: 'BREAKTHROUGH' })?.allowed),
  );
const caveGate = computed(
  () =>
    cultivationHome.value &&
    (primaryBreakthrough.value || needsPreparation.value) &&
    step.value?.kind !== 'recover',
);
const caveThreshold = computed(
  () =>
    immersive.value &&
    core.value.world.location === 'cave' &&
    ((caveGate.value && !trialReturn.value?.choice) ||
      (store.activity?.version === 7 &&
        store.activity.status !== 'stopped' &&
        store.activity.plan.action.type === 'BREAKTHROUGH')),
);
const uiLocked = computed(() => store.busy || !store.available),
  stoppedTraining = computed(
    () =>
      store.activity?.status === 'stopped' &&
      store.activity.stopReason?.code !== 'STATE_CHANGED',
  );
const openingChoices = [
  { id: 'help', name: '赠丹相助', detail: '结下赠药之缘' },
  {
    id: 'trade',
    name: '以丹换简',
    detail: `获得剑简，剑修终结伤害 +${ruleContent.value.swordManual.damageBonus}`,
  },
  { id: 'leave', name: '保留丹药', detail: '保留回春丹，各自离开' },
] as const;
const hubEntries = [
  { id: 'forge', label: '丹炉', kind: 'item', icon: 'healing_pill' },
  { id: 'skills', label: '功法', kind: 'skill', icon: 'sword_mind' },
  { id: 'relics', label: '法宝', kind: 'relic', icon: 'cloud_mirror' },
  { id: 'life', label: '生平', kind: 'action', icon: 'export' },
  { id: 'goal', label: '目标', kind: 'action', icon: 'save' },
  { id: 'help', label: '帮助', kind: 'action', icon: 'help' },
] as const;
function choiceDetails(action: Action, detail: string) {
  const p = quote(action);
  return [
    {
      label: '即刻代价',
      value: formatCosts(p?.actualCosts ?? p?.costs ?? null),
    },
    { label: '已知结果', value: detail },
    {
      label: '预计变化',
      value: p?.delta ? formatDelta(p.delta) : '条件未满足，当前不会执行',
    },
    { label: '当前条件', value: why(action) || '可选择；由你确认后执行' },
  ];
}
const openHub = (view: string, event?: Event, mode?: 'required' | 'checkpoint') => emit('open', view, event, mode),
  openPreparation = (event?: Event) => emit('prepare', event),
  inspectCaveDestination = (request: NavigationRequest) =>
    emit('destination', request),
  act = (action: Action) => emit('act', action);
const battle = (move: Move) => emit('battle', move),
  travel = (location: C.LocationId) => emit('travel', location),
  startAdventure = (plan: AdventurePlan) => emit('start', plan),
  startTraining = (plan?: CultivationPlan) => {
    if (plan) emit('start', plan);
  };
const showEquipment = (event?: Event) => emit('school', event),
  showLife = (event?: Event) => emit('life', event),
  inspectLifespan = (event: Event) => emit('manageLife', event),
  showSettings = (event?: Event) => emit('settings', event),
  showDemoMenu = (event?: Event) => emit('demos', event);
const viewActivityPlan = () => emit('plan'),
  viewReceipt = () => emit('receipt'),
  openTradeoffs = (_kind: 'cultivation', method: 'natural' | 'assisted') =>
    emit('compare', method),
  showTrialPreparation = () => emit('trial'),
  selectTab = (name: string) => emit('tab', name),
  inspectNext = () => emit('next'),
  exportSave = () => emit('export');
const contentPanel = ref<HTMLElement>();
defineExpose({ element: contentPanel });
</script>
<template>
<main v-show="hubMain" class="game-hub" :aria-busy="store.busy" data-testid="game-hub">
<CharacterPanel v-if="!immersive" :game="game" compact @inspect="openHub('character',$event)"/>
<section class="hub-stage" :class="{'hub-battle':!!game.battle,'hub-opening':phase==='opening'}" aria-label="游戏主舞台">
<ScenePanel v-if="!game.battle" :game="game" :meditation="cultivationHome&&!producing&&!immersive" :battle-stage="!!game.battle" :eyebrow="phase==='opening'?'山雨破庙':location.subtitle" :title="phase==='opening'?'雨中故人':location.name" description="一念尘缘起，千山共问道。" :passage="immersive" @inspect="viewActivityPlan"/>
<section ref="contentPanel" :id="hubMain?'game-content':undefined" class="paper hub-current" :class="{'hub-cultivating':phase==='idle'&&game.status==='active'&&core.world.location==='cave','art17-current':caveThreshold}" data-testid="hub-current" tabindex="-1" aria-label="当前内容">
<SealedLifeStage v-if="game.status!=='active'" :game="game" :busy="store.busy" :receipt="store.activity?.version===7&&store.activity.completedCycles>0&&store.activity.stopReason?.code!=='STATE_CHANGED'" @life="showLife" @export="exportSave" @settings="showSettings" @receipt="viewReceipt"/><template v-else-if="store.activity?.version===7&&store.activity.status!=='stopped'"><MilestoneGate v-if="['CHOOSE','BREAKTHROUGH','START_TRIAL'].includes(store.activity.plan.action.type)" :game="game" :kind="store.activity.plan.action.type==='CHOOSE'?'opening':store.activity.plan.action.type==='START_TRIAL'?'trial':'breakthrough'" :action="store.activity.plan.action" :class="{'art17-threshold':caveThreshold,'art33-opening':store.activity.plan.action.type==='CHOOSE'}"><template v-if="caveThreshold" #object="{source,phase,engaged,remaining,seconds}"><CaveThresholdObject :game="source" :phase="phase" :engaged="engaged" :remaining="remaining" :seconds="seconds" :failed="!!store.error" :enabled="store.available&&!store.busy" @inspect="openPreparation($event)" @navigate="inspectCaveDestination"/></template><template v-else-if="store.activity.plan.action.type==='CHOOSE'" #object="{source,phase,engaged,remaining,seconds,view}"><OpeningOffering :game="source" :phase="phase" :engaged="engaged" :remaining="remaining" :seconds="seconds" :view-title="view?.title" :status="store.activity?.status??'idle'" :failed="!!store.error" @inspect="viewActivityPlan"/></template><OpeningResponse v-if="store.activity.plan.action.type==='CHOOSE'" :game="game" :activity="store.activity" @inspect="viewActivityPlan"/><template v-else><p>本次已安排，读秒与停手在上方；保存后显示成果。</p><button @click="viewActivityPlan">查看原安排</button></template></MilestoneGate><TrainingActivity v-if="!immersive" :store="store" @settings="viewActivityPlan" @details="viewReceipt"/><button v-if="store.activity.status==='paused'" class="text-button" @click="openHub('current',$event)">重新查看当前抉择</button></template><template v-else-if="phase==='opening'"><MilestoneGate :game="game" kind="opening" class="art33-opening"><template #object="{source,phase,engaged,remaining,seconds,view}"><OpeningOffering :game="source" :phase="phase" :engaged="engaged" :remaining="remaining" :seconds="seconds" :view-title="view?.title" :failed="!!store.error" @inspect="openHub('current',$event)"/></template><div class="hub-opening-title"><div><span>破庙初遇 · 沈清禾</span><h2>一丹，一念。</h2></div></div><p class="story">山雨将歇，沈清禾向你求药。随身回春丹 ×{{core.inventory.healing_pill}}，要不要介入这段因果，由你决定。</p><div id="opening-actions" class="choices opening-choices" tabindex="-1" data-primary-region role="group" aria-label="破庙抉择"><ChoiceCard v-for="choice in openingChoices" :key="choice.id" :choice-id="choice.id" :label="choice.name" :disabled="!can({type:'CHOOSE',choice:choice.id})" :identity="core.runId+core.revision" :details="choiceDetails({type:'CHOOSE',choice:choice.id},choice.detail)" @choose="act({type:'CHOOSE',choice:choice.id})"><strong>核对 · {{choice.name}}</strong><small>{{cost({type:'CHOOSE',choice:choice.id})}}</small><small>{{choice.detail}}</small><small v-if="why({type:'CHOOSE',choice:choice.id})">{{why({type:'CHOOSE',choice:choice.id})}}</small></ChoiceCard></div><button class="text-button" @click="openHub('current',$event)">查看三种选择与剑简说明</button></MilestoneGate></template>
<BattlePanel v-else-if="game.battle" :active="hubMain" :game="game" :can="can" :cost="cost" :why="why" compact @move="battle" @start="startAdventure" @takeover="store.pauseCultivation" :activity="store.activity" :running="store.activityRunning" :busy="store.busy" :available="store.available" :saved-adventure-plan="adventureInspectionPlan" :plan-saved="adventureInspectionSaved" @details="openHub('battle',$event)"><template #activity><TrainingActivity v-if="!immersive&&store.activity?.version===6&&store.activity.status!=='stopped'" :store="store" compact @settings="viewActivityPlan" @details="viewReceipt"/></template></BattlePanel>
<CultivationHome v-else-if="phase==='idle'&&game.status==='active'&&core.world.location==='cave'" v-model:method="hubTrainingMethod" :immersive="immersive" :cultivation-home="cultivationHome" @open="openHub" @prepare="openPreparation" @destination="inspectCaveDestination" @act="act" @start="startTraining" @school="showEquipment" @life="inspectLifespan" @settings="showSettings" @inspect-plan="viewActivityPlan" @receipt="viewReceipt" @compare="openTradeoffs('cultivation',$event)"/>
<template v-else-if="phase==='idle'&&game.status==='active'"><TrainingActivity v-if="store.activity&&store.activity.status!=='stopped'&&!immersive" :store="store" @settings="viewActivityPlan" @details="viewReceipt"/><p v-if="immersive&&store.activity&&store.activity.status!=='stopped'">本次行动的进展与停手入口在上方。</p><template v-else-if="!store.activity||store.activity.status==='stopped'"><h2>{{location.name}}</h2><p class="story">{{location.description}}</p><div data-primary-region tabindex="-1" class="hub-idle-actions"><button v-if="core.player.realm==='spirit'" class="primary" data-testid="breakthrough" @click="showTrialPreparation" :disabled="uiLocked">查看渡劫准备</button><button v-if="needsPreparation" class="primary" data-testid="journey-prepare" @click="openPreparation($event)">{{step?.title}} →</button><button :class="core.player.realm==='spirit'||needsPreparation?'':'primary'" data-testid="return-cave" @click="travel('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">返回洞府修行<small>{{cost({type:'TRAVEL',location:'cave'})}} · {{ADVENTURE_CYCLE_MS.travel/1000}} 秒行旅 {{why({type:'TRAVEL',location:'cave'})}}</small></button><button data-testid="hub-cultivation-details" @click="openHub('cultivation',$event)">预算与成长</button><button @click="selectTab('历练')">取材与挑战</button></div></template></template>
<template v-else><h2>{{trialView?.title??(game.status==='active'?(activeStory?.name??(journey?'渡劫行程':'当前机缘')):overview?.title)}}</h2><p class="story">{{trialView?.detail??(game.status==='active'?'眼前的抉择尚待继续。查看资料不会推进游戏时间。':'此卷已收，来路犹存。')}}</p><div data-primary-region tabindex="-1"><button class="primary" @click="openHub(game.status==='active'?'current':'life',$event)">{{trialView?.verb??(game.status==='active'?'继续当前遭遇':'查看生平与收卷')}}</button></div></template>
<aside v-if="milestoneSequence!==null" class="milestone-handoff" data-testid="milestone-handoff" :data-sequence="milestoneSequence"><strong>{{milestoneText}}</strong><small>{{milestoneDetail}}</small></aside>
</section>
</section>
<aside v-if="!immersive" class="hub-aside"><section class="paper hub-goal"><span class="section-label">当前目标</span><AssetImage class="hub-mountain-art" :path="PANEL_MATERIAL_ASSETS.mountains" asset-id="hub-goal-mountains" fit="contain" eager aria-hidden="true"/><h2 data-testid="hub-target">{{hubGoal?.title}}</h2><ProgressTrack v-if="tracking.target.value.kind==='breakthrough'&&realm.xpCap" :value="core.player.xp" :max="realm.xpCap" label="当前目标修为" :identity="core.runId+core.player.realm" hint="当前目标按已保存修为显示。进度满后，仍需核对突破材料和条件。"/><p data-testid="hub-gap">{{hubGoalHint}}</p><button data-testid="hub-goal-open" @click="openHub('goal',$event)">查看缺口与来源 →</button></section>
<nav class="hub-services" aria-label="修仙功能"><button v-for="entry in hubEntries" :key="entry.id" :data-testid="`hub-${entry.id}`" @click="openHub(entry.id,$event)"><GameIcon :kind="entry.kind" :id="entry.icon"/><span>{{entry.label}}</span></button></nav>
<section class="paper hub-recent" aria-live="polite"><span class="section-label">行道回响</span><TrainingActivity v-if="stoppedTraining" :store="store" summary @settings="viewActivityPlan" @details="viewReceipt"/><StageOutcome v-else :game="game" :result="store.lastResult" :busy="store.busy" :saved="store.saved" :available="store.available" :error="store.error" :sync-issue="store.syncIssue" :replayed="store.lastReplayed" :execution="store.execution" :followup="false" :next="step?.title??'查看当前目标'" @next="inspectNext()" @details="viewReceipt"/><div v-if="resumeVisible" class="hub-resume" data-testid="resume-strip"><span>已续上本机进度</span></div><button v-if="demoNode" class="text-button" @click="showDemoMenu">切换演示节点</button><button v-if="overview?.remainingMonths!==null&&overview?.remainingMonths!==undefined&&overview.remainingMonths<=12" class="text-button" @click="showLife">余寿 {{overview.remainingMonths}} 月 · 查看生平</button></section></aside>
</main>
</template>
