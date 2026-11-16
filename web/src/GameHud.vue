<script setup lang="ts">
import {
  isLegacyRules,
  isPreviousRules,
  isV5Rules,
} from '../../src/full/rule-profile';
import { useRuleContent } from './rule-content';

import { computed } from 'vue';
import type { Game } from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import PortraitImage from './PortraitImage.vue';
import GameIcon from './GameIcon.vue';
import HudGoal from './HudGoal.vue';
import type { HudGoalContext } from './hud-goal.ts';
const ruleContent = useRuleContent(() => props.game);
const props = defineProps<{
  game: Game;
  goal: string;
  gap: string;
  saveLabel: string;
  saveTone: string;
  demo?: boolean;
  context?: HudGoalContext | null;
}>();
const emit = defineEmits<{
  inspect: [MouseEvent];
  goal: [MouseEvent];
  help: [];
  settings: [MouseEvent];
}>();
const p = computed(() => props.game.core.player),
  realm = computed(() => ruleContent.value.realms[p.value.realm]);
</script>
<template>
  <header class="topbar game-hud" data-testid="game-hud">
    <div class="hud-person">
      <button
        class="hud-identity"
        data-testid="hud-character"
        aria-label="查看人物寿元与配装"
        @click="emit('inspect', $event)"
        ><span class="character-portrait"
          ><PortraitImage id="player" fallback="道" /></span
        ><span
          ><strong>{{ p.name }}</strong
          ><small
            ><span data-testid="realm">{{ realm.name }}</span> ·
            {{
              game.school === 'sword'
                ? '剑修'
                : game.school === 'talisman'
                  ? '符修'
                  : '尚未择法'
            }}</small
          ></span
        ></button
      >
      <div class="character-vitals hud-vitals"
        ><span
          >气血 <b data-testid="hp">{{ p.hp }} / {{ realm.maxHp }}</b></span
        ><span>灵力 {{ p.mp }} / {{ realm.maxMp }}</span></div
      >
      <div class="hud-resources"
        ><span
          >修为 <b data-testid="xp">{{ p.xp }} / {{ realm.xpCap }}</b></span
        ><span
          >灵石 <b data-testid="stones">{{ p.stones }}</b></span
        ></div
      >
    </div>
    <div class="hud-center"
      ><slot
        ><div class="where"
          >{{ C.locations[game.core.world.location].name
          }}<small
            >修行第 {{ game.core.world.elapsedMonths }} 月<template v-if="demo">
              · 演示存档</template
            ></small
          ></div
        ></slot
      ></div
    >
    <button
      class="hud-goal"
      data-testid="hub-goal"
      @click="emit('goal', $event)"
      ><HudGoal :game="game" :goal="goal" :gap="gap" :context="context"
    /></button>
    <div class="hud-tools"
      ><div
        class="save-summary"
        :data-save-state="saveTone"
        data-testid="save-summary"
        ><span class="save-state" role="status" data-testid="save-status"
          ><GameIcon kind="action" id="save" />{{ saveLabel }}</span
        ><small
          v-if="isLegacyRules(game) || isPreviousRules(game) || isV5Rules(game)"
          data-testid="legacy-rules"
          >旧约数值</small
        ></div
      ><div
        ><button data-testid="hub-help" @click="emit('help')">帮助</button
        ><button data-testid="game-settings" @click="emit('settings', $event)"
          >设置</button
        ></div
      ></div
    >
  </header>
</template>
