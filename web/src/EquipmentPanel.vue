<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import * as C from '../../src/full/content.ts';
import { stats } from '../../src/full/engine.ts';
import { previewAction, type ActionPreview } from '../../src/full/queries.ts';
import type { Action, Game } from '../../src/full/types.ts';
import type { TrackingTarget } from '../../src/full/goals.ts';
import { formatCosts } from './presentation';
import type { NavigationRequest } from './navigation';

const props = defineProps<{ game: Game; enabled: boolean; busy: boolean; highlight: string; consumption: (action: Action) => string }>();
const emit = defineEmits<{ act: [Action]; track: [TrackingTarget]; navigate: [NavigationRequest] }>();
const filter = ref<'current' | 'all' | C.School>('current'), future = ref(false);
const slots = { mind: '心法', builder: '起手术法', finisher: '终结术法' } as const;
const context = computed(() => ({ game: props.game, cache: new Map<string, ActionPreview>() }));
function quote(action: Action) {
  const current = context.value, key = JSON.stringify(action);
  if (!current.cache.has(key)) current.cache.set(key, previewAction(current.game, action));
  return current.cache.get(key)!;
}
const can = (action: Action) => props.enabled && !props.busy && quote(action).allowed;
const why = (action: Action) => !props.enabled ? '存储尚未就绪，请先恢复存档连接' : props.busy ? '正在保存，请稍候' : quote(action).failure?.message ?? '';
const details = computed(() => stats(props.game));
const skills = computed(() => Object.entries(C.skills).filter(([id, skill]) =>
  (filter.value === 'all' || skill.school === (filter.value === 'current' ? props.game.school : filter.value) || filter.value === 'current' && !props.game.school) &&
  (future.value || props.game.learned.includes(id) || C.rank(skill.min) <= C.rank(props.game.core.player.realm))));
const relics = computed(() => Object.entries(C.relics).filter(([id]) => {
  const min = quote({ type: 'FORGE', relic: id }).requirements.minRealm;
  return future.value || props.game.ownedRelics.includes(id) || !min || C.rank(min) <= C.rank(props.game.core.player.realm);
}));
watch(() => props.game.core.runId, () => { filter.value = 'current'; future.value = false; });
watch(() => props.highlight, id => {
  const skillId = id.startsWith('learn-') ? id.slice(6) : id.startsWith('equip-') ? id.slice(6) : null;
  if (skillId && Object.hasOwn(C.skills, skillId)) {
    filter.value = C.skills[skillId].school;
    if (C.rank(C.skills[skillId].min) > C.rank(props.game.core.player.realm)) future.value = true;
  }
  if (id.startsWith('forge-') && Object.hasOwn(C.relics, id.slice(6))) {
    const min = quote({ type: 'FORGE', relic: id.slice(6) }).requirements.minRealm;
    if (min && C.rank(min) > C.rank(props.game.core.player.realm)) future.value = true;
  }
});
</script>

