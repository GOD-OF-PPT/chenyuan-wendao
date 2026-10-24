<script setup lang="ts">
import {computed,useId} from 'vue';
import type {Game,Move} from '../../src/full/types';
import GameIcon from './GameIcon.vue';
import './ta07-commands.css';
const props=defineProps<{game:Game;savedMove?:Move;proposedMove?:Move;canMove:(move:Move)=>boolean;label:(move:Move)=>string;purpose:(move:Move)=>string;reason:(move:Move)=>string;cost:(move:Move)=>string;retreatEffect:string}>();
const emit=defineEmits<{move:[Move]}>();
const strikes=['attack','guard','technique','release'] as const;
const medicines={heal:'healing_pill',restore:'spirit_pill'} as const;
const stateId=useId();
const sharedReason=computed(()=>{const reasons=([...strikes,'heal','restore','flee'] as const).map(move=>props.reason(move));return reasons[0]&&reasons.every(row=>row===reasons[0])?reasons[0]:'';});
</script>
<template>
 <div class="ta07-command-console" data-testid="battle-command-console" :data-proposed-move="proposedMove" :data-school="game.school">
  <div class="ta07-strike-group" data-testid="battle-strike-slots"><div class="battle-manual-actions ta07-strike-slots" data-testid="battle-decisions" id="battle-decisions" data-primary-region tabindex="-1" aria-label="手动单步行动">
   <button v-for="move in strikes" :key="move" class="ta07-strike" :data-testid="move" :data-move="move" :data-proposed="move===proposedMove" :aria-pressed="savedMove===move" :aria-describedby="sharedReason?stateId:undefined" :disabled="!canMove(move)" @click="emit('move',move)">
    <span class="ta07-command-object" aria-hidden="true"><svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
     <template v-if="move==='attack'"><path d="M23 59L58 24L62 13L51 17L17 52M17 44L35 62M22 57L13 66M12 61L18 67"/><path d="M31 45L52 24" stroke-width="4"/></template>
     <template v-else-if="move==='guard'"><path d="M40 12L62 23V42Q61 58 40 69Q19 58 18 42V23Z"/><path d="M40 24V56M27 39L40 27L53 39M28 49L40 59L52 49"/></template>
     <template v-else-if="move==='technique'&&game.school==='talisman'"><path d="M22 17L52 13L60 61L30 66ZM30 28L45 26M34 36L49 34M36 44L50 42M42 23L48 55"/><path d="M16 37L11 48M63 29L68 20"/></template>
     <template v-else-if="move==='technique'"><path d="M40 62V18L44 10L48 18L43 62M22 60L14 34L16 25L22 32L31 58M52 58L61 32L68 25L69 34L60 61"/><path d="M19 65Q40 73 61 65"/></template>
     <template v-else-if="game.school==='talisman'"><path d="M40 10L67 40L40 70L13 40ZM40 23L55 40L40 57L25 40ZM31 34L49 46M49 34L31 46"/><path d="M40 3V8M40 72V77M3 40H8M72 40H77"/></template>
     <template v-else><path d="M13 64Q32 11 68 13Q53 42 13 64ZM18 60L59 24M23 46L39 62"/><path d="M15 25Q36 4 65 6M48 62L67 45"/></template>
    </svg></span>
    <strong>{{label(move)}}</strong><small class="ta07-purpose">{{purpose(move)}}</small><small>{{cost(move)}} · 3 秒 / 回合</small>
    <small v-if="reason(move)&&!sharedReason" class="ta07-command-reason">{{reason(move)}}</small>
    <span v-if="move===proposedMove" class="ta07-proposed">战策拟用</span>
   </button>
  </div></div>
  <div class="battle-manual-supplies ta07-supply-belt">
   <div class="ta07-medicine-kit" data-testid="battle-medicine-kit" aria-label="药匣，两种丹药均占一回合">
    <button v-for="(item,move) in medicines" :key="move" class="ta07-medicine" :data-testid="'battle-'+move" :data-move="move" :disabled="!canMove(move)" :aria-describedby="sharedReason?stateId:undefined" @click="emit('move',move)">
     <GameIcon kind="item" :id="item"/><span><strong>{{move==='heal'?'回春丹':'回灵丹'}} ×{{game.core.inventory[item]}}</strong><small>{{cost(move)}} · 3 秒 / 回合</small><small v-if="reason(move)&&!sharedReason" class="ta07-command-reason">{{reason(move)}}</small></span>
    </button>
   </div>
   <div class="ta07-retreat-lane" data-testid="battle-retreat-lane">
    <button class="ta07-retreat" data-testid="flee" data-move="flee" :disabled="!canMove('flee')" :aria-describedby="sharedReason?stateId:undefined" @click="emit('move','flee')"><svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M27 10L13 24L27 38M14 24H40M7 9V39"/></svg><span><strong>撤回洞府</strong><small>{{retreatEffect}} · 3 秒 / 回合</small><small v-if="reason('flee')&&!sharedReason" class="ta07-command-reason">{{reason('flee')}}</small></span></button>
   </div>
  </div>
  <p v-if="sharedReason" :id="stateId" class="ta07-shared-reason" data-testid="battle-command-state">{{sharedReason}}</p>
 </div>
</template>
