<script setup lang="ts">
import {useRuleContent} from './rule-content';

import {computed} from 'vue';
import type {Game} from '../../src/full/types';
import * as C from '../../src/full/content';
import {getLifeOverview} from '../../src/full/queries';
import PortraitImage from './PortraitImage.vue';
import GameIcon from './GameIcon.vue';
const ruleContent=useRuleContent(()=>props.game);
const props=defineProps<{game:Game;saveLabel:string;saveTone:string;demo?:boolean}>();
const emit=defineEmits<{inspect:[MouseEvent];life:[MouseEvent];help:[];settings:[MouseEvent]}>();
const p=computed(()=>props.game.core.player),life=computed(()=>getLifeOverview(props.game)),sealTitle=computed(()=>props.game.status==='ascended'?'飞升封卷':props.game.ending==='retired'?'归隐收卷':props.game.ending==='lifespan'?'寿尽收卷':'此生收卷');
</script>
<template>
 <header class="topbar game-hud sealed-hud" data-testid="game-hud"><div class="hud-person" data-testid="sealed-life-hud">
  <button class="hud-identity" data-testid="hud-character" aria-label="查看封卷人物与配装" @click="emit('inspect',$event)"><span class="character-portrait"><PortraitImage id="player" fallback="道"/></span><span><strong>{{p.name}}</strong><small><span data-testid="realm">{{ruleContent.realms[p.realm].name}}</span> · {{game.school==='sword'?'剑修':game.school==='talisman'?'符修':'尚未择法'}}</small></span></button>
  <div class="character-vitals hud-vitals"><span>封卷气血 <b data-testid="hp">{{p.hp}}</b></span><span>封卷灵力 {{p.mp}}</span></div><div class="hud-resources"><span>封卷修为 <b data-testid="xp">{{p.xp}}</b></span><span>灵石 <b data-testid="stones">{{p.stones}}</b></span></div>
 </div><div class="hud-center sealed-hud-summary"><strong>此生已收卷</strong><small>行道 {{life.elapsedMonths}} 游戏月 · 不再继续本卷行动<template v-if="demo"> · 演示存档</template></small></div>
 <button class="hud-goal" data-testid="hub-goal" :aria-label="'查看'+life.title+'的生平'" @click="emit('life',$event)"><small>封卷留存</small><strong data-testid="hub-target">{{sealTitle}}</strong><small data-testid="hub-gap">来路 · 修行 · 因果</small><span>查看此生记录 ›</span></button>
 <div class="hud-tools"><div class="save-summary" :data-save-state="saveTone"><span class="save-state" role="status" data-testid="save-status"><GameIcon kind="action" id="save"/>{{saveLabel}}</span></div><div><button data-testid="hub-help" @click="emit('help')">帮助</button><button data-testid="game-settings" @click="emit('settings',$event)">设置</button></div></div></header>
</template>
