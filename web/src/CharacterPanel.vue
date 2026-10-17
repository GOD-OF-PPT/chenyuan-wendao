<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import * as C from '../../src/full/content.ts';
import { getLifeOverview } from '../../src/full/queries.ts';
import type { Game } from '../../src/full/types.ts';
const props = defineProps<{game:Game}>();
const player = computed(() => props.game.core.player), realm = computed(() => C.realms[player.value.realm]);
const life = computed(() => getLifeOverview(props.game));
const sealed = computed(() => props.game.status==='ascended');
const school = computed(() => props.game.school==='sword'?'剑修':props.game.school==='talisman'?'符修':'尚未择法');
const expanded = ref(!window.matchMedia('(max-width:760px)').matches);
const media = window.matchMedia('(max-width:760px)');
function resize(){expanded.value=!media.matches;}
onMounted(()=>media.addEventListener('change',resize));onUnmounted(()=>media.removeEventListener('change',resize));
</script>
<template>
  <aside class="paper character-sheet" data-testid="character-panel" aria-label="道者个人志">
    <div class="character-heading"><span class="section-label">道者 · 个人志</span><h2>{{player.name}}</h2><span class="realm-badge" data-testid="realm">{{realm.name}}</span><div class="character-vitals" :data-testid="sealed?'ascension-sealed-stats':undefined">
      <p v-if="sealed" class="small">此生已封卷。本卷不继续上界修行，保留封卷时的实际状态。</p>
      <div class="stat"><label>{{sealed?'封卷气血':'气血'}} <b data-testid="hp">{{player.hp}}<template v-if="!sealed"> / {{realm.maxHp}}</template></b></label><progress v-if="!sealed" class="health" :value="player.hp" :max="realm.maxHp" aria-label="气血"></progress></div>
      <div class="stat"><label>{{sealed?'封卷灵力':'灵力'}} <b>{{player.mp}}<template v-if="!sealed"> / {{realm.maxMp}}</template></b></label><progress v-if="!sealed" :value="player.mp" :max="realm.maxMp" aria-label="灵力"></progress></div>
    </div>
    </div>
    <details :open="expanded" @toggle="expanded=($event.target as HTMLDetailsElement).open">
      <summary class="character-hint" data-testid="character-toggle">{{expanded?'收起详情':'展开修为、寿元与配装'}}</summary>
      <div class="character-details" data-testid="character-details">
        <div class="character-portrait" aria-hidden="true"><span>道</span><small>心向长生</small></div>
        <p class="small muted">{{sealed?'此生已封卷，来路尽存。':'清风为伴，明月同途。'}}</p>
        <div v-if="!sealed" class="stat"><label>修为 <b data-testid="xp">{{player.xp}} / {{realm.xpCap}}</b></label><progress class="cultivation" :value="player.xp" :max="realm.xpCap||1" aria-label="修为"></progress></div>
        <div class="character-pair"><span>{{sealed?'封卷年龄':'年龄 / 寿限'}}</span><b data-testid="age-limit">{{life.ageLabel}}<template v-if="!sealed"> / {{life.limitLabel}}</template></b></div>
        <div class="character-pair"><span>{{sealed?'封卷灵石':'灵石'}}</span><b data-testid="stones">{{player.stones}}</b></div>
        <div class="divider"></div><h3>当前修法 · {{school}}</h3>
        <dl class="character-loadout"><div><dt>心法</dt><dd>{{game.loadout.mind?C.skills[game.loadout.mind].name:'引气入体后选择'}}</dd></div><div><dt>起手</dt><dd>{{game.loadout.builder?C.skills[game.loadout.builder].name:'尚未装备'}}</dd></div><div><dt>终结</dt><dd>{{game.loadout.finisher?C.skills[game.loadout.finisher].name:'尚未装备'}}</dd></div><div><dt>本命法宝</dt><dd>{{game.loadout.relic?C.relics[game.loadout.relic].name:'金丹后可炼制装备'}}</dd></div></dl>
      </div>
    </details>
  </aside>
</template>
<style scoped>
.character-sheet{grid-area:character;padding:22px 20px;display:flex;flex-direction:column}.character-sheet details{display:block}.character-heading{text-align:center}.character-sheet summary{list-style:none;cursor:pointer;text-align:center;min-height:44px;display:grid;place-items:center}.character-sheet summary::-webkit-details-marker{display:none}.character-sheet h2{font-size:25px;margin:10px 0 4px;overflow-wrap:anywhere}.character-sheet .section-label{justify-content:center}.realm-badge{display:inline-block;border:1px solid #8d9a82;padding:3px 18px;color:#294746;font-size:15px;background:#e7ecdc}.character-hint{display:block;font-size:13px;color:#655b4d;margin-top:8px}.character-vitals{text-align:left}.character-portrait{height:132px;display:flex;justify-content:center;align-items:center;gap:18px;background:radial-gradient(ellipse,#b6c9bf88,transparent 68%);margin:18px 0}.character-portrait>span{display:grid;place-items:center;width:92px;height:92px;border:1px solid #96966c;border-radius:50%;outline:1px solid #acb2a0;outline-offset:6px;font-size:49px;color:#3c5d53}.character-portrait small{writing-mode:vertical-rl;letter-spacing:.3em}.character-sheet .stat{margin:18px 0}.character-sheet .stat label,.character-sheet .stat b{font-size:14px}.character-pair{display:grid;gap:5px;margin:18px 0;font-size:14px}.character-pair b{font-size:16px;color:#294746}.character-sheet h3{font-size:16px;line-height:1.7}.character-loadout{font-size:14px;margin:12px 0 0;line-height:1.7}.character-loadout>div{margin-top:12px}.character-loadout dt{color:#655b4d}.character-loadout dd{margin:2px 0;color:#294746;overflow-wrap:anywhere}.character-details>.small{text-align:center}.character-sheet :focus-visible{outline:3px solid #4d8782;outline-offset:5px}
@media(max-width:760px){.character-sheet{padding:20px;width:100%}.character-sheet h2{font-size:22px}.character-vitals{display:grid;grid-template-columns:1fr 1fr;gap:12px}.character-vitals>p{grid-column:1/-1}.character-sheet .stat label{flex-wrap:wrap;gap:4px}.character-portrait{height:115px}.character-pair{grid-template-columns:1fr 1fr}.character-details{padding-top:8px}}
</style>
