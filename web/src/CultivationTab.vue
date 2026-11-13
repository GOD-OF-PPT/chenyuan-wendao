<script setup lang="ts">
import { computed, inject } from 'vue';
import type { Action } from '../../src/full/types.ts';
import type { useGame } from './store';
import * as C from '../../src/full/content.ts';
import { contentForGame } from '../../src/full/rule-content.ts';
import { useActionView } from './use-action-view';
import { formatCosts } from './presentation';
const store = inject<ReturnType<typeof useGame>>('game-scene')!;
const game = computed(() => store.game!),
  core = computed(() => game.value.core),
  ruleContent = computed(() => contentForGame(game.value));
const { quote, can, why, cost } = useActionView(store);
import AssetImage from './AssetImage.vue';
import GameIcon from './GameIcon.vue';
import BatchPreview from './BatchPreview.vue';
import { DESKTOP_UI_ASSETS } from './assets';
import { getBreakthroughGoal } from '../../src/full/queries.ts';
const props = defineProps<{
  cultivationHome: boolean;
}>();
const batch = defineModel<number | 'target'>('batch', { required: true });
const emit = defineEmits<{
  act: [action: Action];
  travel: [location: C.LocationId];
  school: [];
  focus: [];
  trackBreakthrough: [];
}>();
const natural = computed<Action>(() => ({
  type: 'CULTIVATE',
  method: 'natural',
  count: batch.value === 'target' ? C.maxBatch : batch.value,
}));
const assisted = computed<Action>(() => ({
  type: 'CULTIVATE',
  method: 'assisted',
  count: batch.value === 'target' ? C.maxBatch : batch.value,
}));
const naturalPreview = computed(() => quote(natural.value)),
  goal = computed(() => getBreakthroughGoal(game.value));
const realm = computed(() => ruleContent.value.realms[core.value.player.realm]),
  location = computed(() => C.locations[core.value.world.location]);
const needsSchool = computed(
  () => C.rank(core.value.player.realm) >= C.rank('qi') && !game.value.school,
);
const breakthrough = computed<Action>(() => ({
  type: core.value.player.realm === 'spirit' ? 'START_TRIAL' : 'BREAKTHROUGH',
}));
const primaryBreakthrough = computed(
  () =>
    props.cultivationHome &&
    (core.value.player.realm === 'spirit'
      ? core.value.player.xp >= realm.value.xpCap
      : !!quote(breakthrough.value)?.allowed),
);
const breakthroughLabel = computed(() =>
  core.value.player.realm === 'mortal'
    ? '引气入体'
    : core.value.player.realm === 'spirit'
      ? '查看渡劫准备'
      : '确认突破',
);
const uiLocked = computed(() => store.busy || !store.available);
const act = (action: Action) => emit('act', action),
  travel = (location: C.LocationId) => emit('travel', location),
  showEquipment = () => emit('school'),
  focusCultivation = () => emit('focus'),
  showBreakthroughGoal = () => emit('trackBreakthrough');
