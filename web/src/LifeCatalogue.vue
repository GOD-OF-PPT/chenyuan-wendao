<script setup lang="ts">
import {computed,ref} from 'vue';
import type {Game} from '../../src/full/types.ts';
import {getLifeRecord,previewAction} from '../../src/full/queries.ts';
import {lifeReadings,readingPages} from './story-pages';
import {pageSlice} from './play-flow';
import CataloguePager from './CataloguePager.vue';
import AssetImage from './AssetImage.vue';
import {sceneAssetPath} from './assets';
import {scenePresentation} from './scene-presentation';
import {useReadingMemory} from './reading-memory';
const props=defineProps<{game:Game;enabled:boolean;busy:boolean;running:boolean;endReason:string;hasCheckpoint:boolean}>(),emit=defineEmits<{end:['RETIRE'|'END_LIFE'];export:[];restore:[];restart:[]}>();
const mode=ref('life'),record=computed(()=>getLifeRecord(props.game));
const scene=computed(()=>scenePresentation(props.game));
const rows=computed(()=>readingPages(lifeReadings(props.game).filter(r=>r.group===mode.value)));
const {page,relocated}=useReadingMemory(()=>mode.value,()=>rows.value.map(r=>r.key+':'+r.part)),paged=computed(()=>pageSlice(rows.value,page.value,1));

</script>
<template>
 <section class="paper play-catalogue story-book life-book stage-story r4-life" data-testid="life-panel" tabindex="-1"><header><div><small>此生手记 · 查看不收卷</small><h2 data-testid="life-title" tabindex="-1">{{record.overview.title}}</h2></div><button data-testid="export-life" @click="emit('export')">导出生平</button></header>
  <div class="life-stage-body"><nav class="catalogue-tabs r4-chapters" aria-label="生平篇章"><button v-for="[id,label,note] in [['life','来路','岁月与境界'],['training','修行','所学与器物'],['decisions','因果','已记来往'],['seal','收卷','库存与恢复']]" :key="id" :data-testid="'life-mode-'+id" :aria-pressed="mode===id" @click="mode=id"><strong>{{label}}</strong><small>{{note}}</small></button></nav>
  <div class="book-canvas book-landscape" :data-gate="scene.gate"><AssetImage class="book-scenery" :path="sceneAssetPath(scene)" :asset-id="'reading-scene-'+scene.artKey"/><article v-for="row in paged.rows" :key="row.key+row.part" class="reading-text life-reading" :data-page-key="row.key"><small>{{row.title}}<span v-if="row.parts>1"> · {{row.part}} / {{row.parts}}</span></small><p :data-testid="row.testId">{{row.text}}</p></article></div>
  </div><small v-if="relocated" role="status">记录已变化，已定位本篇可读页。</small><CataloguePager :page="paged.page" :pages="paged.pages" :total="paged.total" label="生平" @change="page=$event"/>
  <footer v-if="mode==='seal'" class="life-actions story-footer"><template v-if="game.status==='active'"><button data-testid="retire" @click="emit('end','RETIRE')" :disabled="!enabled||busy||running||!previewAction(game,{type:'RETIRE'}).allowed">主动归隐</button><button v-if="record.overview.remainingMonths===1" data-testid="end-life" @click="emit('end','END_LIFE')" :disabled="!enabled||busy||running||!previewAction(game,{type:'END_LIFE'}).allowed">度过最后1游戏月并收卷</button><small data-testid="milestone-running-reason">{{running?'当前活动进行中，请先暂停再安排收卷。':endReason||'查看不收卷；归隐、寿尽另行确认。'}}</small></template><template v-else><button data-testid="life-restore" @click="emit('restore')" :disabled="!enabled||busy||!hasCheckpoint">恢复完整准备</button><button data-testid="life-restart" @click="emit('restart')" :disabled="!enabled||busy">新的人生</button><small>{{hasCheckpoint?'恢复将一同回退物品、年月与人物记录。':'此档没有检查点，不能补造准备快照。'}}</small></template></footer>

 </section>
</template>
