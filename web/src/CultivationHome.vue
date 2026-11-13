<script setup lang="ts">
import { computed, inject } from 'vue';
import type { useGame } from './store';
import type { Action } from '../../src/full/types.ts';
import type { NavigationRequest } from './navigation';
import { previewAction, getBreakthroughGoal } from '../../src/full/queries.ts';
import {
  previewActivity,
  type CultivationPlan,
} from '../../src/full/activity.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import * as C from '../../src/full/content.ts';
import { contentForGame } from '../../src/full/rule-content.ts';
import { nextStep } from './play-flow';
import { lifespanGuidance } from './lifespan-guidance';
import { trialReturnView } from './trial-return';
import { formatCosts } from './presentation';
import { DESKTOP_UI_ASSETS } from './assets';
import AssetImage from './AssetImage.vue';
import MilestoneGate from './MilestoneGate.vue';
import CaveThresholdObject from './CaveThresholdObject.vue';
import CultivationSite from './CultivationSite.vue';
import CultivationOngoing from './CultivationOngoing.vue';
import CultivationNotes from './CultivationNotes.vue';
import CultivationFallback from './CultivationFallback.vue';
import LifespanGuide from './LifespanGuide.vue';
import TrainingActivity from './TrainingActivity.vue';
import TrialReturnChoices from './TrialReturnChoices.vue';
const props = defineProps<{
  immersive: boolean;
  cultivationHome: boolean;
}>();
const hubTrainingMethod = defineModel<'natural' | 'assisted'>('method', {
  required: true,
});
const emit = defineEmits<{
  open: [view: string, event?: Event, mode?: 'required' | 'checkpoint'];
  prepare: [event?: Event];
  destination: [request: NavigationRequest];
  act: [action: Action];
  start: [plan?: CultivationPlan];
  school: [event?: Event];
  life: [event: Event];
  settings: [];
  inspectPlan: [];
  receipt: [];
  compare: [method: 'natural' | 'assisted'];
}>();
const store = inject<ReturnType<typeof useGame>>('game-scene')!;
const game = computed(() => store.game!),
  core = computed(() => game.value.core),
  ruleContent = computed(() => contentForGame(game.value)),
  realm = computed(() => ruleContent.value.realms[core.value.player.realm]);
const quote = (action: Action) => previewAction(game.value, action);
const can = (action: Action) =>
  store.available &&
  !store.busy &&
  !store.activityRunning &&
  !!quote(action)?.allowed;
const cost = (action: Action) => {
  const preview = quote(action),
    c = preview.costs;
  if (!c) return '';
  const text = formatCosts(c);
  return preview.requestedSteps > 1 ? '每次 ' + text : text;
};
const step = computed(() => nextStep(game.value)),
  needsPreparation = computed(() => step.value?.kind === 'prepare');
const needsSchool = computed(
  () =>
    gamePhase(game.value) === 'idle' &&
    C.rank(core.value.player.realm) >= C.rank('qi') &&
    !game.value.school,
);
const goal = computed(() => getBreakthroughGoal(game.value)),
  lifeState = computed(() => lifespanGuidance(game.value));
const pendingStoryError = computed(() => store.unresolved),
  uiLocked = computed(() => store.busy || !store.available);
const recoveryNeeded = computed(() => !!quote({ type: 'REST' })?.allowed),
  producing = computed(
    () =>
      !!store.activity &&
      store.activity.status !== 'stopped' &&
      (store.activity.plan.kind === 'craft' ||
        store.activity.plan.kind === 'forge'),
  );
