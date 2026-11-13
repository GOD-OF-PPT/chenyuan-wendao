<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import type { useGame } from './store';
import type { TrackingTarget } from '../../src/full/goals.ts';
import * as C from '../../src/full/content.ts';
import { useRuleContent } from './rule-content';
import { useGoalStatus } from './use-goal-status';
import { useSession } from './session';
import { demoSpec } from '../../src/demo.ts';
import { normalLink } from './demo-loader';
import { recoveryMessage } from './activity-view';
import SealedLifeHud from './SealedLifeHud.vue';
import GameHud from './GameHud.vue';
import TrainingActivity from './TrainingActivity.vue';
import StageOutcome from './StageOutcome.vue';
import GameIcon from './GameIcon.vue';
import AssetImage from './AssetImage.vue';
import LifespanGuide from './LifespanGuide.vue';
import ResultMoments from './ResultMoments.vue';
import ActionFeedbackStage from './ActionFeedbackStage.vue';
import FeedbackSkip from './FeedbackSkip.vue';
import { PANEL_MATERIAL_ASSETS } from './assets';
const props = defineProps<{
    immersive: boolean;
    hubMain: boolean;
    view: string;
    tab: string;
    storyView: boolean;
    activityRailVisible: boolean;
    localReady: boolean;
    reduceMotion: boolean;
    target: TrackingTarget;
    exportError: string;
    importNotice: string;
  }>(),
  resumeVisible = defineModel<boolean>('resumeVisible', { required: true });
const emit = defineEmits<{
  open: [view: string, event?: Event];
  life: [event?: Event];
  help: [];
  settings: [event?: Event];
  plan: [];
  receipt: [];
  export: [];
  demos: [];
  reset: [];
  primary: [];
  retry: [];
  reload: [];
  raw: [];
  focus: [];
  height: [height: number];
}>();
const store = inject<ReturnType<typeof useGame>>('game-scene')!,
  session = useSession(),
  demoNode = session.kind === 'demo' ? demoSpec(session.node!.nodeId) : null,
  game = computed(() => store.game),
  core = computed(() => store.game?.core),
  ruleContent = useRuleContent(() => store.game),
  realm = computed(
    () => ruleContent.value.realms[core.value?.player.realm ?? 'mortal'],
  ),
  location = computed(
    () => C.locations[core.value?.world.location ?? 'wilderness'],
  ),
  uiLocked = computed(() => store.busy || !store.available),
  hubView = computed(() => props.view),
  experience = { ready: computed(() => props.localReady) };
const { lifeState, hubGoal, hudGoalContext, hubGoalHint } = useGoalStatus(
  store,
  () => props.target,
);
const saveTone = computed(() =>
    !store.ready || store.busy
      ? 'pending'
      : store.error || !store.available
        ? 'problem'
        : store.game && store.saved
          ? 'saved'
          : 'idle',
  ),
  saveDisplayLabel = computed(() =>
    store.saveLabel === '本次未保存' ? '保存待确认' : store.saveLabel,
  );
const openHub = (view: string, event?: Event) => emit('open', view, event),
  showLife = (event?: Event) => emit('life', event),
  showGameplayHelp = () => emit('help'),
  showSettings = (event?: Event) => emit('settings', event),
  viewActivityPlan = () => emit('plan'),
  viewReceipt = () => emit('receipt'),
  exportSave = () => emit('export'),
  showDemoMenu = () => emit('demos'),
  reset = () => emit('reset'),
  focusPrimary = () => emit('primary'),
  retryOperation = () => emit('retry'),
  initialiseGame = () => emit('reload'),
  exportRaw = () => emit('raw'),
  focusContent = () => emit('focus');
const settingsButton = ref<HTMLButtonElement>(),
  noticeRegion = ref<HTMLElement>();
