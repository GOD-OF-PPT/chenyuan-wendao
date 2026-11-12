<script setup lang="ts">
import {useRuleContent} from './rule-content';

import {useLocalActivityControls} from './activity-controls';
import {computed,onActivated,onDeactivated,onMounted,onScopeDispose,ref} from 'vue';
import type {Game} from '../../src/full/types';
import * as C from '../../src/full/content';
import {intent} from '../../src/full/engine';
import {ENEMY_ASSETS,BATTLE_PLAYER_ASSET,sceneAssetPath} from './assets';
import {BATTLE_SHAPES,useBattlePreparation} from './battle-choreography';
import {scenePresentation} from './scene-presentation';
import AssetImage from './AssetImage.vue';
import ProgressTrack from './ProgressTrack.vue';
import './art02-battle.css';
import './ta07-cast.css';
const ruleContent=useRuleContent(()=>props.game);
const props=withDefaults(defineProps<{game:Game;active?:boolean}>(),{active:true});
const mounted=ref(true),hidden=ref(document.hidden);
const battle=computed(()=>props.game.battle!),enemy=computed(()=>ruleContent.value.enemies[battle.value.enemy]),player=computed(()=>props.game.core.player),realm=computed(()=>ruleContent.value.realms[player.value.realm]);
const forecast=computed(()=>intent(battle.value)),backdrop=computed(()=>sceneAssetPath(scenePresentation(props.game)));
const identity=computed(()=>props.game.core.runId+':'+battle.value.enemy+':'+(props.game.trial?.stage??'ordinary')+':'+props.game.wins);
const visible=computed(()=>props.active&&mounted.value&&!hidden.value);
const {store,runtime,progress,command}=useBattlePreparation(()=>props.game,()=>visible.value);
const state=computed(()=>!visible.value?'inactive':store?.error||store&&!store.available?'failed':runtime.value?.phase==='running'?'charging':runtime.value?.phase==='saving'?'saving':store?.activity?.status==='paused'?'paused':'ready');
const charge=computed(()=>state.value==='charging'?progress.value*100:0);
const move=computed(()=>command.value?.move??null);
const moves:Record<string,string>={attack:'普通攻击',guard:'凝神护体',technique:'起手术法',release:'终结术法',heal:'服用回春丹',restore:'服用回灵丹',flee:'撤回洞府'};
const caption=computed(()=>state.value==='charging'?'本招蓄势 · '+(moves[move.value??'']??'按已存战策'):state.value==='saving'?'收势封存 · 保存后显示结果':state.value==='paused'?'战策已暂停 · 战局保留':state.value==='failed'?'存档待核对 · 已停手':store?.activityPausing?'正在停手，保存后暂停':'先辨敌意，再定攻守');
const resource=computed(()=>props.game.school==='sword'?battle.value.sword:battle.value.marks.length);
function visibility(){hidden.value=document.hidden;}
onMounted(()=>document.addEventListener('visibilitychange',visibility));
onActivated(()=>{mounted.value=true;hidden.value=document.hidden;});onDeactivated(()=>mounted.value=false);
onScopeDispose(()=>document.removeEventListener('visibilitychange',visibility));
const localControls=useLocalActivityControls();
</script>
<template>
 <div class="battle-hero battle-presence" data-testid="battle-presence" :data-state="state" :data-school="game.school" :data-active="visible" :data-move="move" :data-run="game.core.runId" :data-enemy="battle.enemy" :data-stage="game.trial?.stage??'ordinary'" :data-revision="game.core.revision" :style="{'--battle-charge':charge+'%','--cast-progress':charge/100,'--prep-approach':(12-charge*.12)+'px','--prep-unfold':(60-charge*.6)+'%','--prep-advance':charge*.06+'px'}">
  <AssetImage class="battle-backdrop" :path="backdrop" asset-id="battle-environment" eager><span class="battle-backdrop-fallback"/></AssetImage>
  <div class="battle-ground" aria-hidden="true"/>
  <div class="battle-own-status"><div class="battle-player" data-testid="battle-player"><strong>{{game.core.player.name}}<small>己方</small></strong><span>己方气血 <b>{{player.hp}} / {{realm.maxHp}}</b></span><ProgressTrack :active="active" :value="player.hp" :max="realm.maxHp" label="己方气血" tone="health" :identity="identity" hint="这里显示已保存的真实气血；蓄势不改变数值。"/><span>灵力 <b>{{player.mp}} / {{realm.maxMp}}</b></span><ProgressTrack :active="active" :value="player.mp" :max="realm.maxMp" label="斗法灵力" tone="spirit" :identity="identity" hint="术法、护体与服丹仍按正式回合计算；实际耗灵以保存结果为准。"/></div>
   <div class="battle-resource"><span>{{game.school==='sword'?'剑意':'符印'}} {{resource}} / 3</span><div class="battle-resource-marks" aria-hidden="true"><i v-for="n in 3" :key="n" :class="{filled:n<=resource}">{{game.school==='sword'?'剑':'符'}}</i></div></div>
  </div>
  <div class="battle-player-art" :data-preparation-move="move" :data-pose="state==='charging'?'preparing-'+move:state==='saving'?'sealing':'idle'" aria-hidden="true"><AssetImage :path="BATTLE_PLAYER_ASSET" asset-id="battle-player-standing" fit="contain" eager><span class="battle-person-fallback">{{game.core.player.name}}<small>己方</small></span></AssetImage><span class="battle-preparation" data-testid="battle-preparation" :data-move="move" :data-shape="move?BATTLE_SHAPES[move]:null" :data-school="game.school" :data-state="state"><i class="prep-weapon"/><i class="prep-ward"/><i class="prep-medicine"/><i class="prep-return"/></span></div>
  <div class="enemy-art" :data-intent="forecast.kind" aria-hidden="true"><AssetImage :path="ENEMY_ASSETS[battle.enemy]" :asset-id="`enemy-${battle.enemy}`" fit="contain" eager><span class="enemy-fallback">{{enemy.trial?'劫':'敌'}}<small>{{enemy.name}}</small></span></AssetImage></div>
  <div class="enemy-status"><div class="enemy-row"><h2>{{enemy.name}}</h2><b data-testid="enemy-hp">{{battle.hp}} / {{enemy.hp}} 气血</b></div><ProgressTrack :active="active" :value="battle.hp" :max="enemy.hp" label="敌方气血" tone="health" :identity="identity" hint="只有实际战斗行动才改变气血；先辨敌方意图，再选择攻守。"/>
   <div class="intent" data-testid="intent" :data-intent="forecast.kind"><span>敌方意图</span><strong>{{forecast.name}}</strong><b>敌方原始伤害 {{forecast.damage}}</b></div>
  </div>
  <div class="battle-exchange" data-testid="battle-charge"><i class="battle-charge-ring" aria-hidden="true"/><strong>{{state==='charging'&&runtime?(localControls?Math.ceil(runtime.remainingMs/1000)+' 秒':'蓄势'):state==='saving'?'保存中':'交锋'}}</strong><small v-if="runtime">本周期 {{runtime.totalMs/1000}} 秒</small><span>{{caption}}</span></div>
 </div>
</template>
