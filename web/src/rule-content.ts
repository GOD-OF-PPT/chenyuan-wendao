import { computed } from 'vue';
import type { Game } from '../../src/full/types';
import { contentForGame } from '../../src/full/rule-content';
export function useRuleContent(read: () => Game | null | undefined) {
  return computed(() => contentForGame(read()));
}