watch(
  noticeRegion,
  (node, _, cleanup) => {
    if (!node) return;
    const observer = new ResizeObserver(() => {
      const height = node.getBoundingClientRect().height;
      emit('height', height ? height + 8 : 0);
    });
    observer.observe(node);
    cleanup(() => observer.disconnect());
  },
  { flush: 'post' },
);
defineExpose({ settingsButton });
</script>
<template>
<SealedLifeHud v-if="store.ready&&immersive&&game&&game.status!=='active'" :game="game" :save-label="saveDisplayLabel" :save-tone="saveTone" :demo="!!demoNode" @inspect="openHub('character',$event)" @life="showLife" @help="showGameplayHelp" @settings="showSettings"/>
<GameHud v-else-if="store.ready&&immersive&&game" :game="game" :goal="hubGoal?.title??'当前目标'" :context="hudGoalContext" :gap="lifeState?.hint??hubGoalHint" :save-label="saveDisplayLabel" :save-tone="saveTone" :demo="!!demoNode" @inspect="openHub('character',$event)" @goal="openHub('goal',$event)" @help="showGameplayHelp" @settings="showSettings"><TrainingActivity v-if="activityRailVisible" :store="store" rail compact @settings="viewActivityPlan" @details="viewReceipt" @inspect="openHub('activity')"/><StageOutcome v-else-if="store.lastResult&&hubView!=='activity'" :game="game" :result="store.lastResult" :busy="store.busy" :saved="store.saved" :available="store.available" :error="store.error" :sync-issue="store.syncIssue" :replayed="store.lastReplayed" :execution="store.execution" :followup="false" compact next="" @details="viewReceipt"/></GameHud>
<header v-else class="topbar">
<div class="brand"><strong v-if="demoNode" class="demo-badge" data-testid="demo-badge">演示存档</strong><span class="seal">尘<br>缘</span><div><h1>尘缘问道</h1><p>一念尘缘起 · 千山共问道</p></div></div>
<div v-if="core" class="where"><span class="diamond">◇</span> 云岚州 · {{location.name}} <small>修行第 {{core.world.elapsedMonths}} 月</small></div>
<div class="top-actions"><div class="save-summary" :data-save-state="saveTone" data-testid="save-summary"><span class="save-state" role="status" data-testid="save-status"><GameIcon kind="action" id="save"/>{{saveDisplayLabel}}</span><small>本机存档</small></div><button v-if="game" class="top-export" @click="exportSave" :disabled="store.busy"><GameIcon kind="action" id="export"/> 导出存档</button><button ref="settingsButton" @click="showSettings">设置</button></div>
</header>
<section v-if="demoNode&&!hubMain" class="paper demo-banner" aria-label="演示存档说明"><strong>演示存档 · {{demoNode.label}}</strong><div class="demo-actions"><a :href="normalLink()" data-testid="demo-return">返回正常游戏</a><button @click="showDemoMenu" :disabled="store.busy">切换演示节点</button><button data-testid="demo-reset" @click="reset" :disabled="uiLocked">重新载入本节点</button></div><details class="demo-explanation"><summary>演示说明</summary><p>本版本每个节点的进度独立保存，使用相同修行规则；正常进度与显示设置不受影响。</p></details></section>
<section v-if="!immersive&&resumeVisible&&game&&store.ready&&!hubMain" class="resume-strip" data-testid="resume-strip"><span>已续上本机进度 · {{realm.name}} · {{location.name}}</span><button type="button" class="text-button" @click="resumeVisible=false;focusPrimary()">继续当前内容 ↓</button></section>
<section v-if="!store.ready" class="loading loading-stage" aria-labelledby="loading-title"><AssetImage class="loading-landscape" :path="PANEL_MATERIAL_ASSETS.mountains" asset-id="loading-mountains" eager aria-hidden="true"/><div class="loading-copy"><span class="eyebrow">尘缘将启</span><h2 id="loading-title">静候山门</h2><p role="status" data-testid="game-loading">{{experience.ready.value?'正在核对本机进度，尚未确认存档……':'正在读取本机显示设置，不会改变游戏进度……'}}</p></div></section>
<div ref="noticeRegion" class="stage-alerts">
<section v-if="immersive&&resumeVisible&&game&&store.ready&&!hubMain" class="resume-strip" data-testid="resume-strip"><span>已续上本机进度 · {{realm.name}} · {{location.name}}</span><button type="button" class="text-button" @click="resumeVisible=false;focusPrimary()">继续当前内容 ↓</button></section>
<div v-if="store.error" class="error-banner" role="alert" data-testid="error">
<p class="error-title"><strong>{{store.canRetry?'保存待核对':store.available?'操作受阻':'存档不可用'}}</strong><span v-if="store.canRetry" class="small" data-testid="retry-policy"> · 重试核对原操作，不重复结算。</span></p><p>{{recoveryMessage(store.error,store.canRetry)}}</p><button v-if="store.canRetry" class="primary" data-testid="retry" @click="retryOperation" :disabled="store.busy">重试原操作</button>
<button v-if="!store.available" data-testid="reload-storage" @click="initialiseGame()" :disabled="store.busy">重新读取</button>
<button @click="exportRaw" :disabled="store.busy">导出原件备份</button>
</div>
<div v-if="store.warning" class="error-banner" role="status">{{store.warning}}</div>
<div v-if="exportError" class="error-banner" role="alert">{{exportError}}</div>
<div v-if="importNotice" class="error-banner" role="alert" data-testid="import-notice">{{importNotice}}</div>
<LifespanGuide v-if="!hubMain&&game" :game="game" @life="showLife" @checkpoint="showSettings"/>
<ResultMoments :store="store" :reduce-motion="reduceMotion" :active="!['activity','receipt','goal','character','help'].includes(hubView)" @dismiss="focusContent"/>
<ActionFeedbackStage :store="store" :reduce-motion="reduceMotion" :view-key="hubView+':'+tab" :playfield-active="hubMain||hubView==='current'&&storyView">
<template #default="{operation,dismiss,hold}"><FeedbackSkip v-if="['BATTLE','BREAKTHROUGH','START_TRIAL'].includes(operation)" @hold="hold" @dismiss="dismiss"/></template>
</ActionFeedbackStage>
</div>
</template>
