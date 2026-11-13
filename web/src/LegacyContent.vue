<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import * as C from '../../src/full/content.ts';
import type { Action, Move } from '../../src/full/types.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import {
  getTrialJourney,
  getStoryContext,
  getAscensionChoices,
} from '../../src/full/queries.ts';
import { stories } from '../../src/full/events.ts';
import { useRuleContent } from './rule-content';
import { useActionView } from './use-action-view';
import type { useGame } from './store';
import { activityPlansKey } from './use-activity-plans';
import type { NavigationRequest } from './navigation';
import type { TrackingTarget } from '../../src/full/goals.ts';
import { formatCosts, formatDelta } from './presentation';
import type { Guide } from './guidance';
import { NPC_PORTRAITS } from './assets';
import GuidancePanel from './GuidancePanel.vue';
import MilestoneGate from './MilestoneGate.vue';
import OpeningOffering from './OpeningOffering.vue';
import PortraitImage from './PortraitImage.vue';
import ChoiceCard from './ChoiceCard.vue';
import BattlePanel from './BattlePanel.vue';
import TrainingActivity from './TrainingActivity.vue';
import LifePanel from './LifePanel.vue';
import CultivationTab from './CultivationTab.vue';
import ExplorationTab from './ExplorationTab.vue';
import InventoryTab from './InventoryTab.vue';
import FateTab from './FateTab.vue';
const props = defineProps<{
  hubMain: boolean;
  storyView: boolean;
  singleScreen: boolean;
  immersive: boolean;
  view: string;
  tab: string;
  cultivationHome: boolean;
  guide: Guide;
  guidanceEnabled: boolean;
  skippedGuides: readonly string[];
  consumption: (action: Action) => string;
}>();
const batch = defineModel<number | 'target'>('batch', { required: true }),
  quantity = defineModel<number>('quantity', { required: true });
const emit = defineEmits<{
  act: [action: Action];
  battle: [move: Move];
  travel: [location: C.LocationId];
  navigate: [request: NavigationRequest];
  track: [target: TrackingTarget];
  home: [];
  resume: [];
  life: [event?: Event];
  school: [];
  focusCultivation: [];
  breakthroughGoal: [];
  help: [topic?: string];
  skip: [];
  export: [];
  restore: [];
  restart: [];
  receipt: [];
}>();
const store = inject<ReturnType<typeof useGame>>('game-scene')!,
  plans = inject(activityPlansKey)!,
  ruleContent = useRuleContent(() => store.game);
const game = computed(() => store.game!),
  core = computed(() => game.value.core),
  phase = computed(() => gamePhase(game.value)),
  journey = computed(() => getTrialJourney(game.value)),
  ascension = computed(() => getAscensionChoices(game.value)),
  activeStory = computed(() =>
    core.value.activeEvent && stories[core.value.activeEvent.id]
      ? getStoryContext(game.value, core.value.activeEvent.id)
      : null,
  ),
  guidance = computed(() => props.guide),
  hubView = computed(() => props.view),
  tab = computed(() => props.tab),
  inspectingInventory = computed(
    () =>
      game.value.status === 'active' &&
      phase.value !== 'idle' &&
      tab.value === '行囊',
  );
