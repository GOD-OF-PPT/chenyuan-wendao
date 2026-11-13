<script setup lang="ts">
import type { Game, Move } from '../../src/full/types';
import BattleCommandConsole from './BattleCommandConsole.vue';
import './art02-battle.css';
defineProps<{
  game: Game;
  savedMove?: Move;
  proposedMove?: Move;
  canMove: (move: Move) => boolean;
  label: (move: Move) => string;
  purpose: (move: Move) => string;
  reason: (move: Move) => string;
  cost: (move: Move) => string;
  retreatEffect: string;
}>();
const emit = defineEmits<{ move: [Move] }>();
</script>
<template>
  <div class="battle-deck" data-testid="battle-deck"
    ><BattleCommandConsole
      :game="game"
      :saved-move="savedMove"
      :proposed-move="proposedMove"
      :can-move="canMove"
      :label="label"
      :purpose="purpose"
      :reason="reason"
      :cost="cost"
      :retreat-effect="retreatEffect"
      @move="emit('move', $event)"
  /></div>
</template>
