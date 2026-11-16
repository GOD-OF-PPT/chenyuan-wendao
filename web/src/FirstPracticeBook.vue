<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Game } from '../../src/full/types';
import type { Activity } from '../../src/full/activity';
import { contentForGame } from '../../src/full/rule-content';
import {
  practiceKinds,
  practiceLesson,
  practiceResult,
  firstBattleHint,
  type PracticeKind,
} from './first-practice';
import type { PracticeIntent } from './use-first-practice';
import { SCENE_ASSETS, DESKTOP_UI_ASSETS, ENEMY_ASSETS } from './assets';
import { formatCosts } from './presentation';
import { activityView } from './activity-view';
import AssetImage from './AssetImage.vue';
const props = defineProps<{
  game: Game;
  activity: Activity | null;
  blocked: string;
  sourceIssue: string;
}>();
const emit = defineEmits<{
  inspect: [PracticeIntent];
  start: [PracticeIntent];
  battle: [];
}>();
const element = ref<HTMLDialogElement>(),
  kind = ref<PracticeKind>('commission');
const lesson = computed(() => practiceLesson(props.game, kind.value)),
  content = computed(() => contentForGame(props.game)),
  feedback = computed(() =>
    practiceResult(props.game, kind.value, props.activity),
  ),
  battle = computed(() => firstBattleHint(props.game));
const pausedName = computed(() =>
  props.activity?.status === 'paused' &&
  props.activity.runId === props.game.core.runId
    ? activityView(props.activity, props.game).name
    : '',
);
const samePlace = computed(
    () => props.game.core.world.location === lesson.value.location,
  ),
  image = computed(() =>
    kind.value === 'commission'
      ? SCENE_ASSETS.sect
      : kind.value === 'assisted'
        ? DESKTOP_UI_ASSETS.meditation
        : ENEMY_ASSETS.wolf,
  );