const {
  collectionTarget,
  highlight,
  adventureInspectionPlan,
  adventureInspectionSaved,
  startAdventure,
  viewActivityPlan,
} = plans;
const { quote, can, cost, why } = useActionView(store);
const openingChoices = [
  { id: 'help', name: '赠丹相助', detail: '结下赠药之缘' },
  {
    id: 'trade',
    name: '以丹换简',
    detail: `获得剑简，剑修终结伤害 +${ruleContent.value.swordManual.damageBonus}`,
  },
  { id: 'leave', name: '保留丹药', detail: '保留回春丹，各自离开' },
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
const act = (action: Action) => emit('act', action),
  battle = (move: Move) => emit('battle', move),
  travel = (location: C.LocationId) => emit('travel', location),
  navigate = (request: NavigationRequest) => emit('navigate', request),
  selectTracking = (target: TrackingTarget) => emit('track', target),
  closeHub = () => emit('home'),
  resumeEncounter = () => emit('resume'),
  showLife = (event?: Event) => emit('life', event),
  showEquipment = () => emit('school'),
  focusCultivation = () => emit('focusCultivation'),
  showBreakthroughGoal = () => emit('breakthroughGoal'),
  showGameplayHelp = () => emit('help'),
  skipGuidance = () => emit('skip'),
  exportLife = () => emit('export'),
  restore = () => emit('restore'),
  reset = () => emit('restart');
const legacyContentPanel = ref<HTMLElement>();
defineExpose({ element: legacyContentPanel });
</script>
<template>
<section v-if="!hubMain&&!storyView&&(!singleScreen||(game.status!=='active'&&hubView==='life')||(['home','fate','current','battle'].includes(hubView)||hubView==='trial-preparation'))" ref="legacyContentPanel" id="game-content" tabindex="-1" aria-label="当前内容" class="paper content-panel" :class="{'battle-content':game.battle&&!inspectingInventory}">
<details v-if="game.battle&&!inspectingInventory&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" class="battle-guidance"><summary>查看本场行道提示</summary><GuidancePanel :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp"/></details>
<GuidancePanel v-else-if="!cultivationHome&&phase!=='opening'&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp"/>
<section v-if="inspectingInventory" class="pending-inspection" data-testid="pending-inspection"><h3>当前遭遇待继续</h3><p>查看不会消耗游戏月，也不会改变当前事件、敌方意图或回合。物品使用、旅行与换装仍受当前遭遇限制。</p><button type="button" data-testid="resume-encounter" @click="resumeEncounter">返回当前遭遇</button></section>
<template v-if="phase === 'opening' && !inspectingInventory"><MilestoneGate :game="game" kind="opening" :class="{'art33-opening':singleScreen,'art33-reading':singleScreen}"><template v-if="singleScreen" #object="{source,phase,engaged,remaining,seconds,view}"><OpeningOffering :game="source" :phase="phase" :engaged="engaged" :remaining="remaining" :seconds="seconds" :view-title="view?.title" :status="store.activity?.version===7&&store.activity.plan.action.type==='CHOOSE'?store.activity.status:'idle'" :failed="!!store.error" reading @inspect="closeHub"/></template>
<div class="opening-heading"><PortraitImage class="speaker-portrait" id="shen" fallback="沈"/><div><span class="section-label">破庙初遇 · 沈清禾</span><h2>一丹，一念。</h2></div></div>
<p class="story">山雨将歇，药修沈清禾向你求药。你随身带着回春丹 ×{{core.inventory.healing_pill}}，庙柱上的引气之法人人可习。要不要介入这段因果，由你决定。</p>
<div id="opening-actions" class="choices opening-choices" tabindex="-1" data-primary-region role="group" aria-label="破庙抉择">
<ChoiceCard v-for="choice in openingChoices" :key="choice.id" :choice-id="choice.id" :label="choice.name" :disabled="!can({type:'CHOOSE',choice:choice.id})" :identity="core.runId+core.revision" :details="choiceDetails({type:'CHOOSE',choice:choice.id},choice.detail)" @choose="act({type:'CHOOSE',choice:choice.id})">
<strong>{{singleScreen?'核对 · ':''}}{{choice.name}}</strong><small>{{cost({type:'CHOOSE',choice:choice.id})}}</small><small>{{choice.detail}}</small><small v-if="why({type:'CHOOSE',choice:choice.id})">{{why({type:'CHOOSE',choice:choice.id})}}</small>
</ChoiceCard>
</div>
<details class="opening-details"><summary>三种选择与剑简说明</summary><p class="small">三种选择均可入道，剧情不会直接赋予境界。惊鸿剑简用于剑修终结术法，伤害 +{{ruleContent.swordManual.damageBonus}}；三种开场均可在筑基后到青云宗付费研读同简。</p></details></MilestoneGate>
</template>
<template v-else-if="phase === 'trial-question' && journey && !inspectingInventory">
<div class="section-label">渡劫 · 问心</div><h2>你愿如何面对来路？</h2><p class="story" data-testid="trial-question-memory">{{journey.openingMemory}}</p><p class="story">接纳旧我，稳住心神；或放下旧念，以进攻开路。两条道路皆可向前，不另判善恶成败。</p>
<details class="trial-memories"><summary>回望已记录的选择</summary><p v-for="memory in journey.memories" :key="memory.id" class="small">{{memory.person}} · {{memory.title}}：{{memory.text}}</p></details>
<div class="choices two" tabindex="-1" data-primary-region role="group" aria-label="问心选择"><ChoiceCard v-for="answer in journey.answers" :key="answer.id" :choice-id="`answer-${answer.id}`" :label="answer.label" :disabled="!can({type:'ANSWER_TRIAL',answer:answer.id})" :identity="core.runId+core.revision" :details="choiceDetails({type:'ANSWER_TRIAL',answer:answer.id},answer.record)" @choose="act({type:'ANSWER_TRIAL',answer:answer.id})"><strong>{{answer.label}} · {{answer.id==='accept'?'承受更稳':'进攻更强'}}</strong><small>{{answer.record}}</small><small>{{answer.preview.failure?.message}}</small></ChoiceCard></div>
</template>
<template v-else-if="activeStory && !inspectingInventory">
<div class="section-label">当前遭遇 · {{activeStory.npc}}</div><div class="encounter-speaker"><PortraitImage class="speaker-portrait" :id="NPC_PORTRAITS[activeStory.npc]??''" :fallback="activeStory.npc.slice(0,1)"/><span>{{activeStory.npc}}</span></div><h2 data-testid="event-title">{{activeStory.name}}</h2><p class="story" data-testid="event-body">{{activeStory.body}}</p>
<div class="choices" tabindex="-1" data-primary-region role="group" aria-label="当前遭遇选择"><ChoiceCard v-for="option in activeStory.options" :key="option.id" :choice-id="`decide-${option.id}`" :label="option.label" :disabled="!can({type:'DECIDE',option:option.id})" :identity="core.runId+core.revision" :details="choiceDetails({type:'DECIDE',option:option.id},option.detail)" @choose="act({type:'DECIDE',option:option.id})"><strong>{{option.label}}</strong><small>{{option.detail}}</small><small>{{cost({type:'DECIDE',option:option.id})}}</small><small>{{why({type:'DECIDE',option:option.id})}}</small><small>{{consumption({type:'DECIDE',option:option.id})}}</small></ChoiceCard></div>
</template>
<template v-else-if="game.battle && !inspectingInventory">
    <BattlePanel :game="game" :can="can" :cost="cost" :why="why" @move="battle" @start="startAdventure" @takeover="store.pauseCultivation" :activity="store.activity" :running="store.activityRunning" :busy="store.busy" :available="store.available" :saved-adventure-plan="adventureInspectionPlan" :plan-saved="adventureInspectionSaved"><template #activity><TrainingActivity v-if="!immersive&&store.activity?.version===6&&store.activity.status!=='stopped'" :store="store" compact @settings="viewActivityPlan" @details="emit('receipt')"/></template></BattlePanel>
          </template>
          <template v-else-if="phase === 'trial-ending' && ascension && !inspectingInventory">
            <div class="section-label">天门已开 <span>三关已过，等待你的收束</span></div><h2>此生，留下些什么？</h2><p class="story">{{ascension.record.opening.text}} {{ascension.record.training.school}}的来路已经留在记录中。两种选择都以飞升成功收卷，没有善恶高低。</p>
            <p class="small">{{ascension.record.battle.trial}} 选择前可查看生平；取消不改变进度，确认保存后才封卷。</p>
            <div class="choices two" tabindex="-1" data-primary-region role="group" aria-label="飞升收束选择"><ChoiceCard v-for="choice in ascension.choices" :key="choice.ending" :choice-id="`ending-${choice.ending}`" :label="choice.label" :disabled="!can({type:'END',ending:choice.ending})" :identity="core.runId+core.revision" :details="choiceDetails({type:'END',ending:choice.ending},choice.description)" @choose="act({type:'END',ending:choice.ending})"><strong>{{choice.label}}</strong><small>{{choice.description}}</small><small>{{choice.preview.failure?.message}}</small></ChoiceCard></div>
          </template>
          <template v-else-if="game.status !== 'active'">
            <LifePanel data-primary-region tabindex="-1" :game="game" :enabled="store.available" :busy="store.busy" :has-checkpoint="store.hasCheckpoint" @export="exportLife" @restore="restore" @restart="reset"/>
          </template>
          <CultivationTab v-else-if="tab === '修行'" v-model:batch="batch" :cultivation-home="cultivationHome" @act="act" @travel="travel" @school="showEquipment" @focus="focusCultivation" @track-breakthrough="showBreakthroughGoal"/>
          <ExplorationTab v-else-if="tab === '历练'" v-model:batch="batch" v-model:quantity="quantity" :collection="collectionTarget" :highlight="highlight" @act="act" @travel="travel"/>
          <InventoryTab v-else-if="tab === '行囊'" :single-screen="singleScreen" :view="hubView" :highlight="highlight" :consumption="consumption" @act="act" @travel="travel" @track="selectTracking"/>
          <FateTab v-else :highlight="highlight" @act="act" @life="showLife" @navigate="navigate"/>
          <GuidancePanel v-if="(cultivationHome||phase==='opening')&&guidanceEnabled&&!skippedGuides.includes(guidance.id)" :guide="guidance" @skip="skipGuidance" @help="showGameplayHelp" :modal="singleScreen&&phase==='opening'" @expand="emit('help',guidance.id)"/>
        </section>
</template>
