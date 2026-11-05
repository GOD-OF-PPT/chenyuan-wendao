<script setup lang="ts">
import { computed, ref } from 'vue';
import * as C from '../../src/full/content.ts';
import { getLifeOverview } from '../../src/full/queries.ts';
import type { Game } from '../../src/full/types.ts';
import PortraitImage from './PortraitImage.vue';
import ProgressTrack from './ProgressTrack.vue';
import GameIcon from './GameIcon.vue';
const props = defineProps<{game:Game;compact?:boolean;detailsOnly?:boolean}>();
const emit=defineEmits<{inspect:[event:MouseEvent]}>();
const player = computed(() => props.game.core.player), realm = computed(() => C.realms[player.value.realm]);
const life = computed(() => getLifeOverview(props.game));
const sealed = computed(() => props.game.status==='ascended');
const school = computed(() => props.game.school==='sword'?'剑修':props.game.school==='talisman'?'符修':'尚未择法');
const expanded = ref(false);
</script>
<template>
  <aside class="paper character-sheet" :class="{'character-folio':detailsOnly}" :data-layout="detailsOnly?'folio':undefined" data-testid="character-panel" aria-label="道者个人志">
    <div v-if="!detailsOnly" class="character-portrait" aria-hidden="true"><PortraitImage id="player" fallback="道"/></div>
    <div v-if="!detailsOnly" class="character-heading"><span class="section-label">道者 · 个人志</span><h2>{{player.name}}</h2><span class="realm-badge" data-testid="realm">{{realm.name}}</span></div>
    <div v-if="!detailsOnly" class="character-vitals" :data-testid="sealed?'ascension-sealed-stats':undefined">
      <p v-if="sealed" class="small">此生已封卷。本卷不继续上界修行，保留封卷时的实际状态。</p>
      <div class="stat"><label>{{sealed?'封卷气血':'气血'}} <b data-testid="hp">{{player.hp}}<template v-if="!sealed"> / {{realm.maxHp}}</template></b></label><ProgressTrack v-if="!sealed" :value="player.hp" :max="realm.maxHp" label="气血" tone="health" :identity="game.core.runId+player.realm" hint="气血会随真实行动变化；战中丹药占回合，战后可到洞府核对疗养。"/></div>
      <div class="stat"><label>{{sealed?'封卷灵力':'灵力'}} <b>{{player.mp}}<template v-if="!sealed"> / {{realm.maxMp}}</template></b></label><ProgressTrack v-if="!sealed" :value="player.mp" :max="realm.maxMp" label="灵力" tone="spirit" :identity="game.core.runId+player.realm" hint="术法消耗灵力，基础攻击和护体可回灵；按行动旁的实际成本选择。"/></div>
      <div v-if="!sealed" class="stat"><label>修为 <b data-testid="xp">{{player.xp}} / {{realm.xpCap}}</b></label><ProgressTrack :value="player.xp" :max="realm.xpCap||1" label="修为" :identity="game.core.runId+player.realm" hint="修为满后仍需核对突破条件和物品，再由你确认行动。"/></div>
      <div class="character-pair character-currency"><span>{{sealed?'封卷灵石':'灵石'}}</span><b data-testid="stones">{{player.stones}}</b></div>
    </div>
    <button v-if="compact" class="text-button character-hint" @click="emit('inspect',$event)">寿元与配装 →</button>
    <component :is="detailsOnly?'section':'details'" v-else :open="detailsOnly||expanded" @toggle="expanded=($event.target as HTMLDetailsElement).open">
      <summary v-if="!detailsOnly" class="character-hint" data-testid="character-toggle">{{detailsOnly?'寿元与配装':expanded?'收起详情':'查看寿元与配装'}}</summary>
      <div class="character-details" data-testid="character-details">
        <figure v-if="detailsOnly" class="folio-person" data-testid="character-folio-person"><PortraitImage id="player" fallback="道" aria-hidden="true"/><h2 data-testid="character-folio-name">{{player.name}}</h2><span class="realm-badge" data-testid="character-folio-realm">{{realm.name}}</span></figure>
        <div class="character-pair"><span>{{sealed?'封卷年龄':'年龄 / 寿限'}}</span><b data-testid="age-limit">{{life.ageLabel}}<template v-if="!sealed"> / {{life.limitLabel}}</template></b><small v-if="detailsOnly" data-testid="character-life-context">{{game.status==='active'&&life.remainingMonths!==null?'余寿 '+life.remainingMonths+' 游戏月':'此生已收卷'}}</small></div>
        <h3>当前修法 · {{school}}</h3>
        <dl class="character-loadout"><div :data-testid="detailsOnly?'character-slot-mind':undefined" :data-empty="!game.loadout.mind"><dt><GameIcon v-if="detailsOnly&&game.loadout.mind" kind="skill" :id="game.loadout.mind!"/>心法</dt><dd>{{game.loadout.mind?C.skills[game.loadout.mind].name:'引气入体后选择'}}</dd></div><div :data-testid="detailsOnly?'character-slot-builder':undefined" :data-empty="!game.loadout.builder"><dt><GameIcon v-if="detailsOnly&&game.loadout.builder" kind="skill" :id="game.loadout.builder!"/>起手</dt><dd>{{game.loadout.builder?C.skills[game.loadout.builder].name:'尚未装备'}}</dd></div><div :data-testid="detailsOnly?'character-slot-finisher':undefined" :data-empty="!game.loadout.finisher"><dt><GameIcon v-if="detailsOnly&&game.loadout.finisher" kind="skill" :id="game.loadout.finisher!"/>终结</dt><dd>{{game.loadout.finisher?C.skills[game.loadout.finisher].name:'尚未装备'}}</dd></div><div :data-testid="detailsOnly?'character-slot-relic':undefined" :data-empty="!game.loadout.relic"><dt><GameIcon v-if="detailsOnly&&game.loadout.relic" kind="relic" :id="game.loadout.relic!"/>本命法宝</dt><dd>{{game.loadout.relic?C.relics[game.loadout.relic].name:'金丹后可炼制装备'}}</dd></div></dl>
      </div>
    </component>
  </aside>
