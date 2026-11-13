<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onScopeDispose,
  ref,
  shallowRef,
} from 'vue';
import type { Action } from '../../src/full/types.ts';
import {
  getLifeRecord,
  getTrialPreparation,
  getAscensionChoices,
} from '../../src/full/queries.ts';
import type { LifeRecord } from '../../src/full/life-record.ts';
import { formatAgeMonths } from '../../src/full/life-record.ts';
import type { AscensionEnding } from '../../src/full/ascension.ts';
import type { SaveMutation } from './full-persistence';
import type { CheckpointSummary, useGame } from './store';
import { gameFocusKey } from './focus';
import { useRuleContent } from './rule-content';
import {
  prepareMilestoneReview,
  milestoneReviewStale,
  type PreparedMilestone,
} from './milestone-view';
import { formatCosts } from './presentation';
import type { Reading } from './story-pages';
import ReviewPages from './ReviewPages.vue';
import type { ClosureNavigation } from './closure-navigation';
const props = defineProps<{
  singleScreen: boolean;
  can: (action: Action) => boolean;
  navigation: ClosureNavigation;
}>();
const store = inject<ReturnType<typeof useGame>>('game-scene')!,
  focus = inject(gameFocusKey)!;
const game = computed(() => store.game),
  ruleContent = useRuleContent(() => store.game);
const pendingStoryError = computed(() => store.unresolved),
  uiLocked = computed(() => store.busy || !store.available);
const can = (action: Action) => props.can(action);
const lifeDialog = ref<HTMLDialogElement>();
const lifeIntent = shallowRef<
  | (PreparedMilestone & {
      record: LifeRecord;
    })
  | null
>(null);
const lifeStale = computed(() => milestoneReviewStale(store, lifeIntent.value));
let alive = true;
async function requestEnd(type: 'RETIRE' | 'END_LIFE') {
  if (!alive || !game.value || pendingStoryError.value || !can({ type }))
    return;
  const prepared = prepareMilestoneReview(store, { type });
  if (!prepared) return;
  lifeIntent.value = { ...prepared, record: getLifeRecord(game.value) };
  const opener = props.navigation.leaveSettings();
  await nextTick();
  if (alive) focus.open(lifeDialog.value, opener);
}
async function confirmEnd() {
  const intent = lifeIntent.value;
  if (!intent || store.busy || pendingStoryError.value || lifeStale.value)
    return;
  const owner = props.navigation.owner(),
    sync = store.syncEpoch;
  await store.startPreparedMilestone(intent.intent);
  if (
    alive &&
    lifeIntent.value === intent &&
    (!store.error ||
      store.wasConfirmedFor(intent.command.commandId, intent.command.runId))
  ) {
    lifeDialog.value?.close();
    props.navigation.accepted(intent, owner, sync, 'life');
  }
}
async function retryEnd() {
  const review = lifeIntent.value;
  if (!review || !store.canRetryFor(review.command.commandId)) return;
  await store.retryFor(review.command.commandId);
  if (
    alive &&
    lifeIntent.value === review &&
    (!store.error ||
      store.wasConfirmedFor(review.command.commandId, review.command.runId))
  )
    lifeDialog.value?.close();
}
function cancelLife(event: Event) {
  if (store.busy) event.preventDefault();
}
function closeLifeReview() {
    if (!alive || lifeDialog.value?.open) return;
  if (lifeIntent.value)
    store.discardRetryFor(lifeIntent.value.command.commandId);
  lifeIntent.value = null;
}
const trialDialog = ref<HTMLDialogElement>();
const trialIntent = shallowRef<
  | (PreparedMilestone & {
      view: ReturnType<typeof getTrialPreparation>;
    })
  | null
