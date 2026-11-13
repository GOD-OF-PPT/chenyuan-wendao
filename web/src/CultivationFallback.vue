<script setup lang="ts">
import { computed, inject, nextTick } from 'vue';
import type { Game } from '../../src/full/types';
import type { CultivationPlan } from '../../src/full/activity';
import { cultivationFallback } from './cultivation-fallback';
import { gameFocusKey } from './focus';
const props = defineProps<{
  game: Game;
  plan: CultivationPlan;
  blocked: boolean;
}>();
const emit = defineEmits<{ natural: [] }>(),
  focus = inject(gameFocusKey);
const view = computed(() =>
  props.blocked ? null : cultivationFallback(props.game, props.plan),
);
function choose(event: MouseEvent) {
  if (!view.value) return;
  const source = event.currentTarget as HTMLElement,
    run = props.game.core.runId,
    target = source
      .closest('.art06-site')
      ?.querySelector<HTMLElement>('[data-testid=cultivation-method-natural]');
  emit('natural');
  void nextTick(() => {
    if (
      props.game.core.runId === run &&
      target?.isConnected &&
      target.getAttribute('aria-pressed') === 'true' &&
      (document.activeElement === document.body ||
        document.activeElement === source)
    )
      focus?.target(target);
  });
}
</script>
<template>
  <section
    v-if="view"
    class="cultivation-fallback"
    data-testid="cultivation-fallback"
    data-primary-region
    tabindex="-1"
    ><small>灵石辅助暂不可用</small><h2>可先自然吐纳</h2><p>{{ view.reason }}</p
    ><p>每轮预计修为 +{{ view.xp }}</p
    ><small
      >不耗灵石 · {{ view.cycleMs / 1000 }} 秒 · {{ view.months }} 游戏月</small
    ><button
      type="button"
      class="primary"
      data-testid="cultivation-select-natural"
      @click="choose"
      >选择自然吐纳</button
    ><small>仅选择方式；开始后才读秒。</small
    ><small>{{ view.goal }} · 最多 {{ view.maxCycles }} 轮</small></section
  ><slot v-else />
</template>
<style scoped>
@layer game {
  .cultivation-fallback {
    display: grid;
    gap: 10px;
    line-height: 1.5;
    font-size: 18px;
  }
  .cultivation-fallback h2 {
    margin: 0;
    font-size: 28px;
  }
  .cultivation-fallback p {
    margin: 0;
  }
  .cultivation-fallback small {
    font-size: 14px;
    color: var(--palette-muted);
  }
  .cultivation-fallback button {
    width: 100%;
    min-height: 54px;
    font-size: 24px;
  }
}
</style>
