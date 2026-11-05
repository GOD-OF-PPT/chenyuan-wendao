<script setup lang="ts">
import {computed,inject,ref} from 'vue';
import type {Game} from '../../src/full/types.ts';
import {getLifeRecord,previewAction} from '../../src/full/queries.ts';
import {lifeReadings,readingPages} from './story-pages';
import {pageSlice} from './play-flow';
import CataloguePager from './CataloguePager.vue';
import LifeScroll from './LifeScroll.vue';
import type {useGame} from './store';
import {useReadingMemory} from './reading-memory';
const props=defineProps<{game:Game;enabled:boolean;busy:boolean;running:boolean;endReason:string;hasCheckpoint:boolean}>(),emit=defineEmits<{end:['RETIRE'|'END_LIFE'];export:[];restore:[];restart:[];receipt:[]}>();
const book=ref<{manage():void}>();
defineExpose({manage:()=>book.value?.manage()});
const mode=ref('life'),record=computed(()=>getLifeRecord(props.game));
const store=inject<ReturnType<typeof useGame>>('game-scene'),pendingError=computed(()=>store?.error?store.syncIssue?'请重新读取；已确认成果保留':store.canRetry?'存档待核对，请先重试或取消原安排':'':'');
const rows=computed(()=>readingPages(lifeReadings(props.game).filter(r=>r.group===mode.value)));
const {page,relocated}=useReadingMemory(()=>mode.value,()=>rows.value.map(r=>r.key+':'+r.part)),paged=computed(()=>pageSlice(rows.value,page.value,1));

</script>
<template>
 <section class="paper play-catalogue story-book life-book stage-story r4-life art05-story" data-testid="life-panel" tabindex="-1">
  <LifeScroll ref="book" :game="game" :mode="mode"><template #heading><h2 data-testid="life-title" tabindex="-1">{{game.status==='active'?record.overview.name+' · 修行纪事':record.overview.title}}</h2></template><template #management="{close}"><button data-testid="export-life" @click="emit('export')">导出生平</button><button v-if="game.status!=='active'&&store?.activity?.version===7&&store.activity.completedCycles>0&&store.activity.stopReason?.code!=='STATE_CHANGED'" data-testid="life-receipt" @click="close();emit('receipt')">重读收卷经过</button>  <div class="life-management-actions"><template v-if="game.status==='active'"><button data-testid="retire" @click="close();emit('end','RETIRE')" :disabled="!enabled||busy||running||!!pendingError||!previewAction(game,{type:'RETIRE'}).allowed">主动归隐</button><button v-if="record.overview.remainingMonths===1" data-testid="end-life" @click="close();emit('end','END_LIFE')" :disabled="!enabled||busy||running||!!pendingError||!previewAction(game,{type:'END_LIFE'}).allowed">度过最后1游戏月并收卷</button><small data-testid="milestone-running-reason">{{pendingError||(running?'当前活动进行中，请先暂停再安排收卷。':endReason||'查看不收卷；归隐、寿尽另行确认。')}}</small></template><template v-else><button data-testid="life-restore" @click="close();emit('restore')" :disabled="!enabled||busy||!!pendingError||!hasCheckpoint">恢复完整准备</button><button data-testid="life-restart" @click="close();emit('restart')" :disabled="!enabled||busy||!!pendingError">新的人生</button><small>{{pendingError||(hasCheckpoint?'恢复将一同回退物品、年月与人物记录。':'此档没有检查点，不能补造准备快照。')}}</small></template></div></template><template #chapters><nav class="catalogue-tabs r4-chapters" aria-label="生平篇章"><button v-for="[id,label] in [['life','来路'],['training','修行'],['decisions','因果'],['seal','收卷']]" :key="id" :data-testid="'life-mode-'+id" :aria-pressed="mode===id" @click="mode=id"><strong>{{label}}</strong></button></nav></template><template #pagination><CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="生平" @change="page=$event"/></template>
   <article v-for="row in paged.rows" :key="row.key+row.part" class="reading-text life-reading" :data-page-key="row.key"><small>{{row.title}}<span v-if="row.parts>1"> · {{row.part}} / {{row.parts}}</span></small><p :data-testid="row.testId">{{row.text}}</p></article>
  </LifeScroll><small v-if="relocated" role="status">记录已变化，已定位本篇可读页。</small>


 </section>
</template>