>(null);
const trialStale = computed(() =>
  milestoneReviewStale(store, trialIntent.value),
);
async function reviewTrial() {
  if (
    !alive ||
    !game.value ||
    pendingStoryError.value ||
    !can({ type: 'START_TRIAL' })
  )
    return;
  const prepared = prepareMilestoneReview(store, { type: 'START_TRIAL' });
  if (!prepared) return;
  trialIntent.value = { ...prepared, view: getTrialPreparation(game.value) };
  const opener = document.querySelector<HTMLElement>(
    '[data-testid=trial-review-entry]',
  );
  props.navigation.leaveSettings();
  await nextTick();
  if (alive) focus.open(trialDialog.value, opener);
}
async function confirmTrial() {
  const intent = trialIntent.value;
  if (!intent || store.busy || pendingStoryError.value || trialStale.value)
    return;
  const owner = props.navigation.owner(),
    sync = store.syncEpoch;
  await store.startPreparedMilestone(intent.intent);
  if (
    alive &&
    trialIntent.value === intent &&
    (!store.error ||
      store.wasConfirmedFor(intent.command.commandId, intent.command.runId))
  ) {
    trialDialog.value?.close();
    props.navigation.accepted(intent, owner, sync, 'stage');
  }
}
async function retryTrial() {
  const intent = trialIntent.value;
  if (!intent || !store.canRetryFor(intent.command.commandId)) return;
  await store.retryFor(intent.command.commandId);
  if (
    alive &&
    trialIntent.value === intent &&
    (!store.error ||
      store.wasConfirmedFor(intent.command.commandId, intent.command.runId))
  )
    trialDialog.value?.close();
}
function closeTrialReview() {
    if (!alive || trialDialog.value?.open) return;
  if (trialIntent.value)
    store.discardRetryFor(trialIntent.value.command.commandId);
  trialIntent.value = null;
}
const trialRestoreDialog = ref<HTMLDialogElement>();
const trialRestoreIntent = shallowRef<{
  command: SaveMutation;
  checkpoint: CheckpointSummary;
} | null>(null);
const trialRestoreStale = computed(
  () =>
    !!trialRestoreIntent.value &&
    (!game.value ||
      game.value.core.runId !==
        trialRestoreIntent.value.command.expectedRunId ||
      game.value.core.revision !==
        trialRestoreIntent.value.command.expectedRevision),
);
async function requestTrialRestore() {
  if (
    !alive ||
    store.checkpointSummary?.kind !== 'trial' ||
    pendingStoryError.value
  )
    return;
  const command = store.prepareCheckpoint();
  if (!command) return;
  trialRestoreIntent.value = {
    command,
    checkpoint: structuredClone(store.checkpointSummary),
  };
  const opener = document.querySelector<HTMLElement>(
    '[data-testid=trial-restore-open]',
  );
  await nextTick();
  if (alive) focus.open(trialRestoreDialog.value, opener);
}
async function confirmTrialRestore() {
  const review = trialRestoreIntent.value;
  if (!review || store.busy || trialRestoreStale.value) return;
  await store.restorePrepared(review.command);
  if (alive && !store.error) {
    trialRestoreDialog.value?.close();
    await props.navigation.showTrialPreparation();
  }
}
async function retryTrialRestore() {
  const review = trialRestoreIntent.value;
  if (!review || store.busy || !store.canRetryFor(review.command.commandId))
    return;
  await store.retryFor(review.command.commandId);
  if (alive && !store.error) {
    trialRestoreDialog.value?.close();
    await props.navigation.showTrialPreparation();
  }
}
function closeTrialRestore() {
    if (!alive || trialRestoreDialog.value?.open) return;
  if (trialRestoreIntent.value)
    store.discardRetryFor(trialRestoreIntent.value.command.commandId);
  trialRestoreIntent.value = null;
}
const ascensionDialog = ref<HTMLDialogElement>();
const ascensionIntent = shallowRef<
  | (PreparedMilestone & {
      view: ReturnType<typeof getAscensionChoices>;
      choice: ReturnType<typeof getAscensionChoices>['choices'][number];
      ending: AscensionEnding;
    })
  | null
