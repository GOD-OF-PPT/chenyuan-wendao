<script setup lang="ts">
import type {Game,Move} from '../../src/full/types';
import GameIcon from './GameIcon.vue';
import './art02-battle.css';
defineProps<{game:Game;savedMove?:Move;canMove:(move:Move)=>boolean;label:(move:Move)=>string;purpose:(move:Move)=>string;reason:(move:Move)=>string;cost:(move:Move)=>string;retreatEffect:string}>();
const emit=defineEmits<{move:[Move]}>();
const medicines={heal:'healing_pill',restore:'spirit_pill'} as const;
</script>
<template>
 <div class="battle-deck" data-testid="battle-deck"><div id="battle-decisions" class="battle-manual-actions" data-primary-region tabindex="-1" data-testid="battle-decisions" aria-label="手动单步行动"><button v-for="move in ['attack','guard','technique','release'] as const" :key="move" :data-testid="move" :data-move="move" :aria-pressed="savedMove===move" :disabled="!canMove(move)" @click="emit('move',move)"><GameIcon kind="skill" :id="move==='release'?(game.loadout.finisher??'sword_release'):move==='technique'?(game.loadout.builder??'sword_build'):move==='guard'?'sword_guard':'sword_build'"/><strong>{{label(move)}}</strong><small>{{purpose(move)}}</small><small>{{cost(move)}} · 3 秒 / 回合</small><small v-if="reason(move)">{{reason(move)}}</small></button></div><div class="battle-manual-supplies"><button v-for="move in ['heal','restore'] as const" :key="move" :data-testid="'battle-'+move" :data-move="move" :disabled="!canMove(move)" @click="emit('move',move)"><GameIcon kind="item" :id="medicines[move]"/><strong>{{move==='heal'?'回春丹':'回灵丹'}} ×{{game.core.inventory[medicines[move]]}}</strong><small>{{cost(move)}} · 3 秒 / 回合{{reason(move)?' · '+reason(move):''}}</small></button><button data-testid="flee" data-move="flee" :disabled="!canMove('flee')" @click="emit('move','flee')"><GameIcon kind="nav" id="explore"/><strong>撤回洞府</strong><small>{{retreatEffect}} · 3 秒 / 回合</small></button></div></div>
</template>
