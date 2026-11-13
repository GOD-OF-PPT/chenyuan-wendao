<script setup lang="ts">
import { computed, inject } from 'vue';
import type { Action } from '../../src/full/types.ts';
import type { useGame } from './store';
import * as C from '../../src/full/content.ts';
import { contentForGame } from '../../src/full/rule-content.ts';
import { useActionView } from './use-action-view';
const store = inject<ReturnType<typeof useGame>>('game-scene')!;
const game = computed(() => store.game!), core = computed(() => game.value.core), ruleContent = computed(() => contentForGame(game.value));
const { quote, can, why, cost } = useActionView(store);
import GameIcon from './GameIcon.vue';
import type { TrackingTarget } from '../../src/full/goals.ts';
const props = defineProps<{
    singleScreen: boolean;
    view: string;
    highlight: string;
    consumption: (action: Action) => string;
}>();
const emit = defineEmits<{
    act: [
        action: Action
    ];
    travel: [
        location: C.LocationId
    ];
    track: [
        target: TrackingTarget
    ];
}>();
const hubView = computed(() => props.view), consumption = (action: Action) => props.consumption(action);
const knownItems = computed(() => Object.entries(ruleContent.value.items).filter(([id, item]) => C.rank(item.min) <= C.rank(core.value.player.realm) || core.value.inventory[id] > 0));
const localRecipes = computed(() => Object.entries(ruleContent.value.recipes).filter(([, recipe]) => C.rank(recipe.min) <= C.rank(core.value.player.realm)));
const act = (action: Action) => emit('act', action), travel = (location: C.LocationId) => emit('travel', location), selectTracking = (target: TrackingTarget) => emit('track', target);
</script>
<template>
            <div v-if="!singleScreen||hubView!=='forge'" class="section-label">行囊 <span>一草一石，皆有其用</span></div><div v-if="!singleScreen||hubView!=='forge'" class="inventory" tabindex="-1" data-primary-region><article v-for="[id,item] in knownItems" :key="id"><div class="item-glyph" aria-hidden="true"><GameIcon kind="item" :id="id"/></div><div><strong>{{item.name}} <b :data-testid="`item-${id}`">×{{core.inventory[id]}}</b></strong><small>{{item.description}}</small><small v-if="item.hp || item.mp">{{why({type:'USE',item:id})}}</small><small v-if="item.hp || item.mp">{{consumption({type:'USE',item:id})}}</small><template v-if="item.sell!==null"><small v-if="core.world.location==='market'">{{why({type:'SELL',item:id,quantity:1})}}</small><small>{{consumption({type:'SELL',item:id,quantity:1})}}</small></template><button class="text-button" :data-testid="`track-${id}`" @click="selectTracking({kind:'item',id,quantity:1})">追踪此物资 →</button></div><button v-if="item.hp || item.mp" @click="act({type:'USE',item:id})" :disabled="!can({type:'USE',item:id})">服用</button><button v-if="item.sell!==null && core.world.location==='market'" @click="act({type:'SELL',item:id,quantity:1})" :disabled="!can({type:'SELL',item:id,quantity:1})">售出 · {{item.sell}}</button></article></div>
            <h3 v-if="!singleScreen||hubView!=='inventory'" class="recipes-title">丹炉 · 固定配方</h3><p v-if="singleScreen&&hubView==='forge'&&!localRecipes.length" class="small" data-testid="forge-locked">引气入体后可在洞府炼丹；当前尚无可用配方。</p><p v-if="(!singleScreen||hubView!=='inventory')&&core.world.location!=='cave'" class="small">需在洞府炼丹。<button @click="travel('cave')" :disabled="!can({type:'TRAVEL',location:'cave'})">前往洞府</button></p>
            <div v-show="!singleScreen||hubView!=='inventory'" class="recipe" v-for="[id,recipe] in localRecipes" :key="id"><div><strong>{{recipe.name}}</strong><small>{{cost({type:'CRAFT',recipeId:id})}}</small><small>{{why({type:'CRAFT',recipeId:id})}}</small><small>{{consumption({type:'CRAFT',recipeId:id})}}</small></div><button :data-testid="`craft-${id}`" :class="{highlight:highlight===`craft-${id}`}" @click="act({type:'CRAFT',recipeId:id})" :disabled="!can({type:'CRAFT',recipeId:id})">炼制</button></div>
          </template>