const breakthrough = computed<Action>(() => ({
  type: core.value.player.realm === 'spirit' ? 'START_TRIAL' : 'BREAKTHROUGH',
}));
const primaryBreakthrough = computed(
  () =>
    props.cultivationHome &&
    (core.value.player.realm === 'spirit'
      ? core.value.player.xp >= realm.value.xpCap
      : !!quote(breakthrough.value)?.allowed),
);
const breakthroughLabel = computed(() =>
  core.value.player.realm === 'mortal'
    ? '引气入体'
    : core.value.player.realm === 'spirit'
      ? '查看渡劫准备'
      : '确认突破',
);
const caveGate = computed(
  () =>
    props.cultivationHome &&
    (primaryBreakthrough.value || needsPreparation.value) &&
    step.value?.kind !== 'recover',
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
const defaultTraining: CultivationPlan = {
  kind: 'cultivation',
  method: 'natural',
  maxCycles: 50,
  until: 'xp-cap',
  stoneBudget: 0,
  stoneReserve: 0,
};
const hubTrainingPlan = computed<CultivationPlan>(() => ({
  ...defaultTraining,
  method: hubTrainingMethod.value,
  stoneBudget:
    hubTrainingMethod.value === 'natural'
      ? 0
      : Math.min(
          core.value.player.stones,
          (quote({ type: 'CULTIVATE', method: 'assisted', count: 1 })?.costs
            ?.stones ?? 0) * 50,
        ),
}));
const hubCycle = computed(() =>
    quote({ type: 'CULTIVATE', method: hubTrainingMethod.value, count: 1 }),
  ),
  hubTrainingQuote = computed(() =>
    previewActivity(game.value, hubTrainingPlan.value),
  );
const naturalCycle = computed(() =>
    quote({ type: 'CULTIVATE', method: 'natural', count: 1 }),
  ),
  trainingQuote = computed(() => previewActivity(game.value, defaultTraining));
const openHub = (
  view: string,
  event?: Event,
  mode?: 'required' | 'checkpoint',
) => emit('open', view, event, mode);
const openPreparation = (event?: Event) => emit('prepare', event);
const inspectCaveDestination = (request: NavigationRequest) =>
  emit('destination', request);
const act = (action: Action) => emit('act', action);
const startTraining = (plan?: CultivationPlan) => emit('start', plan);
const showEquipment = (event?: Event) => emit('school', event);
const inspectLifespan = (event: Event) => emit('life', event);
const showSettings = () => emit('settings');
const viewActivityPlan = () => emit('inspectPlan');
const viewReceipt = () => emit('receipt');
const openTradeoffs = (_kind: 'cultivation', method: 'natural' | 'assisted') =>
  emit('compare', method);
</script>
<template>
  <div
    v-if="immersive"
    class="art06-stage-home"
    :class="{
      'art17-stage': caveGate && !trialReturn?.choice,
      'art17-needs-material': needsPreparation,
      'trial-return-home': !!trialReturn?.choice,
    }"
  >
    <TrialReturnChoices
      v-if="trialReturn?.choice"
      :view="trialReturn"
      @checkpoint="openHub('trial', $event, 'checkpoint')"
      @prepare="openPreparation($event)"
      @record="openHub('trial', $event)"
    />
    <MilestoneGate
      v-else-if="caveGate"
      class="art17-threshold"
      :game="game"
      :kind="core.player.realm === 'spirit' ? 'trial' : 'breakthrough'"
      ><template #object="{ source, phase, engaged, remaining, seconds }"
        ><CaveThresholdObject
          :game="source"
          :phase="phase"
          :engaged="engaged"
          :remaining="remaining"
          :seconds="seconds"
          :failed="!!store.error"
          :enabled="store.available && !store.busy"
          @inspect="openPreparation($event)"
          @navigate="inspectCaveDestination" /></template
      ><template v-if="needsPreparation" #requirements="{ view }"
        ><small
          v-if="trialReturn && !trialReturn.choice"
          data-testid="trial-return-unavailable"
          >{{ trialReturn.notice }}</small
        ><p data-testid="milestone-object-cost"
          >{{
            core.player.realm === 'spirit' ? '入场所需' : '本境突破所需'
          }}：{{ view?.cost }}</p
        ><small>{{ view?.seconds }} 秒 · 仅一次 · 备齐后另行确认</small
        ><small>{{ view?.next }}</small></template
      ><h2 style="line-height: 1.65">{{ goal?.title }}</h2
      ><p>{{ step?.detail }}</p
      ><template #decision
        ><div
          v-if="needsPreparation"
          id="cultivation-actions"
          data-testid="cultivation-actions"
          data-primary-region
          tabindex="-1"
          ><div
            class="art17-preparation-decision"
            data-testid="cultivation-card"
            data-primary-action="prepare"
            ><p data-testid="cultivation-facts">查看不消耗物资</p
            ><button
              class="primary"
              data-testid="journey-prepare"
              @click="openPreparation($event)"
              :disabled="uiLocked"
              >{{ step?.title }} →</button
            ></div
          ></div
        ><button
          v-else
          class="primary"
          data-testid="breakthrough"
          @click="act(breakthrough)"
          :disabled="
            !!pendingStoryError ||
            uiLocked ||
            (core.player.realm !== 'spirit' && !can(breakthrough))
          "
          >{{ breakthroughLabel }}</button
        ><CultivationNotes
          v-if="!needsPreparation"
          data-notes-stage="gate"
          :identity="core.runId + ':gate:' + core.player.realm"
          :context="goal?.title ?? '境门核对'"
          purpose="门槛 · 完整安排"
          ><button @click="openHub('goal')">查看全部门槛与来源</button
          ><button
            data-testid="hub-cultivation-details"
            @click="openHub('cultivation')"
            >查看完整修行安排</button
          ><button
            v-if="store.trialRecovery"
            data-testid="hub-trial-result"
            @click="openHub('trial')"
            >查看渡劫结果与恢复</button
          ></CultivationNotes
        ></template
      ></MilestoneGate
    >
    <CultivationSite
      v-else
      :game="game"
      :method="
        store.activity?.version === 1 && store.activity.status !== 'stopped'
          ? store.activity.plan.method
          : hubTrainingMethod
      "
      @method="hubTrainingMethod = $event"
    >
      <template
        v-if="store.activity && store.activity.status !== 'stopped'"
        #activity
        ><CultivationOngoing @inspect="viewActivityPlan"
      /></template>
      <template #decision>
        <LifespanGuide
          v-if="
            lifeState?.blocked &&
            step?.kind === 'cultivate' &&
            !pendingStoryError
          "
          :game="game"
          stage
          @life="inspectLifespan"
          @checkpoint="showSettings"
        /><CultivationFallback
          v-else
          :game="game"
          :plan="hubTrainingPlan"
          :blocked="pendingStoryError || uiLocked || store.activityRunning"
          @natural="hubTrainingMethod = 'natural'"
        >
          <div v-if="step?.kind !== 'cultivate'" class="hub-action-heading"
            ><h2>{{
              needsSchool
                ? '选择修法'
                : needsPreparation
                  ? step?.title
                  : step?.kind === 'recover'
                    ? step.title
                    : primaryBreakthrough
                      ? goal?.title
                      : '安排一段潜修'
            }}</h2></div
          >
          <p
            class="journey-hint"
            data-testid="journey-hint"
            data-copy30="home"
            >{{
              step?.kind === 'cultivate' ? '修为圆满后再筹备突破' : step?.detail
            }}</p
          >
          <div
            id="cultivation-actions"
            data-primary-region
            tabindex="-1"
            data-testid="cultivation-actions"
            ><div
              data-testid="cultivation-card"
              :data-primary-action="
                needsSchool
                  ? 'school'
                  : needsPreparation
                    ? 'prepare'
                    : step?.kind === 'recover'
                      ? 'recover'
                      : primaryBreakthrough
                        ? 'breakthrough'
                        : 'cultivate'
              "
            >
              <div class="hub-action-facts" data-testid="cultivation-facts"
                ><span v-if="needsSchool || needsPreparation"
                  >查看不消耗物资</span
                ><span v-else-if="step?.kind === 'recover'"
                  >{{ cost({ type: 'REST' }) }} · 每次疗养 30 秒</span
                ><span v-else-if="primaryBreakthrough"
                  >{{ cost(breakthrough) }} ·
                  {{
                    core.player.realm === 'spirit'
                      ? '先核对入劫准备'
                      : '凝神30秒'
                  }}</span
                ><template v-else
                  ><span
                    >每轮修为 +{{ hubCycle?.delta?.xp ?? 0 }} ·
                    {{ (hubTrainingQuote?.cycleMs ?? 0) / 1000 }} 秒</span
                  ><span>{{
                    formatCosts(hubCycle?.costs ?? null)
                  }}</span></template
                ></div
              >
              <button
                v-if="needsSchool"
                class="primary cultivate-primary"
                data-testid="choose-school"
                @click="showEquipment"
                :disabled="uiLocked"
                >选择剑修或符修 →</button
              >
              <button
                v-else-if="needsPreparation"
                class="primary cultivate-primary"
                data-testid="journey-prepare"
                @click="openPreparation($event)"
                :disabled="uiLocked"
                >{{ step?.title }} →</button
              >
              <button
                v-else-if="step?.kind === 'recover'"
                class="primary cultivate-primary"
                data-testid="rest"
                @click="act({ type: 'REST' })"
                :disabled="!can({ type: 'REST' })"
                >安排洞府疗养</button
              >
              <button
                v-else-if="primaryBreakthrough"
                class="primary cultivate-primary"
                data-testid="breakthrough"
                @click="act(breakthrough)"
                :disabled="
                  !!pendingStoryError ||
                  uiLocked ||
                  (core.player.realm !== 'spirit' && !can(breakthrough))
                "
                >{{ breakthroughLabel }}</button
              >
              <button
                v-else
                class="primary cultivate-primary"
                data-testid="cultivate"
                @click="startTraining(hubTrainingPlan)"
                :disabled="
                  !!pendingStoryError ||
                  uiLocked ||
                  store.activityRunning ||
                  !hubTrainingQuote?.allowed
                "
                >{{
                  '开始' +
                  (hubTrainingMethod === 'natural' ? '自然吐纳' : '灵石辅助')
                }}</button
              >
              <p
                v-if="step?.kind === 'cultivate'"
                class="hub-batch-summary"
                data-testid="hub-batch-summary"
                >圆满即停 · 最多50轮 · 灵石上限{{ hubTrainingPlan.stoneBudget
                }}<small v-if="pendingStoryError"
                  >请先处理上方原安排或重新读取</small
                ><small v-else-if="hubTrainingQuote?.failure">{{
                  hubTrainingQuote.failure.message
                }}</small></p
              >
            </div></div
          ></CultivationFallback
        >
      </template>
    </CultivationSite>
    <CultivationNotes
      v-if="!caveGate || needsPreparation"
      data-notes-stage="practice"
      :identity="core.runId + core.player.realm + (step?.kind ?? 'idle')"
      :context="goal?.title ?? '听雨潜修'"
      ><div class="art06-secondary-actions"
        ><p v-if="step?.kind === 'cultivate'">{{ step.detail }}</p
        ><button
          class="text-button"
          data-testid="hub-cultivation-details"
          @click="openHub('cultivation')"
          >查看完整修行安排</button
        ><button
          class="text-button"
          @click="openTradeoffs('cultivation', hubTrainingMethod)"
          >比较两种积累方式</button
        ><button
          v-if="recoveryNeeded"
          class="text-button"
          data-testid="hub-recovery"
          @click="act({ type: 'REST' })"
          >查看疗养安排</button
        ><button
          v-if="store.activity"
          class="text-button"
          @click="openHub('activity')"
          >本段成果与停止</button
        ><button
          v-if="store.trialRecovery"
          class="text-button"
          data-testid="hub-trial-result"
          @click="openHub('trial')"
          >查看渡劫结果与恢复</button
        ></div
      ></CultivationNotes
    >
  </div>
  <template v-else>
    <AssetImage
      v-if="producing && !immersive"
      class="hub-meditation-art"
      path="art/v2/catalogue/alchemy-v1.webp"
      asset-id="hub-production"
      fit="contain"
      eager
      aria-hidden="true"
    /><AssetImage
      v-else-if="!immersive"
      class="hub-meditation-art"
      :path="DESKTOP_UI_ASSETS.meditation"
      asset-id="hub-meditation"
      fit="contain"
      eager
      aria-hidden="true"
    />
    <TrainingActivity
      v-if="store.activity && store.activity.status !== 'stopped' && !immersive"
      :store="store"
      @settings="viewActivityPlan"
      @details="viewReceipt"
    />
    <div
      v-if="immersive && store.activity && store.activity.status !== 'stopped'"
      class="stage-running-copy"
      ><h2>{{ producing ? '炉火与药香' : '静心修行' }}</h2
      ><p>本段安排与暂停在上方，成果保存后计入。</p
      ><button class="text-button" @click="openHub('activity')"
        >查看本段投入与成果</button
      ></div
    >
    <template
      v-else-if="!store.activity || store.activity.status === 'stopped'"
    >
      <div class="hub-action-heading"
        ><div
          ><span class="hub-activity-label">{{
            store.execution?.phase === 'saving'
              ? '保存中'
              : store.execution
                ? '当前行动'
                : '待安排'
          }}</span
          ><h2>{{
            store.execution?.label ??
            (step?.kind === 'cultivate' ? '静心修行' : step?.title)
          }}</h2></div
        ><button
          class="text-button"
          data-testid="hub-cultivation-details"
          @click="openHub('cultivation', $event)"
          >修行设置</button
        ></div
      >
      <p class="journey-hint" data-testid="journey-hint">{{ step?.detail }}</p>

      <div
        id="cultivation-actions"
        class="hub-cultivation"
        tabindex="-1"
        data-primary-region
        data-testid="cultivation-actions"
        ><div
          class="hub-main-action"
          data-testid="cultivation-card"
          :data-primary-action="
            needsSchool
              ? 'school'
              : needsPreparation
                ? 'prepare'
                : step?.kind === 'recover'
                  ? 'recover'
                  : primaryBreakthrough
                    ? 'breakthrough'
                    : 'cultivate'
          "
        >
          <div class="hub-action-facts" data-testid="cultivation-facts"
            ><span v-if="needsSchool || needsPreparation">查看不消耗物资</span
            ><span v-else-if="step?.kind === 'recover'"
              >{{ cost({ type: 'REST' }) }} · 每次疗养 30 秒</span
            ><span v-else-if="primaryBreakthrough"
              >{{
                core.player.realm === 'spirit'
                  ? '查看准备不消耗；正式入场成本：'
                  : ''
              }}{{ cost(breakthrough)
              }}<template v-if="core.player.realm !== 'spirit'">
                · 30 秒在线凝神</template
              ></span
            ><template v-else
              ><span
                >每轮修为 +{{ naturalCycle?.delta?.xp ?? 0 }} ·
                {{ (trainingQuote?.cycleMs ?? 0) / 1000 }} 秒</span
              ><span>{{
                formatCosts(naturalCycle?.costs ?? null)
              }}</span></template
            ></div
          >
          <button
            v-if="needsSchool"
            class="primary cultivate-primary"
            data-testid="choose-school"
            @click="showEquipment"
            :disabled="uiLocked"
            >选择剑修或符修 →</button
          >
          <button
            v-else-if="needsPreparation"
            class="primary cultivate-primary"
            data-testid="journey-prepare"
            @click="openPreparation($event)"
            :disabled="uiLocked"
            >{{ step?.title }} →</button
          >
          <button
            v-else-if="step?.kind === 'recover'"
            class="primary cultivate-primary"
            data-testid="rest"
            @click="act({ type: 'REST' })"
            :disabled="!can({ type: 'REST' })"
            >安排洞府疗养</button
          >
          <button
            v-else-if="primaryBreakthrough"
            class="primary cultivate-primary"
            data-testid="breakthrough"
            @click="act(breakthrough)"
            :disabled="
              core.player.realm === 'spirit' ? uiLocked : !can(breakthrough)
            "
            >{{ breakthroughLabel }}</button
          >
          <button
            v-else
            class="primary cultivate-primary"
            data-testid="cultivate"
            @click="startTraining()"
            :disabled="uiLocked || !trainingQuote?.allowed"
            >开始自然吐纳</button
          >
          <p
            v-if="step?.kind === 'cultivate'"
            class="hub-batch-summary"
            data-testid="hub-batch-summary"
            >修为圆满即停 · 预计 {{ trainingQuote?.cycles ?? 0 }} 轮 · 灵石预算0
            · 最多50轮<small v-if="trainingQuote?.failure">{{
              trainingQuote.failure.message
            }}</small></p
          >
        </div></div
      >
      <div class="hub-context-links"
        ><button
          v-if="recoveryNeeded && step?.kind !== 'recover'"
          class="text-button"
          data-testid="hub-recovery"
          @click="openHub('cultivation', $event)"
          >需要恢复 · 查看洞府疗养</button
        ><button
          v-if="store.trialRecovery"
          class="text-button"
          data-testid="hub-trial-result"
          @click="openHub('trial', $event)"
          >查看渡劫结果</button
        ></div
      >
    </template>
  </template>
</template>
