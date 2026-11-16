<script setup lang="ts">
import { computed, inject } from 'vue';
import type { Game } from '../../src/full/types.ts';
import type { useGame } from './store';
import { lifespanGuidance } from './lifespan-guidance';
const props = defineProps<{ game: Game; stage?: boolean }>();
const emit = defineEmits<{ life: [Event]; checkpoint: [Event] }>();
const store = inject<ReturnType<typeof useGame>>('game-scene');
const view = computed(() => lifespanGuidance(props.game));
const checkpoint = computed(
  () =>
    !!store?.hasCheckpoint &&
    !!store.checkpointSummary &&
    store.available &&
    !store.syncIssue,
);
</script>
<template>
  <section
    v-if="view"
    :class="stage ? 'lifespan-stage' : 'paper lifespan-warning'"
    role="status"
    :data-testid="stage ? 'lifespan-guidance' : 'lifespan-warning'"
  >
    <template v-if="stage"
      ><small>当前岁月 · 余寿 {{ view.life.remainingMonths }} 游戏月</small
      ><h2>寿元将尽，先看此生去向</h2><p>余寿不足下一轮修炼，当前不能再入定。</p
      ><p
        >已保存的修为与物资仍在。查看去向不会收卷，也不会替你作出选择。</p
      ></template
    >
    <template v-else
      ><strong
        >余寿 {{ view.life.remainingMonths }} 游戏月 ·
        {{ view.life.ageLabel }}</strong
      ><p>{{
        view.last
          ? '请核对下一轮所需岁月。若修为与突破物已齐，仍可核对突破条件；也可先查看此生去向，收卷须另行确认。'
          : '游戏月在已安排的周期完成时消耗；离开累计同样遵守原预算与余寿。暂停后的阅读不扣余寿，请核对当前准备与检查点。'
      }}</p></template
    >
    <button
      :class="stage ? 'primary cultivate-primary' : undefined"
      :data-testid="stage ? 'lifespan-inspect-life' : 'lifespan-open-life'"
      @click="emit('life', $event)"
      >{{ stage ? '查看寿元与收卷选择' : '查看生平与收卷选择' }}</button
    >
    <button
      v-if="checkpoint"
      class="text-button"
      data-testid="lifespan-inspect-checkpoint"
      @click="emit('checkpoint', $event)"
      >核对已保存的准备记录</button
    >
  </section>
</template>
<style scoped>
@layer game {
  .lifespan-stage {
    display: grid;
    gap: 12px;
    font-size: 18px;
    line-height: 1.5;
  }
  .lifespan-stage h2 {
    font-size: 26px;
    margin: 0;
    line-height: 1.65;
  }
  .lifespan-stage p {
    margin: 0;
  }
  .lifespan-stage small {
    font-size: 14px;
    color: var(--palette-muted);
  }
  .lifespan-stage button {
    min-height: 44px;
    font-size: 18px;
  }
  .lifespan-stage .cultivate-primary {
    width: 100%;
    margin-top: 4px;
  }
}
</style>
