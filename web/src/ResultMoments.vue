<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, shallowRef, watch } from 'vue';
import type { useGame } from './store';
import { createResultMomentTracker, type ResultMoment } from './result-moments';
import GameIcon from './GameIcon.vue';
import AssetImage from './AssetImage.vue';
import { ENEMY_ASSETS, PORTRAIT_ASSETS, TERRACE_STATE_ASSETS } from './assets';
const props = defineProps<{
    store: ReturnType<typeof useGame>;
    reduceMotion: boolean;
    active: boolean;
}>();
const emit = defineEmits<{
    dismiss: [
    ];
}>();
const moment = shallowRef<ResultMoment | null>(null), moving = ref(false), media = window.matchMedia('(prefers-reduced-motion: reduce)'), systemReduced = ref(media.matches);
const reduced = computed(() => props.reduceMotion || systemReduced.value), tracker = createResultMomentTracker();
const painting = computed(() => {
    const m = moment.value;
    if (!m)
        return '';
    if (m.kind === 'victory' && m.enemyId)
        return ENEMY_ASSETS[m.enemyId] ?? '';
    if (m.kind === 'ending' && props.store.game?.status === 'ascended')
        return TERRACE_STATE_ASSETS.opened;
    return m.kind === 'choice' || m.kind === 'breakthrough' || m.kind === 'ending' ? PORTRAIT_ASSETS.player : '';
});
let stop = () => { }, timer: ReturnType<typeof setTimeout> | undefined;
function clear() { moment.value = null; moving.value = false; clearTimeout(timer); }
function dismiss() { clear(); emit('dismiss'); }
function mediaChange() { systemReduced.value = media.matches; }
function visibility() { if (document.hidden)
    clear(); }
function advanceReading(event: MouseEvent) {
    const target = event.target;
    if (target instanceof Element && target.closest('button,a[href],summary,input,select') && !target.closest('[data-testid="result-moment"]'))
        clear();
}
watch(() => props.active, value => { if (!value) clear(); }, { flush: 'sync' });
watch(() => props.store.game?.core.runId, clear, { flush: 'sync' });
watch([() => props.store.activity?.id, () => props.store.activity?.generation], ([id]) => { if (id)
    clear(); }, { flush: 'sync' });
watch(() => props.store.error, error => { if (error)
    clear(); });
watch(reduced, value => { if (value) {
    moving.value = false;
    clearTimeout(timer);
} });
onMounted(() => {
    stop = props.store.observe(o => {
        if (['import', 'restore', 'restart', 'new_game'].includes(o.kind)) {
            clear();
            return;
        }
        const s = props.store, next = tracker.consume(o, s.game, s.lastResult, s.activity, s.lastReplayed, props.active && s.saved && s.available && !s.error && !document.hidden);
        if (!next)
            return;
        clearTimeout(timer);
        moment.value = next;
        moving.value = !reduced.value;
        timer = setTimeout(() => moving.value = false, 2400);
    });
    media.addEventListener('change', mediaChange);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('click', advanceReading, true);
});
onScopeDispose(() => { clear(); stop(); media.removeEventListener('change', mediaChange); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('click', advanceReading, true); });
</script>
<template>
 <section v-if="moment" :key="moment.key" class="result-moment" :class="{moving: moving&&!reduced}" :data-kind="moment.kind" data-testid="result-moment" aria-label="本次成果">
  <div class="result-moment-object" aria-hidden="true"><AssetImage v-if="painting" :path="painting" :asset-id="'result-'+moment.kind" :fit="moment.kind==='victory'?'contain':'cover'" eager><GameIcon :kind="moment.icon.kind" :id="moment.icon.id"/></AssetImage><GameIcon v-else class="result-moment-icon" :kind="moment.icon.kind" :id="moment.icon.id"/></div>
  <div role="status" aria-live="polite"><strong>{{moment.title}}</strong><p v-if="moment.context">{{moment.context}}</p><p>{{moment.change}}</p><small>实际消耗：{{moment.costs}}</small></div>
  <button type="button" aria-label="收起本次成果" @click="dismiss">收起</button>
 </section>
</template>
<style scoped>
@layer game{
.result-moment{display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:12px;margin:0 24px 8px;padding:10px 16px;background:var(--game-panel,#17383d);border:1px solid var(--game-gold,#bdac74);color:var(--game-ink,#eee5ca);text-align:left}
.result-moment-icon{width:48px;height:48px;color:var(--game-gold,#bdac74)}
.result-moment-object{width:48px;height:48px;color:var(--game-gold,#bdac74)}
.result-moment-object .asset-image{border-radius:4px}
.result-moment:not([data-kind="harvest"]){grid-template-columns:84px minmax(0,1fr) auto;column-gap:40px;min-height:124px;box-shadow:inset 3px 0 var(--game-gold,#bdac74)}
.result-moment:not([data-kind="harvest"]) .result-moment-object{width:84px;height:84px}
.result-moment:not([data-kind="harvest"]) strong{font-size:26px}
.result-moment strong{font-size:22px;line-height:1.3;font-weight:500}
.result-moment p{margin:3px 0;font-size:18px;line-height:1.4;overflow-wrap:anywhere}
.result-moment small{display:block;font-size:14px;line-height:1.4}
.immersive-stage .stage-alerts .result-moment button:first-of-type{grid-column:3;grid-row:1;min-width:64px;min-height:44px;padding:6px 12px;font-size:18px}
.result-moment.moving .result-moment-object{animation:result-bloom 2.4s ease-out both}
.result-moment.moving[data-kind="harvest"] p{animation:result-rise .7s ease-out both}
@keyframes result-rise{from{opacity:.5;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes result-bloom{0%{opacity:.4;transform:scale(.8)}25%{opacity:1;transform:scale(1.12)}70%,100%{opacity:1;transform:scale(1)}}
@media(prefers-reduced-motion:reduce){.result-moment.moving .result-moment-object,.result-moment.moving p{animation:none}}}
</style>
