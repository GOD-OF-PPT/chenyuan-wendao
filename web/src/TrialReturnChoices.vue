<script setup lang="ts">
import type { trialReturnView } from './trial-return';
defineProps<{ view: NonNullable<ReturnType<typeof trialReturnView>> }>();
const emit = defineEmits<{
  checkpoint: [Event];
  prepare: [Event];
  record: [Event];
}>();
</script>
<template>
  <section
    class="trial-return"
    data-testid="trial-return"
    data-primary-region
    tabindex="-1"
  >
    <div class="trial-return-mark" aria-hidden="true"
      ><span>返</span><small>来路仍在 · 归途可择</small></div
    >
    <div class="trial-return-decision"
      ><small>听雨洞府 · 行前再议</small><h2>{{ view.title }}</h2
      ><p>{{ view.state }}</p
      ><p
        >当前渡劫引 {{ view.currentSeal
        }}<span v-if="view.canRestore">
          · 准备清单 {{ view.savedSeal }}（非当前库存）</span
        ></p
      >
      <p v-if="view.canRestore"
        >完整恢复会让物品、年月、配装与人物选择一同回退。不会单独补发渡劫引，阅读后再确认。</p
      ><p v-else>{{ view.notice }}</p>
      <button
        v-if="view.canRestore"
        class="primary"
        data-testid="trial-return-inspect"
        @click="emit('checkpoint', $event)"
        >查看完整恢复</button
      >
      <div class="trial-return-actions"
        ><button data-testid="journey-prepare" @click="emit('prepare', $event)"
          >保留当前进度，查看重新筹备</button
        ><button
          v-if="view.canRecord"
          class="text-button"
          data-testid="trial-return-record"
          @click="emit('record', $event)"
          >查看本轮记录</button
        ></div
      >
    </div>
  </section>
</template>
<style scoped>
@layer game {
  :global(#app .art06-stage-home.trial-return-home) {
    grid-template-rows: minmax(0, 1fr) auto;
    align-content: stretch;
    gap: 0;
  }
  .trial-return {
    display: grid;
    grid-template-columns: 240px minmax(0, 680px);
    gap: 34px;
    align-items: center;
    justify-content: center;
    align-self: center;
    justify-self: center;
    min-width: 0;
    width: calc(100% - 80px);
    max-width: 1120px;
    padding: 16px 0;
    color: var(--palette-ink);
  }
  .trial-return-mark {
    height: 250px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border-block: 3px double var(--palette-gold);
    border-radius: 44% 44% 12% 12%;
    background: radial-gradient(
      ellipse,
      color-mix(in srgb, var(--palette-line) 33.33333333%, transparent),
      transparent 72%
    );
    color: var(--palette-ink);
  }
  .trial-return-mark > span {
    font:
      104px/1.2 'Kaiti SC',
      STKaiti,
      serif;
    text-shadow: 0 10px 18px var(--palette-night);
  }
  .trial-return-mark > small {
    font-size: 14px;
    line-height: 1.5;
  }
  .trial-return-decision {
    display: grid;
    gap: 10px;
    min-width: 0;
    padding: 16px 24px;
    border-left: 2px solid var(--palette-jade);
    background: linear-gradient(
      100deg,
      color-mix(in srgb, var(--palette-panel) 94.90196078%, transparent),
      color-mix(in srgb, var(--palette-night) 90.98039216%, transparent)
    );
  }
  .trial-return-decision h2 {
    font:
      28px/1.5 'Kaiti SC',
      STKaiti,
      serif;
    color: var(--palette-ink);
    margin: 0;
  }
  .trial-return-decision p {
    font-size: 18px;
    line-height: 1.65;
    margin: 0;
  }
  .trial-return-decision small {
    font-size: 14px;
    line-height: 1.55;
  }
  .trial-return-decision button {
    font-size: 18px;
    min-height: 48px;
    margin: 0;
    white-space: normal;
  }
  .trial-return-decision > .primary {
    width: 100%;
  }
  .trial-return-actions {
    display: flex;
    align-items: stretch;
    gap: 12px;
    min-width: 0;
  }
  .trial-return-actions > button:first-child {
    flex: 1;
    min-width: 0;
  }
  .trial-return-actions > .text-button {
    flex: none;
  }
  :global(#app .trial-return-home > .cultivation-notes) {
    justify-self: end;
    align-self: end;
    margin: 0 40px 16px 0;
  }
}
</style>