>(null);
const ascensionStale = computed(() =>
  milestoneReviewStale(store, ascensionIntent.value),
);
async function reviewAscension(ending: AscensionEnding) {
  if (
    !alive ||
    !game.value ||
    pendingStoryError.value ||
    !can({ type: 'END', ending })
  )
    return;
  const prepared = prepareMilestoneReview(store, { type: 'END', ending });
  if (!prepared) return;
  const view = getAscensionChoices(game.value);
  ascensionIntent.value = {
    ...prepared,
    view,
    choice: view.choices.find((choice) => choice.ending === ending)!,
    ending,
  };
  const opener = document.querySelector<HTMLElement>(
    `[data-testid=ending-${ending}]`,
  );
  await nextTick();
  if (alive) focus.open(ascensionDialog.value, opener);
}
async function confirmAscension() {
  const review = ascensionIntent.value;
  if (!review || store.busy || pendingStoryError.value || ascensionStale.value)
    return;
  const owner = props.navigation.owner(),
    sync = store.syncEpoch;
  await store.startPreparedMilestone(review.intent);
  if (
    alive &&
    ascensionIntent.value === review &&
    (!store.error ||
      store.wasConfirmedFor(review.command.commandId, review.command.runId))
  ) {
    ascensionDialog.value?.close();
    props.navigation.accepted(review, owner, sync, 'life');
  }
}
async function retryAscension() {
  const review = ascensionIntent.value;
  if (!review || !store.canRetryFor(review.command.commandId)) return;
  await store.retryFor(review.command.commandId);
  if (
    alive &&
    ascensionIntent.value === review &&
    (!store.error ||
      store.wasConfirmedFor(review.command.commandId, review.command.runId))
  )
    ascensionDialog.value?.close();
}
function closeAscension() {
    if (!alive || ascensionDialog.value?.open) return;
  if (ascensionIntent.value)
    store.discardRetryFor(ascensionIntent.value.command.commandId);
  ascensionIntent.value = null;
}
function confirmationReadings(kind: string): Reading[] {
  if (kind === 'life' && lifeIntent.value) {
    const r = lifeIntent.value.record;
    return [
      {
        key: 'identity',
        title: '当前人生',
        testId: 'life-review',
        text:
          r.overview.name +
          ' · ' +
          r.overview.ageLabel +
          ' · ' +
          r.overview.realmName +
          ' · 行道' +
          r.overview.elapsedMonths +
          '游戏月',
      },
      {
        key: 'scope',
        title: '保留与恢复',
        text: '当前存档与人物记录保留，可导出；恢复检查点会回退完整准备状态。此确认不会开启新的人生。',
      },
    ];
  }
  if (kind === 'ending' && ascensionIntent.value) {
    const r = ascensionIntent.value.view.record;
    return [
      {
        key: 'identity',
        title: '当前人生',
        testId: 'ascension-review-identity',
        text:
          r.overview.name +
          ' · ' +
          r.overview.ageLabel +
          ' · 行道' +
          r.overview.elapsedMonths +
          '游戏月',
      },
      { key: 'opening', title: '开卷', text: r.opening.text },
      {
        key: 'training',
        title: '配装',
        text:
          r.training.school +
          ' · ' +
          r.training.loadout.map((s) => s.name).join(' / ') +
          ' · ' +
          r.training.equippedRelic,
      },
      ...r.decisions.map((d) => ({ key: d.id, title: d.npc, text: d.text })),
      { key: 'pledges', title: '护阵', text: r.pledges.text },
    ];
  }
  if (kind === 'restore' && trialRestoreIntent.value) {
    const r = trialRestoreIntent.value.checkpoint.target;
    return [
      {
        key: 'identity',
        title: '恢复目标',
        testId: 'trial-restore-target',
        text:
          r.name +
          ' · ' +
          ruleContent.value.realms[r.realm].name +
          ' · 行道' +
          r.months +
          '游戏月',
      },
      {
        key: 'supplies',
        title: '准备状态',
        text:
          '气血 ' +
          r.hp +
          ' · 灵力 ' +
          r.mp +
          ' · 渡劫引 ' +
          r.inventory.ascension_seal,
      },
    ];
  }
  if (kind === 'entry' && trialIntent.value) {
    const r = trialIntent.value.view,
      p = r.preparation,
      m = r.snapshotSummary;
    return [
      {
        key: 'identity',
        title: '正式入场',
        testId: 'trial-review-identity',
        text:
          m.name +
          ' · ' +
          m.realm +
          ' · ' +
          formatAgeMonths(m.ageMonths) +
          ' · 行道' +
          m.elapsedMonths +
          '游戏月',
      },
      {
        key: 'stats',
        title: '气血灵力',
        text:
          '气血 ' +
          p.hp +
          ' / ' +
          p.maxHp +
          ' · 灵力 ' +
          p.mp +
          ' / ' +
          p.maxMp +
          ' · 灵石 ' +
          m.stones,
      },
      {
        key: 'loadout',
        title: '配装',
        text: p.loadout.map((s) => s.name).join(' / ') + ' · ' + p.relic,
      },
      {
        key: 'scope',
        title: '完整准备范围',
        text: '包括全部已掌握与剑简资格、背包、装备/法宝、人物选择、里程碑与当前进度，不只保存境界。',
      },
      {
        key: 'inventory',
        title: '准备物资',
        text: m.inventory.map((i) => i.name + ' ×' + i.quantity).join(' · '),
      },
      {
        key: 'records',
        title: '已掌握记录',
        text:
          '已掌握 ' +
          m.learned.length +
          '项，已有法宝 ' +
          m.relics.length +
          '件，已选事件 ' +
          m.choiceCount +
          '项。',
      },
      {
        key: 'journey',
        title: '入场之后',
        text: '开始后先回答问心，准备与消耗跨三关保留。此处只确认入场，不代表已经渡劫成功。',
      },
    ];
  }
  return [];
}
onScopeDispose(() => {
  alive = false;
  for (const dialog of [
    lifeDialog,
    trialDialog,
    trialRestoreDialog,
    ascensionDialog,
  ])
    focus.release(dialog.value);
});
defineExpose({ requestEnd, reviewTrial, reviewAscension, requestTrialRestore });
</script>
<template>
<dialog ref="lifeDialog" class="paper life-confirm closure-focus" data-testid="life-confirmation" aria-labelledby="life-confirm-title" @cancel="cancelLife" @close="closeLifeReview">
<template v-if="lifeIntent">
<header><h2 id="life-confirm-title" tabindex="-1" data-dialog-initial>{{lifeIntent.command.type==='RETIRE'?'确认主动归隐':'确认度过最后余月'}}</h2></header>
<template v-if="singleScreen"><p>{{lifeIntent.command.type==='RETIRE'?'本次完成并保存后主动归隐，不消耗剩余游戏月，不写作寿尽。':'本次完成并保存后消耗实际最后余月（不超过12月），达到当前境界寿限，以寿尽收卷。'}}</p><details class="milestone-notes"><summary>此生记录与保存说明</summary><ReviewPages :rows="confirmationReadings('life')" :identity="lifeIntent.command.commandId"/></details></template><template v-else>
<p data-testid="life-review">{{lifeIntent.record.overview.name}} · {{lifeIntent.record.overview.ageLabel}} · {{lifeIntent.record.overview.realmName}} · 行道{{lifeIntent.record.overview.elapsedMonths}}游戏月</p>
<p>{{lifeIntent.command.type==='RETIRE'?'本次完成并保存后以主动归隐收卷，不消耗剩余游戏月，不写作寿尽。':'本次完成并保存后将消耗实际最后余月（不超过12月），达到当前境界寿限，以寿尽收卷。'}}</p>
<p>当前存档与人物记录保留，可导出；恢复检查点会回退完整准备状态。此确认不会开启新的人生。</p>
</template>
<p>收卷结束当前人生，不能撤销为继续此卷；不耗物，12秒在线完成后才保存结果。</p>
<p v-if="lifeStale" role="alert" data-testid="life-stale">进度已更新，请取消后重新查看与确认。此处不会结束另一份进度。</p>
<p v-if="store.error" role="alert" data-testid="life-error">{{store.error}}</p>
<button v-if="store.canRetryFor(lifeIntent.command.commandId)" data-testid="life-retry" @click="retryEnd" :disabled="store.busy">重试同一次收卷</button>
<button data-testid="life-cancel" @click="lifeDialog?.close()" :disabled="store.busy">继续此生</button>
<button class="primary" data-testid="life-confirm-end" @click="confirmEnd" :disabled="uiLocked || lifeStale || pendingStoryError">{{store.busy?store.saveLabel+'…':lifeIntent.command.type==='RETIRE'?'安排归隐一次 · 12秒':'安排寿尽一次 · 12秒'}}</button>
</template>
</dialog>
<dialog ref="ascensionDialog" class="paper life-confirm closure-focus" data-testid="ascension-confirmation" aria-labelledby="ascension-title" @cancel="cancelLife" @close="closeAscension">
<template v-if="ascensionIntent">
<h2 id="ascension-title" tabindex="-1" data-dialog-initial>确认{{ascensionIntent.choice.label}}</h2>
<template v-if="singleScreen"><p data-testid="ascension-review-description">{{ascensionIntent.choice.description}}</p><p>12秒·不耗物，以所选结尾封卷。本卷修炼与战斗结束，不能继续此卷。</p><details class="milestone-notes"><summary>此生来路与保存说明</summary><ReviewPages :rows="confirmationReadings('ending')" :identity="ascensionIntent.command.commandId"/><p>本次12秒在线完成并保存后以所选结尾封卷，不再继续本卷修炼或战斗。当前物品、配装与人物记录保留，不新增道具或上界玩法。</p></details></template><template v-else>
<p data-testid="ascension-review-identity">{{ascensionIntent.view.record.overview.name}} · {{ascensionIntent.view.record.overview.ageLabel}} · 行道{{ascensionIntent.view.record.overview.elapsedMonths}}游戏月</p>
<p data-testid="ascension-review-description">{{ascensionIntent.choice.description}}</p>
<p>本次12秒在线完成并保存后，以所选结尾封卷。不再继续本卷的修炼或战斗；当前物品、配装与人物记录保留，不新增道具奖励或上界玩法。</p>
<details><summary>此生实际来路</summary><p>{{ascensionIntent.view.record.opening.text}}</p><p>{{ascensionIntent.view.record.training.school}} · {{ascensionIntent.view.record.training.loadout.map(slot=>slot.name).join(' / ')}} · {{ascensionIntent.view.record.training.equippedRelic}}</p><p v-for="decision in ascensionIntent.view.record.decisions" :key="decision.id">{{decision.npc}} · {{decision.text}}</p><p v-if="!ascensionIntent.view.record.decisions.length">没有其他已选事件记录，不补写故人或盟约。</p><p>{{ascensionIntent.view.record.pledges.text}}</p></details>
</template>
<p v-if="ascensionStale" data-testid="ascension-stale" role="alert">进度已更新，请取消后重新核对；此处不会替另一份进度选择结尾。</p>
<p v-if="store.error" data-testid="ascension-error" role="alert">{{store.error}}</p>
<button v-if="store.canRetryFor(ascensionIntent.command.commandId)" data-testid="ascension-retry" @click="retryAscension" :disabled="store.busy">重试同一次封卷</button>
<button data-testid="ascension-cancel" @click="ascensionDialog?.close()" :disabled="store.busy">继续核对</button>
<button class="primary" data-testid="ascension-confirm" @click="confirmAscension" :disabled="uiLocked || ascensionStale || pendingStoryError">{{store.busy?store.saveLabel+'…':'安排飞升收卷一次 · 12秒'}}</button>
</template>
</dialog>
    <dialog ref="trialRestoreDialog" class="paper life-confirm" data-testid="trial-restore-confirmation" aria-labelledby="trial-restore-title" @cancel="cancelLife" @close="closeTrialRestore">
      <template v-if="trialRestoreIntent">
        <h2 id="trial-restore-title" tabindex="-1" data-dialog-initial>恢复完整入场准备</h2>
        <template v-if="singleScreen"><p>将放弃本轮及入场后的进展，物品、气血灵力、配装、人物选择、里程碑和年月一同回到准备记录。不会单独补发渡劫引，成功后仍可再次使用此检查点。</p><ReviewPages :rows="confirmationReadings('restore')" :identity="trialRestoreIntent.command.commandId"/></template><template v-else>
        <p data-testid="trial-restore-target">{{trialRestoreIntent.checkpoint.target.name}} · {{ruleContent.realms[trialRestoreIntent.checkpoint.target.realm].name}} · 行道{{trialRestoreIntent.checkpoint.target.months}}游戏月</p>
        <p>将放弃本轮及入场后的进展，物品、气血灵力、配装、人物选择、里程碑和年月一同回到该准备记录。不会单独补发渡劫引；恢复成功后，仍可再次使用这个检查点。</p>
        <p>准备气血 {{trialRestoreIntent.checkpoint.target.hp}} · 灵力 {{trialRestoreIntent.checkpoint.target.mp}} · 渡劫引 {{trialRestoreIntent.checkpoint.target.inventory.ascension_seal}}</p>
        </template>
        <p v-if="trialRestoreStale&&!store.canRetryFor(trialRestoreIntent.command.commandId)" role="alert" data-testid="trial-restore-stale">进度已更新，请关闭后重新核对；此处不会回退另一份进度。</p>
        <p v-if="store.error" role="alert" data-testid="trial-restore-error">{{store.canRetryFor(trialRestoreIntent.command.commandId)&&game?.core.runId===trialRestoreIntent.command.runId?'恢复回复未能确认，请重试同一次恢复核对已保存进度。':store.error}}</p>
        <button v-if="store.canRetryFor(trialRestoreIntent.command.commandId)" data-testid="trial-restore-retry" @click="retryTrialRestore" :disabled="store.busy">重试同一次完整恢复</button>
        <button data-testid="trial-restore-cancel" @click="trialRestoreDialog?.close()" :disabled="store.busy">保留当前进度</button>
        <button data-testid="trial-restore-confirm" class="primary" @click="confirmTrialRestore" :disabled="uiLocked || trialRestoreStale">{{store.busy?store.saveLabel+'…':'确认恢复完整准备'}}</button>
      </template>
    </dialog>
