<script setup lang="ts">
import ProgressTrack from './ProgressTrack.vue';
import {computed} from 'vue';
import type {Action,Game,Move} from '../../src/full/types.ts';
import * as C from '../../src/full/content.ts';
import {intent} from '../../src/full/engine.ts';
import AssetImage from './AssetImage.vue';
import {ENEMY_ASSETS,sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import BattleStrategy from './BattleStrategy.vue';
import type {Activity} from '../../src/full/activity.ts';
import type {AdventurePlan,BattlePlan} from '../../src/full/adventure.ts';
const props=withDefaults(defineProps<{game:Game;active?:boolean;compact?:boolean;can:(action:Action)=>boolean;cost:(action:Action)=>string;why:(action:Action)=>string;busy?:boolean;available?:boolean;running?:boolean;activity?:Activity|null;savedAdventurePlan?:AdventurePlan|null;planSaved?:boolean}>(),{busy:false,available:true,running:false,planSaved:false,active:true});
const emit=defineEmits<{move:[move:Move];details:[event:MouseEvent];start:[BattlePlan];takeover:[]}>();
const battle=computed(()=>props.game.battle!),enemy=computed(()=>C.enemies[battle.value.enemy]);
const forecast=computed(()=>intent(battle.value)),player=computed(()=>props.game.core.player),realm=computed(()=>C.realms[player.value.realm]);
const backdrop=computed(()=>sceneAssetPath(scenePresentation(props.game)));
</script>
<template>
 <BattleStrategy :trial="enemy.trial" variant="battle" :game="game" :compact="compact" :busy="busy" :available="available" :running="running" :activity="activity" :saved-plan="savedAdventurePlan" :plan-saved="planSaved" :can="can" :cost="cost" :why="why" @move="emit('move',$event)" @details="emit('details',$event)" @start="emit('start',$event)" @takeover="emit('takeover')">
  <template #hero>
  <div class="battle-hero">
   <AssetImage class="battle-backdrop" :path="backdrop" asset-id="battle-environment" eager><span class="battle-backdrop-fallback"/></AssetImage>
   <div class="enemy-art" aria-hidden="true"><AssetImage :path="ENEMY_ASSETS[battle.enemy]" :asset-id="`enemy-${battle.enemy}`" fit="contain" eager><span class="enemy-fallback">{{enemy.trial?'劫':'敌'}}<small>{{enemy.name}}</small></span></AssetImage></div>
   <div class="enemy-status"><div class="enemy-row"><h2>{{enemy.name}}</h2><b data-testid="enemy-hp">{{battle.hp}} / {{enemy.hp}} 气血</b></div>
    <ProgressTrack :active="active" :value="battle.hp" :max="enemy.hp" label="敌方气血" tone="health" :identity="game.core.runId+battle.enemy+game.wins" hint="只有实际战斗行动才改变气血；先辨敌方意图，再选择攻守。"/>
    <div class="intent" data-testid="intent" :data-intent="forecast.kind"><span>敌方意图</span><strong>{{forecast.name}}</strong><b>敌方原始伤害 {{forecast.damage}}</b></div>
   </div>
  </div>
  <div class="battle-own-status"><div class="battle-player" data-testid="battle-player"><span>己方气血 <b>{{player.hp}} / {{realm.maxHp}}</b></span><span>灵力 <b>{{player.mp}} / {{realm.maxMp}}</b></span></div><p class="battle-resource">{{game.school==='sword'?`剑意 ${battle.sword} / 3`:`符印 ${battle.marks.length} / 3`}}</p></div>
  <details v-if="!compact" class="battle-details"><summary>术法说明与最近8条交锋</summary><p v-for="slot in ['builder','finisher'] as const" :key="slot" class="small">{{game.loadout[slot]?C.skills[game.loadout[slot]!].description:'引气入体后选择修法。'}}</p><div v-if="battle.log.length" class="battle-log" tabindex="0" aria-label="最近8条交锋"><p v-for="(line,index) in battle.log" :key="index">{{line}}</p></div><p v-else class="small">尚未行动；结果在保存后显示。</p></details>
  </template>
  <template #activity><slot name="activity"/></template>
 </BattleStrategy>
</template>
<style scoped>
.battle-stage{min-width:0}.battle-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.battle-heading .section-label{gap:6px}.battle-jump{min-height:44px;font-size:var(--ui14)}.battle-hero{display:grid;align-items:center;margin:0 0 12px}.enemy-art{min-width:0}.enemy-fallback{display:grid;align-content:center;justify-items:center;height:100%;color:#355e5a;font-size:calc(2rem * var(--font-scale,1));border:1px solid #9ba98f;background:#e6eadc}.enemy-fallback small{font-size:var(--ui14);text-align:center}.enemy-row{display:block}.enemy-row h2{margin:0 0 6px;font-size:var(--ui22)}.enemy-row b{display:block;margin-bottom:8px}.intent{display:grid;grid-template-columns:1fr;gap:4px;margin:12px 0 0;padding:8px 12px;line-height:1.5}.battle-own-status{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.battle-player{display:flex;gap:16px;flex-wrap:wrap;font-size:var(--ui15);margin:0}.battle-resource{margin:0}.battle-actions{margin-top:12px;gap:8px}.battle-actions button{padding:10px 12px;min-width:0;border:1px solid #718f80;background:#e5ede4;color:#294746;line-height:1.5}.battle-actions strong{font-size:var(--ui16)}.battle-actions .move-purpose,.battle-actions small{display:block;font-size:var(--ui14);margin-top:3px;overflow-wrap:anywhere}.battle-actions .move-reason{color:#6c4a3a}.battle-actions button:disabled{background:#ede7d9;border-color:#b7ad96;color:#655b4d;opacity:1}.battle-supplies{border-top:1px solid #d1c7ae;margin-top:14px;padding-top:10px}.battle-supplies>.small{color:#655b4d}.battle-supplies .inline-actions{margin-top:6px}.battle-supplies button{flex:1 1 120px;min-width:0;min-height:44px}.battle-supplies small{display:block;font-size:var(--ui14);overflow-wrap:anywhere}.battle-latest{border-inline-start:3px solid #6a8c78;background:#eff0e4;padding:10px 12px;margin-top:14px;font-size:var(--ui14);line-height:1.6}.battle-latest span{color:#655b4d}.battle-latest p{margin:4px 0 0}.battle-details{margin-top:12px}.battle-details summary{min-height:44px;cursor:pointer;line-height:1.7;display:list-item;padding-block:8px;font-size:var(--ui15)}.battle-details p{overflow-wrap:anywhere}.battle-stage :focus-visible{outline:3px solid #4d8782;outline-offset:3px}.battle-log{height:160px}.enemy-status{min-width:0;overflow-wrap:anywhere}@media(max-width:760px){.battle-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.battle-player{gap:8px}.battle-actions button{padding:9px}.battle-heading .section-label{flex-wrap:wrap}}

.battle-hero{position:relative;isolation:isolate;overflow:hidden;grid-template-columns:minmax(0,1fr) minmax(140px,1.05fr);min-height:220px;padding:14px 16px;gap:12px;border:1px solid #839481;background:#17383b;color:#fff6df}.battle-backdrop{position:absolute;inset:0;z-index:-2}.battle-backdrop-fallback{display:block;height:100%;background:radial-gradient(ellipse at 72% 52%,#667f79,#1a3f43)}.battle-hero::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,#102b30ed 8%,#15393b90 58%,#16363850),linear-gradient(0deg,#0b292b88,transparent 60%)}.enemy-art{grid-column:2;grid-row:1;align-self:center;height:220px;filter:drop-shadow(0 6px 6px #071e1c99)}.enemy-status{grid-column:1;grid-row:1;z-index:1}.enemy-status h2{color:#fff5dc}.enemy-status b{color:#f1e7d1}.enemy-status .intent{color:#f6ebd4;background:#173c3fe8;border-color:#d1b875}.enemy-status .intent strong,.enemy-status .intent span{color:#f4d993}.enemy-status .intent[data-intent="heavy"]{background:#4b2927f0;border-color:#e2ac8a}.enemy-status progress{background:#77918566}.enemy-status .intent b{color:#fff1d7}@media(max-width:760px){.battle-hero{grid-template-columns:minmax(0,1.1fr) minmax(88px,.8fr);padding:12px;gap:6px}.enemy-art{height:170px}.enemy-status h2{font-size:var(--ui19)}.enemy-status .intent{padding:7px}}
</style>
