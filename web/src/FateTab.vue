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
import { ref, watch } from 'vue';
import RelationshipPanel from './RelationshipPanel.vue';
import type { NavigationRequest } from './navigation';
import { availableEvents } from '../../src/full/engine.ts';
const props = defineProps<{
    highlight: string;
}>();
const emit = defineEmits<{
    act: [
        action: Action
    ];
    life: [
    ];
    navigate: [
        request: NavigationRequest
    ];
}>();
const journalExpanded = ref(false), recentJournal = computed(() => [...game.value.journal].reverse()), visibleJournal = computed(() => journalExpanded.value ? recentJournal.value : recentJournal.value.slice(0, 10));
watch(() => game.value.core.runId, () => journalExpanded.value = false);
const events = computed(() => availableEvents(game.value));
const act = (action: Action) => emit('act', action), showLife = () => emit('life'), navigate = (request: NavigationRequest) => emit('navigate', request);
</script>
<template>
            <div class="section-label">仙缘</div><button class="text-button" data-testid="show-life" @click="showLife">查看修仙生平 →</button><RelationshipPanel data-primary-region tabindex="-1" :game="game" :enabled="store.available && !store.busy" @navigate="navigate"/>
            <div class="choices"><button v-for="event in events" :key="event.id" :data-testid="`event-${event.id}`" :class="{highlight:highlight===`event-${event.id}`}" @click="act({type:'EVENT',event:event.id})" :disabled="!can({type:'EVENT',event:event.id})">{{event.name}} · {{event.npc}}</button></div>
            <h3>近期手记</h3><p class="small">仅保留最近100条；当前显示{{visibleJournal.length}}条，共{{recentJournal.length}}条。完整已选事实请查看修仙生平。</p><ol id="recent-journal" class="journal"><li v-for="(line,index) in visibleJournal" :key="index">{{line}}</li></ol><button v-if="recentJournal.length>10" type="button" class="text-button" data-testid="journal-toggle" :aria-expanded="journalExpanded" aria-controls="recent-journal" @click="journalExpanded=!journalExpanded">{{journalExpanded?'收起较早条目':`展开全部 ${recentJournal.length} 条近期手记`}}</button>
          </template>