const labels = {
  commission: '一趟杂务',
  assisted: '一轮辅助',
  encounter: '首战读敌意',
};
const intent = (): PracticeIntent => ({
  kind: kind.value,
  source: { ...lesson.value.source },
});
watch(
  () => props.game.core.runId,
  () => (kind.value = 'commission'),
);
defineExpose({ element });
</script>
<template>
  <dialog
    ref="element"
    class="paper first-practice-book"
    aria-labelledby="first-practice-title"
    data-testid="first-practice-book"
  >
    <header
      ><div
        ><small>行道录 · 可以随时重看</small
        ><h2 id="first-practice-title" tabindex="-1" data-dialog-initial
          >入门练手</h2
        ></div
      >
      <button data-testid="practice-close" @click="element?.close()"
        >合上练手册</button
      ></header
    >
    <p
      >挣一笔灵石，试一轮辅助，再读懂敌意。可以随时回到修行，也能从帮助重新翻阅。</p
    >
    <nav aria-label="练手篇章"
      ><button
        v-for="id in practiceKinds"
        :key="id"
        :aria-pressed="kind === id"
        :data-testid="'practice-tab-' + id"
        @click="kind = id"
        >{{ labels[id] }}</button
      ></nav
    >
    <section class="practice-leaf" :data-practice="kind">
      <figure aria-hidden="true"
        ><AssetImage
          :path="image"
          :asset-id="'practice-' + kind"
          fit="contain"
          eager
          ><span>{{ labels[kind] }}</span></AssetImage
        ></figure
      >
      <div
        ><h3>{{ lesson.title }}</h3
        ><p>{{ lesson.purpose }}</p>
        <p class="practice-cost" data-testid="practice-cost"
          >地点：{{ content.locations[lesson.location].name }}<br />
          本次{{
            kind === 'assisted'
              ? '一轮'
              : kind === 'commission'
                ? '一趟'
                : '只迎战'
          }}
          · {{ lesson.quote.cycleMs / 1000 }}秒 ·
          {{ formatCosts(lesson.actionQuote.costs) }}</p
        >
        <p v-if="kind === 'commission'"
          >完成并保存这一趟，灵石 +{{
            lesson.gainedStones
          }}；不会替你采购或开启辅助修炼。</p
        >
        <p v-else-if="kind === 'assisted' && lesson.quote.allowed"
          >本轮预计修为 +{{ lesson.quote.xp }}；同地自然吐纳为 +{{
            lesson.natural?.delta?.xp ?? 0
          }}。这一轮完毕即停，下一段仍由你安排。</p
        >
        <p v-else-if="kind === 'assisted'"
          >抵达洞府后再核对本轮修为与自然吐纳的差异；灵石预算只够这一次已显示的费用。</p
        >
        <p v-else
          >迎战后先停在战局，出招与用药另行选择。注意气血和敌方重击，必要时暂停、补给或撤退。</p
        >
        <p v-if="lesson.encounter && !game.battle" data-testid="practice-prebattle-facts"
          >己方气血 {{ lesson.encounter.playerHp }} /
          {{ lesson.encounter.playerMaxHp }}，妖狼气血
          {{ lesson.encounter.enemy.hp }}。<br />
          每招 {{ lesson.encounter.battleMs / 1000 }} 秒；回春丹
          {{ lesson.encounter.healingCount }} 枚，回灵丹
          {{ lesson.encounter.spiritCount }} 枚。<br />
          首回合试探，随后蓄势、重击；普通伤害
          {{ lesson.encounter.enemy.attack }} / 重击
          {{
            lesson.encounter.enemy.heavy
          }}，净损随护体与配装变化。只迎战，不自动用药。</p
        >
      </div>
    </section>
    <p v-if="feedback" class="practice-result" data-testid="practice-result">{{
      feedback.text
    }}</p>
    <p v-if="kind === 'encounter' && battle" data-testid="practice-enemy-hint"
      ><strong>当前敌意：{{ battle.intent.name }}</strong
      >。{{ battle.guidance }} 回春丹实有
      {{ battle.healingCount }} 枚；服丹占一个回合。</p
    >
    <p
      v-if="sourceIssue || blocked"
      role="status"
      data-testid="practice-blocked"
      >{{ sourceIssue || blocked }}</p
    >
    <p v-else-if="samePlace && !lesson.quote.allowed" role="status">{{
      lesson.quote.failure?.message
    }}</p>
    <footer>
      <p v-if="pausedName" data-testid="practice-replacement"
        >当前“{{
          pausedName
        }}”已暂停。确认将另开本页这一次，保留已得成果；这是新安排，不是继续原段。</p
      >
      <button
        v-if="kind === 'encounter' && game.battle"
        class="primary"
        data-testid="practice-current-battle"
        :disabled="!!sourceIssue"
        @click="emit('battle')"
        >返回当前战局，查看攻守</button
      >
      <template v-else-if="!samePlace"
        ><p
          >行旅只抵达，不接下一活动。{{ formatCosts(lesson.travel.costs) }} ·
          {{ lesson.travelMs / 1000 }}秒；下面先查看安排。</p
        >
        <button
          class="primary"
          data-testid="practice-inspect"
          :disabled="!!sourceIssue"
          @click="emit('inspect', intent())"
          >查看前往{{
            content.locations[lesson.location].name
          }}的行旅安排</button
        ></template
      >
      <button
        v-else
        class="primary"
        data-testid="practice-confirm"
        :disabled="!!blocked || !lesson.quote.allowed"
        @click="emit('start', intent())"
        >{{ lesson.confirm }}</button
      >
    </footer>
    <small class="practice-reading"
      >翻页与查看不消耗。确认只安排本页这一项，成果在保存后计入；下一项由你另行决定。</small
    >
  </dialog>
</template>
<style scoped>
@layer game {
  .first-practice-book {
    width: 850px;
    max-width: calc(100vw - 64px);
    padding: 24px;
    color: var(--game-ink);
  }
  .first-practice-book header,
  .first-practice-book nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .first-practice-book h2,
  .first-practice-book h3,
  .first-practice-book p,
  .first-practice-book figure {
    margin: 0;
  }
  .first-practice-book h2 {
    font-size: var(--ui24);
  }
  .first-practice-book h3 {
    font-size: var(--ui20);
    margin-bottom: 12px;
  }
  .first-practice-book p {
    font-size: var(--ui18);
    line-height: 1.6;
    margin-block: 12px;
  }
  .first-practice-book small {
    font-size: var(--ui14);
    line-height: 1.5;
  }
  .first-practice-book nav {
    justify-content: flex-start;
    margin-block: 16px;
  }
  .first-practice-book button {
    min-height: 44px;
    font-size: var(--ui18);
  }
  .practice-leaf {
    display: grid;
    grid-template-columns: 210px 1fr;
    gap: 24px;
    align-items: center;
  }
  .practice-leaf figure {
    height: 210px;
  }
  .practice-leaf :deep(.asset-image) {
    height: 100%;
    width: 100%;
  }
  .practice-leaf :deep(img) {
    max-height: 210px;
    object-fit: contain;
  }
  .practice-cost,
  .practice-result {
    border-inline-start: 3px solid var(--game-jade);
    padding-inline-start: 12px;
  }
  .practice-reading {
    display: block;
    margin-top: 16px;
  }
}
</style>