</template>
<style scoped>
.character-sheet{grid-area:character;padding:22px 20px;display:flex;flex-direction:column}.character-sheet details{display:block}.character-heading{text-align:center}.character-sheet summary{list-style:none;cursor:pointer;text-align:center;min-height:44px;display:grid;place-items:center}.character-sheet summary::-webkit-details-marker{display:none}.character-sheet h2{font-size:calc(1.3888889rem * var(--font-scale,1));margin:10px 0 4px;overflow-wrap:anywhere}.character-sheet .section-label{justify-content:center}.realm-badge{display:inline-block;border:1px solid #8d9a82;padding:3px 18px;color:#294746;font-size:calc(0.83333333rem * var(--font-scale,1));background:#e7ecdc}.character-hint{display:block;font-size:calc(0.72222222rem * var(--font-scale,1));color:#655b4d;margin-top:8px}.character-vitals{text-align:left}.character-portrait{height:210px;display:flex;justify-content:center;align-items:center;gap:18px;background:radial-gradient(ellipse,#b6c9bf88,transparent 68%);margin:18px 0}.character-portrait>span{display:grid;place-items:center;width:92px;height:92px;border:1px solid #96966c;border-radius:50%;outline:1px solid #acb2a0;outline-offset:6px;font-size:calc(2.7222222rem * var(--font-scale,1));color:#3c5d53}.character-portrait small{writing-mode:vertical-rl;letter-spacing:.3em}.character-sheet .stat{margin:18px 0}.character-sheet .stat label,.character-sheet .stat b{font-size:calc(0.77777778rem * var(--font-scale,1))}.character-pair{display:grid;gap:5px;margin:18px 0;font-size:calc(0.77777778rem * var(--font-scale,1))}.character-pair b{font-size:calc(0.88888889rem * var(--font-scale,1));color:#294746}.character-sheet h3{font-size:calc(0.88888889rem * var(--font-scale,1));line-height:1.7}.character-loadout{font-size:calc(0.77777778rem * var(--font-scale,1));margin:12px 0 0;line-height:1.7}.character-loadout>div{margin-top:12px}.character-loadout dt{color:#655b4d}.character-loadout dd{margin:2px 0;color:#294746;overflow-wrap:anywhere}.character-details>.small{text-align:center}.character-sheet :focus-visible{outline:3px solid #4d8782;outline-offset:5px}
@media(max-width:760px){.character-sheet{padding:20px;width:100%}.character-sheet h2{font-size:calc(1.2222222rem * var(--font-scale,1))}.character-vitals{display:grid;grid-template-columns:1fr 1fr;gap:12px}.character-vitals>p{grid-column:1/-1}.character-sheet .stat label{flex-wrap:wrap;gap:4px}.character-portrait{height:200px}.character-pair{grid-template-columns:1fr 1fr}.character-details{padding-top:8px}}

/* The current single-screen personal folio is a readonly game object; original modes retain their styles. */
.single-screen .character-folio{background:transparent!important;border:0!important;box-shadow:none!important;padding:8px 12px!important}
.character-folio>section{height:100%;min-height:0}
.character-folio .character-details{height:100%;min-height:0;display:grid;grid-template-columns:230px minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr);gap:12px 32px;border:0!important;align-content:center;align-items:start}
.character-folio .folio-person{grid-column:1;grid-row:1/4;display:grid;grid-template-rows:minmax(130px,240px) auto auto;align-content:center;justify-items:center;gap:10px;height:100%;min-width:0;margin:0;padding:0 24px 0 0;border-right:1px solid #91ad8a55;text-align:center}
.character-folio .folio-person>.portrait-image{width:100%;height:100%;min-height:0;background:radial-gradient(ellipse,#829f8666,transparent 70%)}
.single-screen .character-sheet.character-folio::before,.single-screen .character-sheet.character-folio::after{content:none!important;display:none!important}
.character-folio .folio-person>.portrait-image{mask-image:linear-gradient(#000 85%,transparent)}
.character-folio .folio-person :deep(.portrait-fallback){background:transparent;color:#dae2c9;border-color:#849d8166}
.character-folio .folio-person h2{font-size:24px!important;line-height:1.4;margin:0;max-width:100%;overflow-wrap:anywhere}
.character-folio .folio-person>.realm-badge{font-size:14px;line-height:1.6}
.character-folio .character-pair{grid-column:2;grid-row:1;display:grid;grid-template-columns:1fr;gap:6px;margin:0!important;padding:8px 0 16px;border-bottom:1px solid #91ad8a55}
.character-folio .character-pair>span,.character-folio .character-pair>small{font-size:14px;line-height:1.5;color:#c6d7c3}
.character-folio .character-pair>b{font-size:22px!important;line-height:1.5;font-weight:400}
.character-folio .character-details>h3{grid-column:2;grid-row:2;margin:0;font-size:18px;line-height:1.6;font-weight:400;color:#d5e4cc}
.character-folio .character-loadout{grid-column:2;grid-row:3;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;gap:20px 24px;margin:0;padding-top:8px}
.character-folio .character-loadout>div{min-width:0;margin:0;padding:12px 0 16px;border-bottom:1px solid #91ad8a44}
.character-folio .character-loadout dt{display:flex;align-items:center;gap:8px;font-size:14px;line-height:1.7;color:#c6d7c3}
.character-folio .character-loadout dd{font-size:18px!important;line-height:1.7;margin:10px 0 0}
.character-folio .character-loadout>div[data-empty=true] dd{color:#bdcdbb!important}
</style>