<template>
  <section class="paper equipment-panel" data-testid="equipment-panel" tabindex="-1" aria-label="功法与法宝">
    <div class="section-label">功法与法宝 <span>研习与装备分别确认</span></div>
    <div class="loadout-summary">
      <div v-for="(label,slot) in slots" :key="slot"><small>{{label}} · 1槽</small><strong :data-testid="`loadout-${slot}`">{{game.loadout[slot] ? C.skills[game.loadout[slot]!].name : '尚未择法'}}</strong></div>
      <div><small>本命法宝 · 1槽</small><strong data-testid="loadout-relic">{{game.loadout.relic ? C.relics[game.loadout.relic].name : '尚未装备'}}</strong></div>
    </div>
    <p class="small" data-testid="build-stats">静修加成 {{details.cultivationBonus}}% · 护体基础减伤 {{details.guard}}{{game.school==='talisman' ? ` · 每回合符印伤害 ${details.markDamage}` : ''}}</p>
    <div class="school-picker"><h3>选择修法 <small>战斗外切换；会采用该派基础组合，研习记录保留，可再逐槽装备。</small></h3><div class="choices two">
      <button v-for="school in ['sword','talisman'] as const" :key="school" :data-testid="`school-${school}`" :class="{selected:game.school===school}" @click="emit('act',{type:'SCHOOL',school})" :disabled="!can({type:'SCHOOL',school})"><strong>{{school==='sword'?'剑修 · 青锋剑诀':'符修 · 镇灵符诀'}}</strong><small>{{why({type:'SCHOOL',school})}}</small></button>
    </div></div>
    <article class="equipment-card" data-testid="sword-manual">
      <div><h3>{{C.swordManual.name}} <small>剑法启迪</small></h3>
        <p>与破庙交易所得为同一份剑简。其他开场可在{{C.realms[C.swordManual.min].name}}后到青云宗研读，剑修终结术法伤害 +{{C.swordManual.damageBonus}}；不改变当前配装。</p>
        <small>研读成本：{{formatCosts(quote({type:'STUDY',manual:'jinghong'}).costs)}} · 价格未平衡</small>
        <small v-if="game.school==='talisman'">这项启迪只用于剑修终结术法，当前符修没有直接收益。</small>
        <small data-testid="manual-effect">当前剑简伤害加成 {{details.manualDamageBonus}}</small>
        <small>{{why({type:'STUDY',manual:'jinghong'})}}</small>
      </div>
      <div class="equipment-actions"><button data-testid="study-manual" :class="{highlight:highlight==='study-manual'}" @click="emit('act',{type:'STUDY',manual:'jinghong'})" :disabled="!can({type:'STUDY',manual:'jinghong'})">{{game.core.learnedSkills.includes(C.swordManual.id)?'已研读':'付费研读'}}</button><button v-if="game.core.world.location!=='sect' && !game.core.learnedSkills.includes(C.swordManual.id)" class="text-button" data-testid="go-study-manual" @click="emit('navigate',{location:'sect',tab:'修行',focusId:'study-manual'})" :disabled="!can({type:'TRAVEL',location:'sect'})">前往青云宗 →</button></div>
    </article>
    <div class="equipment-options"><label>查看修法 <select v-model="filter" aria-label="功法流派"><option value="current">当前修法</option><option value="sword">剑修</option><option value="talisman">符修</option><option value="all">全部</option></select></label><label><input type="checkbox" v-model="future" aria-label="显示后续功法法宝"> 显示后续境界</label></div>
    <p v-if="!skills.length" class="small">引气入体后可选择修法；在青云宗研习功法，战斗外逐槽装备。</p>
    <article v-for="[id,skill] in skills" :key="id" class="equipment-card" :data-testid="`skill-${id}`">
      <div><h3>{{skill.name}} <small>{{skill.school==='sword'?'剑修':'符修'}} · {{slots[skill.slot]}} · {{C.realms[skill.min].name}}</small></h3><p>{{skill.description}}</p>
        <small>研习成本：{{formatCosts(quote({type:'LEARN',skill:id}).costs)}} · 青云宗</small><small data-testid="learn-reason">{{why({type:'LEARN',skill:id})}}</small>
        <small v-if="game.learned.includes(id)">已掌握，保留在本次人生的研习记录中。</small>
      </div>
      <div class="equipment-actions">
        <button :data-testid="`learn-${id}`" :class="{highlight:highlight===`learn-${id}`}" @click="emit('act',{type:'LEARN',skill:id})" :disabled="!can({type:'LEARN',skill:id})">{{game.learned.includes(id)?'已掌握':'研习'}}</button>
        <button :data-testid="`equip-${id}`" :class="{selected:game.loadout[skill.slot]===id,highlight:highlight===`equip-${id}`}" @click="emit('act',{type:'EQUIP',skill:id})" :disabled="!can({type:'EQUIP',skill:id})">{{game.loadout[skill.slot]===id?'已装备':`装入${slots[skill.slot]}`}}</button>
        <small data-testid="equip-reason">{{why({type:'EQUIP',skill:id})}}</small>
        <button class="text-button" :data-testid="`track-skill-${id}`" @click="emit('track',{kind:'skill',id})">查看筹备 →</button>
      </div>
    </article>
    <h3 class="relic-heading">本命法宝</h3><p v-if="!relics.length" class="small">金丹后可在洞府炼制；可展开后续境界，提前查看材料和来源。</p>
    <article v-for="[id,relic] in relics" :key="id" class="equipment-card" :data-testid="`relic-${id}`">
      <div><h3>{{relic.name}}</h3><p>{{relic.description}}</p><small>炼制成本：{{formatCosts(quote({type:'FORGE',relic:id}).costs)}} · 洞府</small><small data-testid="forge-reason">{{why({type:'FORGE',relic:id})}}</small>
        <small>{{game.ownedRelics.includes(id)?'已炼成，替换装备不会销毁其他已拥有法宝。':'炼成后再装备，效果以实际配装参与结算。'}}</small>
        <small>{{consumption({type:'FORGE',relic:id})}}</small>
      </div>
      <div class="equipment-actions">
        <button :data-testid="`forge-${id}`" :class="{highlight:highlight===`forge-${id}`}" @click="emit('act',{type:'FORGE',relic:id})" :disabled="!can({type:'FORGE',relic:id})">{{game.ownedRelics.includes(id)?'已炼成':'炼制法宝'}}</button>
        <button :data-testid="`equip-relic-${id}`" :class="{selected:game.loadout.relic===id}" @click="emit('act',{type:'EQUIP_RELIC',relic:id})" :disabled="!can({type:'EQUIP_RELIC',relic:id})">{{game.loadout.relic===id?'已装备':'装备法宝'}}</button>
        <small data-testid="equip-relic-reason">{{why({type:'EQUIP_RELIC',relic:id})}}</small>
        <button class="text-button" :data-testid="`track-relic-${id}`" @click="emit('track',{kind:'relic',id})">查看筹备 →</button>
      </div>
    </article>
  </section>
</template>
