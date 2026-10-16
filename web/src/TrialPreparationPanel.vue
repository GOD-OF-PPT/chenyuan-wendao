<script setup lang="ts">
import { computed } from 'vue';
import * as C from '../../src/full/content.ts';
import { getTrialPreparation, previewAction } from '../../src/full/queries.ts';
import type { Game } from '../../src/full/types.ts';
import type { TrackingTarget } from '../../src/full/goals.ts';
import type { NavigationRequest } from './navigation';
import type { CheckpointSummary } from './store';
import { formatCosts } from './presentation';
import GrowthPanel from './GrowthPanel.vue';
const props=defineProps<{game:Game;enabled:boolean;checkpoint:CheckpointSummary|null}>();
const emit=defineEmits<{review:[];restore:[];navigate:[NavigationRequest];track:[TrackingTarget]}>();
const preparation=computed(()=>getTrialPreparation(props.game));
const canGo=(location:C.LocationId)=>props.enabled && preparation.value.mandatory.find(row=>row.id==='phase')!.ready && (props.game.core.world.location===location || previewAction(props.game,{type:'TRAVEL',location}).allowed);
</script>
<template>
  <section class="trial-preparation" data-testid="trial-preparation">
    <div class="paper trial-checklist">
      <div class="section-label">登仙筹备 <span>查看不扣物、不推进年月</span></div>
      <h2 tabindex="-1" data-testid="trial-preparation-title">渡劫准备</h2>
      <p>入场必需条件与可选准备分别列出。清单确认的是能否入场，战斗仍需你选择行动。</p>
      <h3>入场必需</h3>
      <ul class="trial-conditions"><li v-for="row in preparation.mandatory" :key="row.id" :data-testid="`trial-required-${row.id}`"><strong>{{row.ready?'已具备':'未具备'}} · {{row.label}}</strong><span>{{row.value}} / {{row.need}}</span></li>
        <li v-for="item in preparation.items" :key="item.id" :data-testid="`trial-required-item-${item.id}`"><strong>{{item.ready?'已具备':'未具备'}} · {{item.name}}</strong><span>库存 {{item.have}} · 入场消耗 {{item.quantity}}</span><button v-if="!item.ready" class="text-button" :data-testid="`trial-track-${item.id}`" @click="emit('track',{kind:'item',id:item.id,quantity:item.quantity})">查看并追踪来源 →</button></li>
      </ul>
      <p class="small" data-testid="trial-entry-cost">实际入场成本：{{formatCosts(preparation.costs)}}</p>
      <p v-if="preparation.failure" class="small" data-testid="trial-entry-reason">{{preparation.failure.message}}</p>
      <button data-testid="trial-go-terrace" :disabled="!canGo(preparation.entryLocation)" @click="emit('navigate',{location:preparation.entryLocation,tab:'修行',focusId:'trial-preparation-title'})">{{game.core.world.location===preparation.entryLocation?'查看此地准备':'前往'+C.locations[preparation.entryLocation].name}}</button>
      <h3>可选准备 · 不作为入场门槛</h3>
      <p data-testid="trial-mana">灵力 {{preparation.preparation.mp}} / {{preparation.preparation.maxMp}}。灵力不足仍可入场；基础攻击与护体能回灵，术法按实际灵力消耗。</p>
      <p>气血 {{preparation.preparation.hp}} / {{preparation.preparation.maxHp}}。可先回洞府疗养或准备丹药。</p>
      <p data-testid="trial-loadout">当前配装：{{preparation.preparation.loadout.map(slot=>slot.name).join(' / ')}} · {{preparation.preparation.relic}}。法宝可选。</p>
      <p data-testid="trial-medicine">{{preparation.preparation.medicine.map(item=>item.name+' ×'+item.quantity).join(' · ')}}。战中服用占一回合，数量由你决定。</p>
      <p data-testid="trial-aid">已约定援助：天劫各击减伤 {{preparation.preparation.aid.allDamageReduction}}，雷击另减 {{preparation.preparation.aid.thunderDamageReduction}}。没有人物援助也可自行筹备入场。</p>
      <div class="trial-navigation"><button data-testid="trial-go-rest" :disabled="!canGo('cave')" @click="emit('navigate',{location:'cave',tab:'修行',focusId:'rest'})">前往洞府查看疗养</button><button data-testid="trial-go-equipment" :disabled="!canGo('sect')" @click="emit('navigate',{location:'sect',tab:'修行',focusId:'equipment-panel'})">查看功法与法宝</button><button data-testid="trial-go-medicine" :disabled="!canGo('market')" @click="emit('navigate',{location:'market',tab:'历练',focusId:'buy-healing_pill',quantity:1})">前往坊市查看丹药</button></div>
      <h3>完整准备检查点</h3>
      <p>确认正式入场后，完整行动前状态将与扣除渡劫引、进入问心一起保存。恢复时物品、年月、装备与人物记录一同回退，不单独补发引。</p>
      <p v-if="checkpoint" class="small" data-testid="trial-existing-checkpoint">当前已有{{checkpoint.kind==='trial'?'渡劫':'突破'}}前检查点，来源进度 {{checkpoint.sourceRevision}}。<button class="text-button" data-testid="trial-restore-existing" @click="emit('restore')" :disabled="!enabled">恢复当前完整准备</button></p>
      <p v-else class="small" data-testid="trial-no-checkpoint">当前没有已验证的准备检查点；正式入场成功时才保存这次准备。</p>
      <button class="primary" data-testid="trial-review-entry" :disabled="!enabled || !preparation.canEnter" @click="emit('review')">核对入场并保存准备 →</button>
    </div>
    <GrowthPanel :game="game" :enabled="enabled" @navigate="emit('navigate',$event)" @track="emit('track',$event)"/>
  </section>
</template>
<style scoped>
.trial-checklist{padding:24px;margin-top:20px}.trial-checklist h2{margin-bottom:12px}.trial-checklist h3{margin:22px 0 10px}.trial-checklist p{line-height:1.8;margin:10px 0;overflow-wrap:anywhere}.trial-conditions{list-style:none;padding:0}.trial-conditions li{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:baseline;border-bottom:1px solid #cfc3aa;padding:10px 0}.trial-conditions span{font-size:.875em;overflow-wrap:anywhere}.trial-navigation{display:flex;flex-wrap:wrap;gap:10px}.trial-preparation button{max-width:100%;white-space:normal}@media(max-width:720px){.trial-checklist{padding:18px}.trial-checklist h2{font-size:22px}}
</style>
