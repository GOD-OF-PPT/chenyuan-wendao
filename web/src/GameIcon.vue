<script setup lang="ts">
import { computed } from 'vue';
import { ICONS, BRANCH_ICONS } from './ui-icons';
const props = defineProps<{ kind: keyof typeof ICONS; id: string }>();
const branch = computed(
  () => props.kind === 'skill' && Object.hasOwn(BRANCH_ICONS, props.id),
);
const symbol = computed(
  () =>
    (ICONS[props.kind] as Record<string, string>)[props.id] ??
    ICONS.action.help,
);
const url = computed(
  () =>
    new URL(
      `${import.meta.env.BASE_URL}art/ui-kit.svg#${symbol.value}`,
      document.baseURI,
    ).href,
);
</script>
<template>
  <svg
    class="game-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    :data-icon="symbol"
    :data-build-branch="branch"
  >
    <use :href="url" />
    <circle v-if="branch" cx="19" cy="5" r="2" fill="currentColor" />
  </svg>
</template>
<style scoped>
@layer game {
  .game-icon {
    width: 24px;
    height: 24px;
    display: inline-block;
    flex-shrink: 0;
    vertical-align: middle;
    color: inherit;
  }
}
</style>
