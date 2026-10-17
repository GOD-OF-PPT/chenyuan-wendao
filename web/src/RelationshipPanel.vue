<script setup lang="ts">
import { computed } from 'vue';
import * as C from '../../src/full/content.ts';
import { getRelationships, previewAction } from '../../src/full/queries.ts';
import { gamePhase } from '../../src/full/contracts.ts';
import type { Game } from '../../src/full/types.ts';
import PortraitImage from './PortraitImage.vue';
import type { NavigationRequest } from './navigation';
const props = defineProps<{ game: Game; enabled: boolean }>();
const emit = defineEmits<{ navigate: [request: NavigationRequest] }>();
const relationships = computed(() => getRelationships(props.game));
const idle = computed(() => gamePhase(props.game) === 'idle');
function canGo(location: C.LocationId) {
  return props.enabled && idle.value && (props.game.core.world.location === location || previewAction(props.game, { type: 'TRAVEL', location }).allowed);
}
</script>
<template>
  <section class="relationship-list" aria-label="人物因果" data-testid="relationships">
    <p class="small">只记录已发生的选择。相助可以续接，也可以从后来的一次付出开始；没有人物援助仍能继续修行。</p>
    <article v-for="person in relationships" :key="person.id" class="fate-card relationship-card" :data-testid="`relationship-${person.id}`">
      <PortraitImage class="npc-portrait" :id="person.id" :fallback="person.seal"/>
      <div class="relationship-content">
        <h3>{{ person.name }} <strong class="gold" :data-testid="`relationship-label-${person.id}`">{{ person.label }}</strong></h3>
        <p class="small" :data-testid="`relationship-summary-${person.id}`">{{ person.summary }}</p>
        <details v-if="person.facts.length" :data-testid="`relationship-record-${person.id}`">
          <summary>因果记录（{{ person.facts.length }}）</summary>
          <ol class="relationship-facts"><li v-for="fact in person.facts" :key="fact.id" :data-testid="`relationship-fact-${fact.id}`"><strong>{{ fact.title }}</strong><p>{{ fact.text }}</p></li></ol>
        </details>
        <div v-if="person.next" class="relationship-next" :data-testid="`relationship-next-${person.id}`">
          <p><strong>下一次来往：{{ person.next.name }}</strong><small>{{ C.locations[person.next.location].name }} · {{ C.realms[person.next.min].name }}起</small></p>
          <template v-if="person.next.unlocked">
            <p class="small">{{ person.next.view?.body }}</p>
            <ul class="relationship-options"><li v-for="option in person.next.view?.options" :key="option.id">{{ option.label }}：{{ option.detail }}</li></ul>
            <button :data-testid="`relationship-go-${person.next.id}`" :disabled="!canGo(person.next.location)" @click="emit('navigate', { location: person.next.location, tab: '仙缘', focusId: `event-${person.next.id}` })">前往{{ C.locations[person.next.location].name }}查看</button>
            <small v-if="!idle">{{ game.status==='active' ? '先处理当前事件或战斗；查看记录不会推进时间。' : '此生已经收卷，可继续查看记录。' }}</small>
          </template>
          <small v-else>待{{ C.realms[person.next.min].name }}后再访；不会自动触发或补发物资。</small>
        </div>
        <small v-else>{{ game.status==='active' ? '这段来往已收束，选择记录仍保留。' : '此生已收卷，只呈现实际发生的记录。' }}</small>
      </div>
    </article>
  </section>
</template>
<style scoped>
.npc-portrait{width:80px;height:104px;flex-shrink:0;border:1px solid #b6aa85;border-radius:2px}.relationship-list{display:grid;gap:16px}.relationship-card{align-items:flex-start;margin:0}.relationship-content{min-width:0;flex:1}.relationship-content h3{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px}.relationship-content h3 strong{font-size:calc(0.83333333rem * var(--font-scale,1))}.relationship-content p{overflow-wrap:anywhere}.relationship-facts{padding-left:22px}.relationship-facts p{margin:5px 0 14px}.relationship-next{border-top:1px solid #8c754744;margin-top:14px;padding-top:12px}.relationship-next small{display:block;margin-top:6px}.relationship-options{padding-left:20px;font-size:calc(0.77777778rem * var(--font-scale,1));line-height:1.8}.relationship-next button{max-width:100%;white-space:normal}.relationship-content summary{cursor:pointer;padding:8px 0}
</style>
