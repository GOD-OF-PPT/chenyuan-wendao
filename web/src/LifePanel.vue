<script setup lang="ts">
import { computed } from 'vue';
import { getLifeRecord, previewAction } from '../../src/full/queries.ts';
import type { Game } from '../../src/full/types.ts';
const props = defineProps<{ game: Game; enabled: boolean; busy: boolean; hasCheckpoint: boolean }>();
const emit = defineEmits<{ end: ['RETIRE' | 'END_LIFE']; export: []; restore: []; restart: [] }>();
const record = computed(() => getLifeRecord(props.game));
const retirement = computed(() => previewAction(props.game, { type: 'RETIRE' }));
const lifespan = computed(() => previewAction(props.game, { type: 'END_LIFE' }));
</script>
<template>
  <section class="paper life-panel" aria-label="修仙生平" data-testid="life-panel">
    <div class="section-label">修仙生平 <span>{{game.status==='active'?'当前记录':'此生收卷'}}</span></div>
    <h2 data-testid="life-title">{{record.overview.title}}</h2>
    <p class="story" data-testid="life-conclusion">{{record.overview.conclusion}}</p>
    <p class="life-summary" data-testid="life-age">{{record.overview.name}} · {{record.overview.ageLabel}} · {{record.overview.realmName}} · 行道{{record.overview.elapsedMonths}}游戏月</p>
    <p v-if="record.overview.remainingMonths!==null" class="small">{{game.status==='active'?'当前':'封卷时'}}寿限{{record.overview.limitLabel}}，余寿{{record.overview.remainingMonths}}游戏月。</p>
    <p v-else class="small">{{record.overview.limitLabel}}。</p>
    <h3>开卷之念</h3><p data-testid="life-opening">{{record.opening.text}}</p>
    <h3>境界记录</h3><ol class="life-list" data-testid="life-realms"><li v-for="realm in record.realms" :key="realm.id">{{realm.text}}</li></ol>
    <h3>当前所学与配装</h3>
    <p>当前修法：{{record.training.school}}。{{record.training.manual}}</p>
    <p data-testid="life-skills">已掌握功法：{{record.training.learned.map(skill=>skill.name).join('、') || '尚无记录'}}。</p>
    <p data-testid="life-loadout">当前功法槽：{{record.training.loadout.map(slot=>slot.name).join(' / ')}}。</p>
    <p data-testid="life-relics">已拥有法宝：{{record.training.relics.map(relic=>relic.name).join('、') || '尚无记录'}}。当前装备：{{record.training.equippedRelic}}。</p>
    <h3>实际选择</h3>
    <ol v-if="record.decisions.length" class="life-list" data-testid="life-decisions"><li v-for="decision in record.decisions" :key="decision.id"><strong>{{decision.npc}} · {{decision.title}}</strong><p>{{decision.text}}</p></li></ol>
    <p v-else data-testid="life-no-decisions">存档尚无其他事件选择记录，不补写交情或来往。</p>
    <p data-testid="life-pledges">{{record.pledges.text}}</p><p data-testid="life-battles">{{record.battle.text}} {{record.battle.trial}}</p>
    <details><summary>记录范围与存档身份</summary><p class="small">{{record.scope}}</p><p class="small">本局 {{record.source.runId}} · 进度 {{record.source.revision}} · {{record.source.contentVersion}} / {{record.source.balanceVersion}}</p></details>
    <div class="life-actions">
      <button data-testid="export-life" @click="emit('export')">导出生平文本</button>
      <template v-if="game.status==='active'">
        <button data-testid="retire" @click="emit('end','RETIRE')" :disabled="!enabled || busy || !retirement.allowed">主动归隐</button>
        <button v-if="record.overview.remainingMonths===1" data-testid="end-life" @click="emit('end','END_LIFE')" :disabled="!enabled || busy || !lifespan.allowed">度过最后1游戏月并收卷</button>
        <small v-if="!retirement.allowed">{{retirement.failure?.message}}；查看生平不消耗时间。</small>
      </template>
      <template v-else><button data-testid="life-restore" @click="emit('restore')" :disabled="!enabled || busy || !hasCheckpoint">恢复完整准备检查点</button><button data-testid="life-restart" @click="emit('restart')" :disabled="!enabled || busy">新的人生</button></template>
    </div>
    <p v-if="game.status!=='active'" class="small" data-testid="life-recovery-note">{{hasCheckpoint?'恢复会回退完整准备状态，包括物品、年月与人物记录；不保留此后所得。':'此档没有检查点，不能补造准备快照。可先导出存档和生平，再决定是否开始新的人生。'}}</p>
    <p class="small">生平文本不含完整进度；需要恢复时，请另行导出存档。</p>
  </section>
</template>
<style scoped>
.life-panel{margin-top:20px;padding:24px}.life-panel p{overflow-wrap:anywhere;line-height:1.85;margin:8px 0}.life-panel h3{margin-top:20px;margin-bottom:8px}.life-panel h2{margin-bottom:10px}.life-list{padding-left:22px;line-height:1.8}.life-list li{margin:8px 0}.life-list p{margin:4px 0 12px}.life-actions{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0}.life-actions small{flex-basis:100%}.life-panel summary{cursor:pointer;padding:8px 0}.life-summary{font-weight:600}
@media(max-width:720px){.life-panel{padding:18px}.life-panel h2{font-size:22px}}
</style>