</script>
<template>
            <template v-if="core.world.location === 'cave'">
              <div v-if="needsSchool" class="school-prompt"><div><strong>已入道，可选择修法</strong><p>剑修积蓄剑意，符修留印引爆；选择不会推进年月。</p></div><button type="button" data-testid="choose-school" @click="showEquipment">查看两种修法 →</button></div>
              <div class="cultivation-topline"><span class="section-label">听雨修行 · 道行由此积累</span><button type="button" class="text-button" data-testid="cultivation-jump" @click="focusCultivation">前往修行动作 ↓</button></div>
              <div class="cultivation-actions" id="cultivation-actions" tabindex="-1" data-primary-region data-testid="cultivation-actions">
                <section class="natural-action" data-testid="cultivation-card" :data-primary-action="primaryBreakthrough?'breakthrough':'cultivate'">
                  <div class="natural-illustration" aria-hidden="true"><AssetImage :path="DESKTOP_UI_ASSETS.meditation" asset-id="meditation-ink" fit="contain"><GameIcon class="meditation-fallback" kind="nav" id="cultivate"/></AssetImage></div>
                  <div class="cultivation-main"><h2>{{primaryBreakthrough?goal?.title:'自然吐纳'}}</h2>
                    <div v-if="primaryBreakthrough" class="cultivation-facts" data-testid="cultivation-facts"><span>修为已圆满</span><span>{{core.player.realm==='spirit'?'查看条件':'单次突破'}}</span><span>{{core.player.realm==='spirit'?'正式入场成本：':''}}{{cost(breakthrough)}}</span></div>
                    <div v-else class="cultivation-facts" data-testid="cultivation-facts"><span v-if="naturalPreview?.delta">预计修为 {{naturalPreview.delta.xp>0?'+':''}}{{naturalPreview.delta.xp}}</span><span v-if="naturalPreview?.allowed">实际可行 {{naturalPreview.executedSteps}} 次</span><span>{{naturalPreview?.actualCosts?formatCosts(naturalPreview.actualCosts):cost(natural)}}</span></div>
                    <button v-if="primaryBreakthrough" class="primary cultivate-primary" data-testid="breakthrough" @click="act(breakthrough)" :disabled="core.player.realm==='spirit'? uiLocked:!can(breakthrough)">{{breakthroughLabel}}</button>
                    <p v-if="primaryBreakthrough&&core.player.realm==='spirit'" class="small action-reason">查看准备不消耗物资，正式入场另行确认。</p>
                    <button :class="primaryBreakthrough?'secondary-cultivate':'primary cultivate-primary'" data-testid="cultivate" @click="act(natural)" :disabled="!can(natural)">自然吐纳</button><p v-if="why(natural)&&!primaryBreakthrough" class="small action-reason">{{why(natural)}}</p>
                    <label class="cultivation-batch">吐纳批次 <select v-model.number="batch" aria-label="吐纳行动次数"><option :value="1">1 次</option><option :value="5">5 次</option><option :value="20">20 次</option><option :value="50">50 次</option><option value="target">达到目标</option></select></label>
                  </div>
                </section>
                <div class="cultivation-alternatives"><button data-testid="cultivate-assisted" @click="act(assisted)" :disabled="!can(assisted)"><GameIcon kind="item" id="core"/><span><strong>灵石辅助</strong><small>{{cost(assisted)}}</small><small>{{why(assisted)}}</small></span></button><button data-testid="rest" @click="act({type:'REST'})" :disabled="!can({type:'REST'})"><GameIcon kind="item" id="healing_pill"/><span><strong>洞府疗养</strong><small>{{cost({type:'REST'})}}</small><small>{{why({type:'REST'})}}</small></span></button></div>
              </div>
            </template>
            <template v-else><div class="section-label">修行</div><h2>静守灵台，凝气归元。</h2><p class="story">{{location.description}}</p><div tabindex="-1" data-primary-region><button class="primary" data-testid="return-cave" @click="travel('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">返回洞府修行 →</button></div></template>
            <div v-if="!primaryBreakthrough" class="breakthrough"><div><strong>{{goal?.title}}</strong><small>{{why(breakthrough) || '准备已经齐全'}}</small></div><button class="primary" data-testid="breakthrough" @click="act(breakthrough)" :disabled="core.player.realm==='spirit' ? !store.available || store.busy : !can(breakthrough)">{{breakthroughLabel}}</button><button v-if="cultivationHome&&core.player.xp>=realm.xpCap&&!can(breakthrough)&&core.player.realm!=='spirit'" type="button" class="text-button" data-testid="track-breakthrough-preparation" @click="showBreakthroughGoal">追踪突破筹备 →</button></div>
            <details v-if="core.world.location==='cave'" class="cultivation-details"><summary>本批预算、预计结果与洞府见闻</summary><p class="story">{{location.description}}</p><p class="small">每批最多 {{C.maxBatch}} 次；成本与停止原因按真实行动结算。</p><div class="batch-previews"><BatchPreview label="自然吐纳" :preview="quote(natural)"/><BatchPreview label="灵石辅助" :preview="quote(assisted)"/></div></details>
          </template>