<dialog ref="trialDialog" class="paper life-confirm closure-focus" data-testid="trial-entry-confirmation" aria-labelledby="trial-entry-title" @cancel="cancelLife" @close="closeTrialReview">
<template v-if="trialIntent">
<header><h2 id="trial-entry-title" tabindex="-1" data-dialog-initial>核对正式入场</h2></header>
<template v-if="singleScreen"><p data-testid="trial-review-cost">入场实际成本：{{formatCosts(trialIntent.view.costs)}} · 在线15秒</p><p>登台后先问心，再迎三关；此举只入场，不代表渡劫成功。</p><details class="milestone-notes"><summary>完整准备与入场说明</summary><ReviewPages :rows="confirmationReadings('entry')" :identity="trialIntent.command.commandId"/><p>安排不扣物；在线15秒完成后，扣物、完整准备与问心同次保存成功才进入。</p></details></template><template v-else>
<p data-testid="trial-review-identity">{{trialIntent.view.snapshotSummary.name}} · {{trialIntent.view.snapshotSummary.realm}} · {{formatAgeMonths(trialIntent.view.snapshotSummary.ageMonths)}} · 行道{{trialIntent.view.snapshotSummary.elapsedMonths}}游戏月</p>
<p data-testid="trial-review-cost">入场实际成本：{{formatCosts(trialIntent.view.costs)}}。安排不扣物；在线15秒完成后，扣物、完整准备与问心同次保存成功才进入。</p>
<p>气血 {{trialIntent.view.preparation.hp}} / {{trialIntent.view.preparation.maxHp}} · 灵力 {{trialIntent.view.preparation.mp}} / {{trialIntent.view.preparation.maxMp}} · 灵石 {{trialIntent.view.snapshotSummary.stones}}</p>
<p>配装：{{trialIntent.view.preparation.loadout.map(slot=>slot.name).join(' / ')}} · {{trialIntent.view.preparation.relic}}</p>
<details><summary>即将保存的完整准备范围</summary><p>包括全部已掌握与剑简资格、背包、装备/法宝、人物选择、里程碑与当前进度；不只保存境界。</p><p>{{trialIntent.view.snapshotSummary.inventory.map(item=>item.name+' ×'+item.quantity).join(' · ')}}</p><p>已掌握 {{trialIntent.view.snapshotSummary.learned.length}}项，已有法宝 {{trialIntent.view.snapshotSummary.relics.length}}件，已选事件 {{trialIntent.view.snapshotSummary.choiceCount}}项。</p></details>
<p>开始后先回答问心，准备与消耗跨三关保留。此处只确认入场，不代表已经渡劫成功。</p>
</template>
<p v-if="trialStale" role="alert" data-testid="trial-review-stale">进度已更新，请返回准备页重新核对；此处不会启动另一份进度。</p>
<p v-if="store.error" role="alert" data-testid="trial-entry-error">{{store.error}}</p>
<button v-if="store.canRetryFor(trialIntent.command.commandId)" data-testid="trial-entry-retry" @click="retryTrial" :disabled="store.busy">重试同一次入场</button>
<button data-testid="trial-entry-cancel" @click="trialDialog?.close()" :disabled="store.busy">返回准备</button>
<button class="primary" data-testid="trial-confirm-entry" @click="confirmTrial" :disabled="uiLocked || trialStale">{{store.busy?store.saveLabel+'…':'安排登台一次 · 15秒'}}</button>
</template>
</dialog>
</template>
